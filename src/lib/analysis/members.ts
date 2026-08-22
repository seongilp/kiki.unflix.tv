// KiiiKiii member roster + alias matching for comment mention detection.

export interface Member {
  key: string;
  name: string; // display name (Korean)
  aliases: string[]; // lowercase; matched with boundary rules below
  // 개인 인스타 계정. 키키는 2026-08 현재 공식 계정(kiiikiii.official) 하나만
  // 운영하고 멤버 개인 계정은 없다(나무위키/공식 SNS 목록 확인). 계정이 생기면
  // 여기에 채우면 인스타 글이 그 멤버에게 귀속된다. 빈 문자열 = 계정 없음.
  igUsername: string;
}

export const MEMBERS: Member[] = [
  { key: "jiyu", name: "지유", aliases: ["지유", "jiyu"], igUsername: "" },
  { key: "leesol", name: "이솔", aliases: ["이솔", "leesol", "isol"], igUsername: "" },
  { key: "sui", name: "수이", aliases: ["수이", "sui"], igUsername: "" },
  { key: "haum", name: "하음", aliases: ["하음", "haum"], igUsername: "" },
  { key: "kya", name: "키야", aliases: ["키야", "kya"], igUsername: "" },
];

// Member key for a personal Instagram username (undefined for 공식/unknown).
export function memberKeyForIgUsername(username: string): string | undefined {
  // 빈 igUsername 끼리 매칭돼 아무 글이나 첫 멤버에게 붙는 사고를 막는다.
  if (!username) return undefined;
  return MEMBERS.find((m) => m.igUsername === username)?.key;
}

// Josa/suffix characters allowed right after an alias ("수이는", "하음이가",
// "지유님"). Any other Hangul/alnum continuation means it's a different word
// ("아이솔레이션", "가수이다" — rejected by the preceding-char rule).
const TRAILING_PARTICLES = new Set([
  ..."이가은는을를의도만아야랑에께님씨와과요",
]);

const WORD_CHAR = /[가-힣a-z0-9]/;

// True when `alias` occurs in `text` as its own word: the preceding char is a
// boundary, and the following char is a boundary or a particle.
export function mentionsAlias(text: string, alias: string): boolean {
  let from = 0;
  for (;;) {
    const i = text.indexOf(alias, from);
    if (i < 0) return false;
    from = i + 1;
    const prev = i > 0 ? text[i - 1] : "";
    if (prev && WORD_CHAR.test(prev)) continue;
    const next = text[i + alias.length] ?? "";
    if (!next || !WORD_CHAR.test(next) || TRAILING_PARTICLES.has(next)) {
      return true;
    }
  }
}

// Member keys mentioned in a comment (lowercase the text once per comment).
export function detectMembers(text: string): string[] {
  const lower = text.toLowerCase();
  return MEMBERS.filter((m) =>
    m.aliases.some((a) => mentionsAlias(lower, a)),
  ).map((m) => m.key);
}
