// 인스타 피드 수집기 (browser fallback).
//
// 앱의 정규 경로는 로그아웃 공개 API(/api/v1/users/web_profile_info)지만,
// 2026-08-22 부터 인스타가 모든 IP·브라우저에 대해 400
// ("Asset asset://laser.provider/... has been deleted") 을 돌려준다.
// 프로필 페이지 자체는 /api/graphql 로 정상 렌더되므로, 여기서는
// 헤드리스 크롬으로 그리드를 열어 permalink 만 얻고, 캡션·날짜·썸네일은
// 게시물 URL 의 og: 메타(서버 렌더됨)에서 평범한 fetch 로 받는다.
//
// 결과는 앱이 이미 읽고 있는 KV 심 키(`feed:ig:v2:u:<username>`)에 그대로
// 써 넣는다. 앱 코드는 한 줄도 바뀌지 않는다 — fetchItems() 는 수집 실패 시
// 기존 KV 를 보존하므로(items.length > 0 가드), API 가 살아나면 자연히
// 정규 경로가 다시 이 키들을 덮어쓴다.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const CHROME =
  "/home/ubuntu/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome";
const PLAYWRIGHT = "/home/ubuntu/cgv/node_modules/playwright-core/index.js";

const KV_DIR = process.env.KV_SHIM_DIR ?? "/home/ubuntu/cfbots/_kv/KIKI_SHORTS_CACHE";
const KV_PREFIX = "feed:ig:v2";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PER_ACCOUNT = 12;

// 키키는 공식 계정 하나뿐이다. 멤버 개인 인스타는 존재하지 않고
// kiiikiii__leesol 같은 건 팬페이지(og:title 에 FANPAGE 명시)라 넣지 않는다.
// 앱 쪽 src/lib/feed/config.ts 의 IG_USERNAMES 와 항상 같이 맞출 것.
const ACCOUNTS = ["kiiikiii.official"];

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// 게시물 상세는 반드시 크롤러 UA 로 받아야 한다. 일반 브라우저 UA 로는
// 인스타가 og: 메타 없는 JS 셸만 내려보내고, 크롤러로 붙어야 캡션·날짜·
// 이미지가 들어간 서버 렌더 HTML 이 온다.
const CRAWLER_UA = "facebookexternalhit/1.1";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString(), ...a);

// ── KV 심 (instrumentation.ts 의 FileKV 와 같은 파일 규약) ──────────────
const kvPath = (key) => join(KV_DIR, encodeURIComponent(key));

async function kvGet(key) {
  try {
    const exp = await readFile(kvPath(key) + ".__kvexp__", "utf8").catch(() => null);
    if (exp && Date.now() > Number(exp)) return null;
    return await readFile(kvPath(key), "utf8");
  } catch {
    return null;
  }
}

async function kvPut(key, value, ttlMs) {
  await mkdir(KV_DIR, { recursive: true });
  await writeFile(kvPath(key), value);
  await writeFile(kvPath(key) + ".__kvexp__", String(Date.now() + ttlMs));
}

// ── 게시물 상세: og: 메타에서 캡션·날짜·이미지 ───────────────────────────
const META_RE = (prop) =>
  new RegExp(`<meta[^>]+property="${prop}"[^>]+content="([^"]*)"`, "i");

// 인스타 og: 메타는 한글·이모지를 전부 수치 엔티티로 내보낸다
// (&#xd0a4; = 키, &#x1f984; = 🦄). 명명 엔티티만 풀면 제목이 깨져 보인다.
function unescapeHtml(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function meta(html, prop) {
  const m = html.match(META_RE(prop));
  return m ? unescapeHtml(m[1]) : "";
}

// og:description 예: `323K likes, 415 comments - kiiikiii.official on August 18, 2026: "캡션"`
function parseDescription(desc) {
  const dateM = desc.match(/on ([A-Z][a-z]+ \d{1,2}, \d{4})/);
  const capM = desc.match(/:\s*"([\s\S]*)"\s*\.?\s*$/);
  return {
    publishedAt: dateM ? Date.parse(dateM[1] + " 12:00:00 GMT+0900") || 0 : 0,
    caption: capM ? capM[1].trim() : "",
  };
}

const truncate = (s, n) => (s.length <= n ? s : s.slice(0, n - 1) + "…");

async function fetchPost(url, shortcode, username) {
  const res = await fetch(url, { headers: { "User-Agent": CRAWLER_UA } });
  if (!res.ok) return null;
  const html = await res.text();
  const { publishedAt, caption } = parseDescription(meta(html, "og:description"));
  const flat = caption.replace(/\s+/g, " ").trim();
  const firstLine = caption.split("\n")[0]?.trim() ?? "";
  return {
    id: `instagram:${shortcode}`,
    source: "instagram",
    author: username,
    title: truncate(firstLine || "(사진)", 120),
    snippet: truncate(flat, 200),
    url,
    thumbnail: meta(html, "og:image") || undefined,
    publishedAt,
  };
}

// ── 프로필 그리드: 헤드리스 크롬으로 permalink 만 ────────────────────────
async function gridLinks(page, username) {
  await page.goto(`https://www.instagram.com/${username}/`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  // 그리드는 /api/graphql 응답 후에 그려진다.
  await page
    .waitForSelector('a[href*="/p/"], a[href*="/reel/"]', { timeout: 20000 })
    .catch(() => {});
  return page.evaluate((user) => {
    const seen = new Set();
    const out = [];
    for (const a of document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')) {
      const m = a.getAttribute("href")?.match(/^\/([^/]+)\/(p|reel)\/([^/]+)\//);
      // 그리드에는 추천/태그된 남의 계정 글도 섞여 들어온다 — 본인 것만 남긴다.
      if (!m || m[1] !== user || seen.has(m[3])) continue;
      seen.add(m[3]);
      out.push({ shortcode: m[3], url: `https://www.instagram.com${a.getAttribute("href")}` });
    }
    return out;
  }, username);
}

async function collect(page, username) {
  const key = `${KV_PREFIX}:u:${username}`;
  const raw = await kvGet(key);
  const existing = raw ? JSON.parse(raw) : [];
  const known = new Map(existing.map((i) => [i.id, i]));

  const links = (await gridLinks(page, username)).slice(0, PER_ACCOUNT);
  if (links.length === 0) {
    log(`  ${username}: 그리드 비어 있음 — 기존 ${existing.length}건 유지`);
    return 0;
  }

  let added = 0;
  for (const { shortcode, url } of links) {
    if (known.has(`instagram:${shortcode}`)) continue;
    try {
      const item = await fetchPost(url, shortcode, username);
      if (item) {
        known.set(item.id, item);
        added++;
      }
    } catch (e) {
      log(`  ${username}/${shortcode} 실패: ${e.message}`);
    }
    await sleep(1500); // 게시물 사이 간격 — 버스트로 안 보이게
  }

  const merged = [...known.values()]
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, PER_ACCOUNT);
  await kvPut(key, JSON.stringify(merged), TTL_MS);
  log(`  ${username}: 신규 ${added}건, 저장 ${merged.length}건`);
  return merged.length;
}

// ── main ────────────────────────────────────────────────────────────────
const only = process.argv[2]; // 계정 하나만 돌리고 싶을 때
const targets = only ? ACCOUNTS.filter((a) => a === only) : ACCOUNTS;

// playwright-core 는 CJS — 동적 import 하면 실 export 가 default 아래로 들어간다.
const pw = await import(PLAYWRIGHT);
const chromium = pw.chromium ?? pw.default?.chromium;
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({
  userAgent: UA,
  locale: "ko-KR",
  viewport: { width: 1280, height: 900 },
});
const page = await ctx.newPage();

let total = 0;
for (const username of targets) {
  try {
    total += await collect(page, username);
  } catch (e) {
    log(`  ${username} 실패: ${e.message}`);
  }
  await sleep(5000); // 계정 사이 간격
}
await browser.close();
log(`완료 — 총 ${total}건 저장`);
