import { describe, expect, it } from "vitest";
import { stripHtml, truncate } from "./html";

describe("stripHtml", () => {
  it("removes tags and decodes common entities", () => {
    expect(stripHtml("<b>키키</b> &amp; &quot;지유&quot;")).toBe('키키 & "지유"');
  });
  it("collapses to trimmed text", () => {
    expect(stripHtml("  <p>hi</p>  ")).toBe("hi");
  });
  it("decodes &amp; last so double-encoded entities stay literal", () => {
    expect(stripHtml("&amp;quot;")).toBe("&quot;");
  });
  it("decodes hex apostrophe entities (Nate Pann)", () => {
    expect(stripHtml("키키 &#x27;I DO ME&#x27; 어때")).toBe("키키 'I DO ME' 어때");
    expect(stripHtml("&#39;a&#x27;b&#39;")).toBe("'a'b'");
  });
});

describe("truncate", () => {
  it("leaves short strings unchanged", () => {
    expect(truncate("abc", 10)).toBe("abc");
  });
  it("leaves a string exactly at the limit unchanged", () => {
    expect(truncate("abcd", 4)).toBe("abcd");
  });
  it("adds an ellipsis when over the limit", () => {
    expect(truncate("abcdef", 4)).toBe("abc…");
  });
});
