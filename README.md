# KiiiKiii LIVE

Replay a YouTube channel's video comments as a scrolling **live‑chat** stream —
like a Twitch/YouTube live chat, but built from the comments people already left.

Defaults to the channel [`@KiiiKiii_starship`](https://www.youtube.com/@KiiiKiii_starship),
and you can load any other channel from the header.

## How it works

- `GET /api/channel?handle=@name` → resolves the channel and lists recent uploads.
- `GET /api/comments?videoId=…` → returns top‑level comments (paginated).
- The UI buffers comments and reveals them one at a time on a timer, fetching
  more pages as the buffer drains, so it feels like a live chat rolling by.

Controls: **play/pause**, **speed** (slow / normal / fast), comment **order**
(top vs newest), **loop** (replay forever), and a **theater** mode that hides
the video list for a clean overlay.

`/about` 는 서비스 소개 랜딩 페이지 — 앱 헤더의 "소개" 링크로 이어진다.

### Views

The header switches between eight modes; five are channel-wide rather than
per-video (`hall`, `search`, `feed`, `analysis`, `risk`):

- **라이브 / 동기화 / 목록** — comment replay (free-running, timestamp-synced to
  the player, or a plain list).
- **전당 / 검색** — top comments across the channel, and full-text search.
- **피드** — 유튜브·뉴스(네이버)·다음·DC·네이트판·인스타 items in one stream.
  인스타는 공식 계정(`kiiikiii.official`) 하나뿐이다 — 키키는 멤버 개인
  계정을 운영하지 않고, `kiiikiii__leesol` 류는 전부 팬페이지다.
- **분석** — sentiment / keyword breakdown of the loaded comments.
- **리스크** — OSINT-style threat monitor over the D1 snapshot series: per-member
  threat level, mention/negativity trends, the alert feed, a source matrix, and
  the interactive Chatter Cloud (scope / timeline / 빈도·급상승 / per-word drilldown).
  Snapshots are collected every 2h; alerts only fire on deviation from each
  channel's own baseline.

## Setup

1. Get a **YouTube Data API v3** key from the
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   (enable "YouTube Data API v3" for your project).
2. Add it to `.env.local`:

   ```
   YOUTUBE_API_KEY=your_key_here
   ```

3. Install and run:

   ```bash
   pnpm install
   pnpm dev
   ```

4. Open http://localhost:3000.

## Deploy (ebs home server · Next standalone)

Live: **https://kiki.unflix.tv** — the `kiki` cloudflared tunnel
(`cloudflared-kiki.service`, config `~/.cloudflared/kiki.yml`) fronts
`ebs:127.0.0.1:8492`, where systemd's `app-kiki.service` runs
`/home/ubuntu/apps/kiki/server.js` (`output: "standalone"`).

Port 8492 is deliberate: 8490/8491 are taken by the sibling apps on the same
host. The DNS side is one CNAME to the tunnel — `cloudflared tunnel route dns
kiki kiki.unflix.tv` — nothing else points at this hostname.

Nothing in `src/` knows it left Workers: `src/instrumentation.ts` injects a
file-backed KV, a `node:sqlite` D1, and a fire-and-forget `waitUntil` into the
`__cloudflare-context__` global, so `appCache()` / `riskDb()` / `bg()` keep
working unchanged.

There is no auto-deploy. Build locally, rsync, restart:

```bash
pnpm build
rm -rf .next/standalone/.next/static && cp -R .next/static .next/standalone/.next/static
ssh ebs 'tar czf /tmp/kiki-backup-$(date +%F-%H%M%S).tar.gz -C ~/apps kiki'
rsync -a --delete --exclude .env.runtime .next/standalone/ ebs:/home/ubuntu/apps/kiki/
ssh ebs 'sudo systemctl restart app-kiki && systemctl is-active app-kiki'
curl -sI https://kiki.unflix.tv | head -1
```

`--exclude .env.runtime` is load-bearing: that file (server-side only) holds
`PORT`/`HOSTNAME`, the KV/D1 shim paths, and the API keys — see `.env.example`.
Rollback = untar the backup over `~/apps/kiki` and restart.

### 인스타 수집 (2026-08-22~ 우회 경로)

인스타의 로그아웃 공개 API(`/api/v1/users/web_profile_info`)가 모든 IP·
브라우저에 대해 400 `Asset asset://laser.provider/… has been deleted` 를
돌려준다. 프로필 페이지 자체는 `/api/graphql` 로 정상 렌더되므로,
`workers/ig-scrape/ig-scrape.mjs` 가 헤드리스 크롬으로 그리드를 열어
permalink 만 얻고 캡션·날짜·썸네일은 게시물 URL 의 `og:` 메타에서 받는다.

```bash
ssh ebs 'node ~/cfbots/kiki-ig-scrape/ig-scrape.mjs'   # 3시간마다 crontab
```

두 가지가 함정이다:

- 게시물 상세는 **크롤러 UA**(`facebookexternalhit/1.1`)로 받아야 한다.
  일반 브라우저 UA 로는 `og:` 없는 JS 셸만 온다.
- 인스타는 **없는 계정 URL 에도 200** 을 준다. 계정 실재 여부는 상태코드가
  아니라 `og:description`(팔로워/게시물 수) 유무로 판단할 것.

수집 결과는 앱이 이미 읽는 KV 키(`feed:ig:v2:u:<username>`)에 그대로 쓴다.
앱 코드는 손대지 않았고, `fetchItems()` 가 수집 실패 시 기존 KV 를 보존하므로
공개 API 가 살아나면 정규 경로가 자연히 이 키를 다시 덮어쓴다.

The risk collector runs on the same host: `worker-host.mjs` drives
`workers/cron`'s worker from crontab (collect every 2h, discover 2×/day) against
`APP_BASE=http://127.0.0.1:8492`, bypassing the tunnel. It lives in
`~/cfbots/kiki-risk-cron/` (`worker.js` = a type-stripped copy of
`workers/cron/index.ts`, plus `host.json` and an `.env` holding `APP_BASE` /
`OPS_KEY`). Crontab minutes are offset from the sibling app's so the two never
hit the YouTube quota in the same minute.

The D1 shim is a plain SQLite file, so the schema is applied by hand once:

```bash
scp migrations/0001_risk.sql ebs:/tmp/
ssh ebs 'sqlite3 ~/cfbots/_data/kiki-risk.sqlite < /tmp/0001_risk.sql'
```

Without it every `/api/risk/*` call fails and the 리스크 tab shows
"리스크 데이터를 불러오지 못했어요".

### Cloudflare Workers (legacy path)

The [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) setup
(`open-next.config.ts`, `wrangler.jsonc`) is still in the repo and its
bindings now point at real kiki-owned resources (`kiki-risk`,
`kiki-SHORTS_CACHE`, `kiki-NEXT_INC_CACHE_KV`), but nothing is deployed there —
the custom domain is served by the tunnel above. To bring the Workers path back:

```bash
# the namespaces already exist; recreate only if you start from scratch
#   pnpm exec wrangler kv namespace create kiki-SHORTS_CACHE
#   pnpm exec wrangler kv namespace create kiki-NEXT_INC_CACHE_KV

# set the API key as a Worker secret (not committed)
printf 'YOUR_KEY' | pnpm exec wrangler secret put YOUTUBE_API_KEY

# build + deploy
pnpm run deploy       # opennextjs-cloudflare build && deploy
pnpm preview          # build + run locally on workerd
```

Bindings the Workers path expects (mirrored by the shims above):
- `SHORTS_CACHE` — caches each channel's video/Shorts classification (1-day TTL),
  so steady-state requests make far fewer subrequests.
- `NEXT_INC_CACHE_KV` — OpenNext incremental cache, fronted by a regional
  edge cache (Cache API).
- `RISK_DB` — D1 time series for the risk dashboard (`migrations/0001_risk.sql`).

### GitHub Actions

Only Claude automation lives in CI: `claude.yml` (label an issue `claude` → it
opens an implementation PR) and `claude-notify-merge.yml` (Telegram ping on
merge). Merges and deploys are manual.

## Notes

- The YouTube Data API has a daily quota; each comment page costs ~1 unit.
- Videos with comments disabled will surface a clean error in the stream area.
- This shows **existing** comments as a simulated live feed — it does not read a
  real live broadcast's live chat.
