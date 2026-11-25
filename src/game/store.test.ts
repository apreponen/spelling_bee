import { describe, expect, it } from "vitest";
import { createGame, PROGRESS_KEY, type Schedule } from "./store";

/** A tiny in-memory replacement for localStorage. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

// Like the real words.txt, the list is in alphabetical order.
const WORDS = ["ahde", "data", "idea", "lepistö", "pesti", "piste", "pöly", "taide", "tiede", "vaihde", "vaihdettava"];
const SCHEDULE: Schedule = { epoch: "2026-11-24", puzzles: ["ö:eilpstö", "d:adehitv"] };

function setup(date = "2026-11-25T12:00:00", storage: Storage | null = memoryStorage()) {
  let now = new Date(date);
  const game = createGame({ words: WORDS, schedule: SCHEDULE, storage, now: () => now });
  return { game, storage, setNow: (d: string) => (now = new Date(d)) };
}

function play(game: ReturnType<typeof setup>["game"], word: string) {
  for (const letter of word) game.typeLetter(letter);
  return game.submit();
}

describe("the game", () => {
  it("picks the puzzle for today and yesterday", () => {
    const { game } = setup();
    expect(game.state.puzzle.center).toBe("d");
    expect(game.state.puzzle.answers).toEqual(["ahde", "data", "idea", "taide", "tiede", "vaihde", "vaihdettava"]);
    expect(game.state.yesterday?.puzzle.center).toBe("ö");
  });

  it("has no yesterday on the very first day", () => {
    const { game } = setup("2026-11-24T08:00:00");
    expect(game.state.yesterday).toBeNull();
  });

  it("repeats the schedule when it runs out", () => {
    const { game } = setup("2026-11-26T08:00:00");
    expect(game.state.puzzle.center).toBe("ö");
  });

  it("accepts a correct word and updates the score and rank", () => {
    const { game } = setup();
    expect(play(game, "taide")).toMatchObject({ ok: true, points: 5 });
    expect(game.state.found).toEqual(["taide"]);
    expect(game.state.guess).toBe("");
    expect(game.score.value).toBe(5);
    expect(game.rank.value).toBeGreaterThan(0);
  });

  it("keeps a rejected word on screen until the next letter is typed", () => {
    const { game } = setup();
    expect(play(game, "tiet")).toEqual({ ok: false, error: "missing-center" });
    expect(game.state.guess).toBe("tiet");
    expect(game.submit()).toBeNull(); // pressing Enter again does nothing
    game.typeLetter("d");
    expect(game.state.guess).toBe("d");
  });

  it("deletes letters", () => {
    const { game } = setup();
    for (const letter of "ide") game.typeLetter(letter);
    game.deleteLetter();
    expect(game.state.guess).toBe("id");
    game.clearGuess();
    expect(game.state.guess).toBe("");
  });

  it("remembers found words when the page is opened again", () => {
    const { game, storage } = setup();
    play(game, "idea");
    play(game, "vaihde");
    const again = createGame({ words: WORDS, schedule: SCHEDULE, storage, now: () => new Date("2026-11-25T20:00:00") });
    expect(again.state.found).toEqual(["idea", "vaihde"]);
  });

  it("ignores saved words if the puzzle for that day has changed", () => {
    const { game, storage } = setup();
    play(game, "idea");
    const changed: Schedule = { epoch: "2026-11-24", puzzles: ["ö:eilpstö", "ö:eilpstö"] };
    const again = createGame({ words: WORDS, schedule: changed, storage, now: () => new Date("2026-11-25T20:00:00") });
    expect(again.state.found).toEqual([]);
  });

  it("survives broken saved data", () => {
    const storage = memoryStorage();
    storage.setItem(PROGRESS_KEY, "{not json");
    const { game } = setup(undefined, storage);
    expect(game.state.found).toEqual([]);
    expect(play(game, "idea")).toMatchObject({ ok: true });
  });

  it("works without storage", () => {
    const { game } = setup(undefined, null);
    expect(play(game, "idea")).toMatchObject({ ok: true });
  });

  it("shows yesterday's found words", () => {
    const { game, setNow } = setup("2026-11-24T10:00:00");
    expect(play(game, "pöly")).toEqual({ ok: false, error: "bad-letters" }); // no Y in this puzzle
    game.clearGuess();
    expect(play(game, "lepistö")).toMatchObject({ ok: true, pangram: true });
    setNow("2026-11-25T07:00:00");
    expect(game.refreshIfNewDay()).toBe(true);
    expect(game.state.puzzle.center).toBe("d");
    expect(game.state.found).toEqual([]);
    expect(game.state.yesterday?.found).toEqual(["lepistö"]);
  });

  it("does not switch puzzles during the same day", () => {
    const { game } = setup();
    expect(game.refreshIfNewDay()).toBe(false);
  });

  it("celebrates the Nero rank and finding every word once", () => {
    const { game } = setup();
    for (const word of ["vaihdettava", "vaihde", "taide", "tiede"]) play(game, word);
    expect(game.pendingCelebration()).toBe("nero");
    game.markCelebrated("nero");
    expect(game.pendingCelebration()).toBeNull();
    for (const word of ["ahde", "data", "idea"]) play(game, word);
    expect(game.isQueen.value).toBe(true);
    expect(game.pendingCelebration()).toBe("queen");
    game.markCelebrated("queen");
    expect(game.pendingCelebration()).toBeNull();
  });

  it("picks up words found in another browser tab", () => {
    const { game, storage } = setup();
    const otherTab = createGame({ words: WORDS, schedule: SCHEDULE, storage, now: () => new Date("2026-11-25T12:00:00") });
    play(otherTab, "data");
    play(game, "idea");
    game.syncFromStorage();
    expect([...game.state.found].sort()).toEqual(["data", "idea"]);
  });
});
