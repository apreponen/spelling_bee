import { describe, expect, it } from "vitest";
import {
  addDays,
  checkGuess,
  daysBetween,
  findAnswers,
  formatDate,
  hintGrid,
  isPangram,
  isPerfectPangram,
  localDateString,
  makePuzzle,
  rankIndex,
  rankThresholds,
  seededRandom,
  shuffled,
  sortFinnish,
  totalScore,
  twoLetterHints,
  wordScore,
} from "./logic";

const WORDS = sortFinnish(["ahde", "data", "idea", "taide", "tiede", "vaihde", "viihde", "vaihdettava", "talo", "hai"]);

describe("scoring", () => {
  it("gives 1 point for 4-letter words and 1 point per letter for longer words", () => {
    expect(wordScore("idea")).toBe(1);
    expect(wordScore("taide")).toBe(5);
    expect(wordScore("vaihde")).toBe(6);
  });

  it("gives 7 extra points for a pangram", () => {
    expect(isPangram("vaihdettava")).toBe(true);
    expect(wordScore("vaihdettava")).toBe(11 + 7);
    expect(totalScore(["idea", "taide", "vaihdettava"])).toBe(1 + 5 + 18);
  });

  it("knows perfect pangrams", () => {
    expect(isPerfectPangram("lepistö")).toBe(true);
    expect(isPerfectPangram("vaihdettava")).toBe(false);
  });
});

describe("puzzles", () => {
  const puzzle = makePuzzle("d:adehitv", "2026-11-25", 1, WORDS);

  it("finds the words that use only the puzzle letters and include the center", () => {
    expect(findAnswers(WORDS, ["a", "d", "e", "h", "i", "t", "v"], "d")).toEqual([
      "ahde",
      "data",
      "idea",
      "taide",
      "tiede",
      "vaihde",
      "vaihdettava",
      "viihde",
    ]);
    expect(puzzle.maxScore).toBe(totalScore(puzzle.answers));
    expect(puzzle.letters).toEqual(["a", "d", "e", "h", "i", "t", "v"]);
  });

  it("checks guesses in the right order", () => {
    expect(checkGuess("dad", puzzle, [])).toEqual({ ok: false, error: "too-short" });
    expect(checkGuess("talo", puzzle, [])).toEqual({ ok: false, error: "bad-letters" });
    expect(checkGuess("hattu", puzzle, [])).toEqual({ ok: false, error: "bad-letters" });
    expect(checkGuess("tieta", puzzle, [])).toEqual({ ok: false, error: "missing-center" });
    expect(checkGuess("idea", puzzle, ["idea"])).toEqual({ ok: false, error: "already-found" });
    expect(checkGuess("deadi", puzzle, [])).toEqual({ ok: false, error: "not-in-list" });
    expect(checkGuess("IDEA", puzzle, [])).toEqual({ ok: true, word: "idea", points: 1, pangram: false });
    expect(checkGuess("vaihdettava", puzzle, [])).toEqual({
      ok: true,
      word: "vaihdettava",
      points: 18,
      pangram: true,
    });
  });
});

describe("ranks", () => {
  it("uses the share of the maximum score", () => {
    expect(rankThresholds(100).map((r) => r.minScore)).toEqual([0, 2, 5, 8, 15, 25, 40, 50, 70]);
    expect(rankThresholds(132).map((r) => r.minScore)).toEqual([0, 3, 7, 11, 20, 33, 53, 66, 92]);
  });

  it("finds the highest rank reached", () => {
    expect(rankIndex(0, 100)).toBe(0);
    expect(rankIndex(1, 100)).toBe(0);
    expect(rankIndex(2, 100)).toBe(1);
    expect(rankIndex(69, 100)).toBe(7);
    expect(rankIndex(70, 100)).toBe(8);
    expect(rankIndex(100, 100)).toBe(8);
  });
});

describe("hints", () => {
  const answers = ["ahde", "data", "idea", "taide", "tiede", "vaihde", "vaihdettava", "viihde", "äidä"];

  it("counts words by first letter and length", () => {
    const grid = hintGrid(answers, ["data", "taide"]);
    expect(grid.lengths).toEqual([4, 5, 6, 11]);
    expect(grid.rows.map((r) => r.letter)).toEqual(["a", "d", "i", "t", "v", "ä"]);
    const t = grid.rows[3];
    expect(t.cells.map((c) => c.total)).toEqual([0, 2, 0, 0]);
    expect(t.cells.map((c) => c.left)).toEqual([0, 1, 0, 0]);
    expect(grid.sum).toEqual({ total: 9, left: 7 });
    expect(grid.columnSums[0]).toEqual({ total: 4, left: 3 });
  });

  it("counts words by their first two letters", () => {
    const hints = twoLetterHints(answers, ["vaihde"]);
    const v = hints.find((group) => group.letter === "v")!;
    expect(v.prefixes).toEqual([
      { prefix: "va", total: 2, left: 1 },
      { prefix: "vi", total: 1, left: 1 },
    ]);
  });
});

describe("dates", () => {
  it("formats local dates", () => {
    expect(localDateString(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("counts days correctly across daylight saving time and year ends", () => {
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2); // clocks change on 29 March in Finland
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetween("2026-11-25", "2026-11-24")).toBe(-1);
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("writes dates in Finnish", () => {
    expect(formatDate("2026-11-25")).toBe("keskiviikkona 25. marraskuuta 2026");
    expect(formatDate("2026-11-25", true)).toBe("ke 25.11.2026");
  });
});

describe("helpers", () => {
  it("sorts in Finnish alphabetical order", () => {
    expect(sortFinnish(["öljy", "äiti", "zeta", "auto"])).toEqual(["auto", "zeta", "äiti", "öljy"]);
  });

  it("shuffles the same way for the same seed", () => {
    const letters = ["a", "e", "h", "i", "t", "v"];
    const first = shuffled(letters, seededRandom("2026-11-25"));
    expect(shuffled(letters, seededRandom("2026-11-25"))).toEqual(first);
    expect([...first].sort()).toEqual(letters);
  });
});
