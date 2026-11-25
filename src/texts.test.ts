import { describe, expect, it } from "vitest";
import { foundWordsTitle, pointCount, praise, wordCount } from "./texts";

describe("texts", () => {
  it("praises longer words more", () => {
    expect(praise(1)).toBe("Hyvä!");
    expect(praise(5)).toBe("Hienoa!");
    expect(praise(6)).toBe("Hienoa!");
    expect(praise(7)).toBe("Mahtavaa!");
    expect(praise(9)).toBe("Upeaa!");
    expect(praise(12)).toBe("Uskomatonta!");
  });

  it("uses the right Finnish forms for counts", () => {
    expect(foundWordsTitle(0)).toBe("Et ole vielä löytänyt sanoja");
    expect(foundWordsTitle(1)).toBe("Olet löytänyt 1 sanan");
    expect(foundWordsTitle(5)).toBe("Olet löytänyt 5 sanaa");
    expect(wordCount(1)).toBe("1 sana");
    expect(wordCount(3)).toBe("3 sanaa");
    expect(pointCount(1)).toBe("1 piste");
    expect(pointCount(2)).toBe("2 pistettä");
  });
});
