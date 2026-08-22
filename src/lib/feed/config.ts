import type { FeedSource } from "./types";

// Keyword set driving the broad sources (네이버뉴스). DC is already
// group-specific. Korean + romanized terms maximize search breadth.
// "키키" 단독 검색은 의성어라 노이즈가 심하므로 항상 그룹/멤버 조합으로 묶는다.
export const KEYWORDS = [
  "KiiiKiii",
  "걸그룹 키키",
  "키키 지유",
  "키키 이솔",
  "키키 수이",
  "키키 하음",
  "키키 키야",
];

// Sources wired AND enabled. 스레드/더쿠/인스티즈 are deferred.
export const ENABLED_SOURCES: FeedSource[] = ["naver", "daum", "dc", "instagram", "pann"];

// Global cap is a payload backstop; the real fairness knob is the per-source
// cap below (news volume must not push old Instagram posts out of the feed).
export const FEED_LIMIT = 400;
export const FEED_PER_SOURCE_LIMIT = 100;
export const NAVER_PER_KEYWORD = 30;
// Nate Pann results per keyword (comment-sorted). Kept low — robots.txt is
// Disallow:/, so we read as little as gives a useful signal.
export const PANN_PER_KEYWORD = 15;
// Daum web search (Kakao Search API) results per keyword.
export const DAUM_PER_KEYWORD = 25;
// Per-account cap — 6 accounts, so keep each slice small and polite.
export const IG_MEDIA_LIMIT = 12;
// KiiiKiii official + member accounts, read via the logged-out
// web_profile_info API. Instagram rate-limits bursts, so each feed refresh
// fetches ONE account (round-robin) and accumulates results in KV — see
// sources/instagram.ts. 존재하지 않는 계정은 조용히 건너뛴다.
export const IG_USERNAMES = [
  "kiiikiii.official", // 공식
  "kiiikiii__jiyu", // 지유
  "kiiikiii__leesol", // 이솔
  "kiiikiii__sui", // 수이
  "kiiikiii__haum", // 하음
  "kiiikiii__kya", // 키야
];
// KV key prefix for the Instagram rotation state (reuses SHORTS_CACHE).
// `<prefix>:cursor` + one `<prefix>:u:<username>` key per account — per-key
// storage survives KV eventual consistency; a single blob does not.
export const IG_STATE_KV_KEY = "feed:ig:v2";

// 키키 마이너 갤러리 (verified: gall.dcinside.com/mgallery/board/lists/?id=kiiikiii).
// "mgallery" = minor gallery (board path /mgallery/board/...),
// "board" = regular gallery (/board/...).
export const DC_GALLERY_ID = "kiiikiii";
export const DC_GALLERY_TYPE: "mgallery" | "board" = "mgallery";
export const DC_LIST_COUNT = 50;

// KV cache (reuse SHORTS_CACHE namespace with this prefix).
export const FEED_KV_KEY = "feed:v1";
export const FEED_FRESH_MS = 5 * 60 * 1000;
export const FEED_KV_TTL_SECONDS = 24 * 60 * 60;
export const FEED_REVALIDATE_LOCK_TTL_SECONDS = 90;
// `s-maxage` value (seconds) for the /api/feed Cache-Control header.
export const FEED_EDGE_MAXAGE_SECONDS = 60;

// Display labels (Korean) for every source — UI shows labels for ENABLED_SOURCES.
export const SOURCE_LABELS: Record<FeedSource, string> = {
  naver: "네이버뉴스",
  daum: "다음",
  dc: "DC",
  instagram: "인스타",
  pann: "네이트판",
  threads: "스레드",
  theqoo: "더쿠",
  instiz: "인스티즈",
};
