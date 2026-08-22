import { describe, expect, it } from "vitest";
import { detectMembers, memberKeyForIgUsername, mentionsAlias } from "./members";
import { scoreSentiment } from "./sentiment";
import { extractKeywords } from "./keywords";
import { analyzeComments } from "./analyze";

describe("mentionsAlias", () => {
  it("matches an alias followed by a particle", () => {
    expect(mentionsAlias("수이는 오늘도 예쁘다", "수이")).toBe(true);
    expect(mentionsAlias("하음이가 최고야", "하음")).toBe(true);
  });

  it("rejects the alias embedded in another word", () => {
    expect(mentionsAlias("아이솔레이션 최고", "이솔")).toBe(false);
    expect(mentionsAlias("가수이다", "수이")).toBe(false);
    expect(mentionsAlias("키야누 리브스", "키야")).toBe(false);
  });

  it("matches at string boundaries", () => {
    expect(mentionsAlias("키야", "키야")).toBe(true);
    expect(mentionsAlias("최고다 지유", "지유")).toBe(true);
  });

  it("keeps scanning past a rejected occurrence", () => {
    expect(mentionsAlias("아이솔레이션 중에도 이솔이가 보인다", "이솔")).toBe(true);
  });
});

describe("detectMembers", () => {
  it("finds multiple members in one comment (case-insensitive)", () => {
    const keys = detectMembers("Jiyu 미모 미쳤고 하음도 귀엽다");
    expect(keys).toContain("jiyu");
    expect(keys).toContain("haum");
    expect(keys).toHaveLength(2);
  });

  it("returns [] when nobody is mentioned", () => {
    expect(detectMembers("오늘 콘서트 너무 재밌었다")).toEqual([]);
  });
});

describe("scoreSentiment", () => {
  it("labels fan-slang positives", () => {
    expect(scoreSentiment("지유 비주얼 미쳤다 진짜 예뻐").label).toBe("positive");
    expect(scoreSentiment("무대 찢었다 레전드 ❤").label).toBe("positive");
  });

  it("labels negatives", () => {
    expect(scoreSentiment("이번 곡은 별로다 실망했어").label).toBe("negative");
  });

  it("labels neutral when no cues or tied", () => {
    expect(scoreSentiment("3:24 안무 구간").label).toBe("neutral");
  });

  it("scores English cues as whole words only", () => {
    expect(scoreSentiment("Jiyu is so pretty and talented").label).toBe("positive");
    expect(scoreSentiment("this song is boring, hate it").label).toBe("negative");
    expect(scoreSentiment("we ate lunch late").label).toBe("neutral");
  });
});

describe("extractKeywords", () => {
  it("counts across comments, once per comment, minus stopwords", () => {
    const texts = ["직캠 미모 직캠 직캠", "직캠 좋다", "진짜 너무 미모"];
    const kws = extractKeywords(texts);
    expect(kws.find((k) => k.word === "직캠")?.count).toBe(2);
    expect(kws.find((k) => k.word === "미모")?.count).toBe(2);
    expect(kws.find((k) => k.word === "진짜")).toBeUndefined();
  });

  it("strips stacked trailing josa and honors exclude", () => {
    const kws = extractKeywords(["하음이 미모 최고", "수이는 수이야 최고"], {
      exclude: new Set(["하음", "수이"]),
    });
    for (const w of ["하음", "하음이", "수이", "수이는", "수이야"]) {
      expect(kws.find((k) => k.word === w)).toBeUndefined();
    }
  });

  it("filters English function words", () => {
    const kws = extractKeywords(["she is so pretty and they love her stage"]);
    expect(kws.find((k) => k.word === "she")).toBeUndefined();
    expect(kws.find((k) => k.word === "they")).toBeUndefined();
    expect(kws.find((k) => k.word === "pretty")).toBeDefined();
  });
});

describe("analyzeComments", () => {
  const c = (id: string, text: string, likeCount = 0) => ({ id, text, likeCount });

  it("aggregates per member with sentiment and top comment", () => {
    const result = analyzeComments([
      c("1", "수이 진짜 예쁘다", 5),
      c("2", "수이 파트 별로였음", 1),
      c("3", "수이 <b>여신</b> 그 자체", 10),
      c("4", "오늘 날씨 얘기만 하는 댓글", 99),
    ]);
    const sui = result.members.find((m) => m.member.key === "sui")!;
    expect(sui.mentionCount).toBe(3);
    expect(sui.sentiment).toEqual({ positive: 2, negative: 1, neutral: 0 });
    expect(sui.positiveRate).toBeCloseTo(2 / 3);
    expect(sui.topComment?.id).toBe("3");
    expect(result.total).toBe(4);
  });

  it("attributes pre-tagged units (member's own IG post) without a name mention", () => {
    const result = analyzeComments([
      { id: "1", text: "오늘도 행복한 하루 🤍", likeCount: 0, members: ["jiyu"] },
    ]);
    const jiyu = result.members.find((m) => m.member.key === "jiyu")!;
    expect(jiyu.mentionCount).toBe(1);
    expect(jiyu.sentiment.positive).toBe(1);
  });

  it("does not double-count when tagged and mentioned", () => {
    const result = analyzeComments([
      { id: "1", text: "지유 셀카 최고", likeCount: 0, members: ["jiyu"] },
    ]);
    expect(
      result.members.find((m) => m.member.key === "jiyu")!.mentionCount,
    ).toBe(1);
  });

  it("maps IG usernames to member keys", () => {
    expect(memberKeyForIgUsername("kiiikiii__jiyu")).toBe("jiyu");
    expect(memberKeyForIgUsername("kiiikiii__haum")).toBe("haum");
    expect(memberKeyForIgUsername("kiiikiii.official")).toBeUndefined();
  });

  it("rolls up sentiment per origin", () => {
    const result = analyzeComments([
      { id: "1", text: "수이 최고 예쁘다", likeCount: 0, origin: "youtube" },
      { id: "2", text: "키키 컴백 일정 발표", likeCount: 0, origin: "news" },
      { id: "3", text: "이번 앨범 별로임", likeCount: 0, origin: "dc" },
    ]);
    expect(result.sources.youtube).toEqual({ positive: 1, neutral: 0, negative: 0 });
    expect(result.sources.news).toEqual({ positive: 0, neutral: 1, negative: 0 });
    expect(result.sources.dc).toEqual({ positive: 0, neutral: 0, negative: 1 });
  });

  it("sorts members by mention count and excludes alias keywords", () => {
    const result = analyzeComments([
      c("1", "하음 하음 하음 귀엽다"),
      c("2", "하음 미모"),
      c("3", "키야 최고"),
    ]);
    expect(result.members[0].member.key).toBe("haum");
    const haum = result.members[0];
    expect(haum.keywords.find((k) => k.word === "하음")).toBeUndefined();
  });
});
