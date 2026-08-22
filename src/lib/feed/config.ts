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

// 키워드 검색 소스(네이트판)가 물어오는 글이 실제로 키키 얘기인지 판별하는
// 토큰. "키키"는 의성어(웃음소리)라 검색 엔진이 무관한 글을 끌고 오는데,
// 제목/미리보기에 아래 중 하나도 없으면 그 글이다.
// DC 는 키키 전용 갤러리라 이름이 안 나와도 전부 키키 얘기이므로 적용하지 않는다.
export const RELEVANCE_TOKENS = [
  "키키",
  "kiiikiii",
  "지유",
  "이솔",
  "수이",
  "하음",
  "키야",
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
// Per-account cap — 계정이 하나뿐이라 넉넉히 두어도 부담이 없다.
export const IG_MEDIA_LIMIT = 12;
// 키키 공식 인스타 하나뿐이다. 멤버 개인 계정은 존재하지 않고,
// kiiikiii__leesol / kiiikiii.jiyu06 같은 계정은 전부 팬페이지다
// (og:title 에 FANPAGE / Updates 로 명시돼 있다).
//
// 주의: 인스타는 없는 계정 URL 에도 HTTP 200 을 돌려준다. 계정 실재 여부는
// 상태코드가 아니라 og:description(팔로워/게시물 수)이 있는지로 판단할 것.
export const IG_USERNAMES = ["kiiikiii.official"];
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
