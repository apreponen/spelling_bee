// The game state: today's puzzle, the words found so far, the word being
// typed, and saving progress in the browser (localStorage).

import { computed, reactive } from "vue";
import wordsText from "../data/words.txt?raw";
import scheduleJson from "../data/puzzles.json";
import {
  GENIUS_INDEX,
  MAX_GUESS_LENGTH,
  addDays,
  checkGuess,
  daysBetween,
  localDateString,
  makePuzzle,
  rankIndex,
  totalScore,
  type GuessResult,
  type Puzzle,
} from "./logic";

export interface Schedule {
  /** The day of puzzle number 0, YYYY-MM-DD. */
  epoch: string;
  /** Puzzles as "center:letters", e.g. "ä:hiksuäö". */
  puzzles: string[];
}

export interface GameOptions {
  words: readonly string[];
  schedule: Schedule;
  now?: () => Date;
  storage?: Storage | null;
}

export type Celebration = "nero" | "queen";

interface SavedDay {
  puzzle: string;
  found: string[];
  celebrated: Celebration[];
}

export const PROGRESS_KEY = "sanakenno:progress";
/** Progress older than this many days is forgotten. */
const KEEP_DAYS = 60;

function defaultStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function puzzleSpec(puzzle: Puzzle): string {
  return `${puzzle.center}:${puzzle.letters.join("")}`;
}

export function createGame(options: GameOptions) {
  const { words, schedule } = options;
  const now = options.now ?? (() => new Date());
  const storage = options.storage === undefined ? defaultStorage() : options.storage;

  function readSaved(): Record<string, SavedDay> {
    try {
      const data = JSON.parse(storage?.getItem(PROGRESS_KEY) ?? "{}");
      return data && typeof data === "object" ? data : {};
    } catch {
      return {};
    }
  }

  function puzzleNumber(date: string): number {
    return daysBetween(schedule.epoch, date);
  }

  function puzzleFor(date: string): Puzzle {
    const count = schedule.puzzles.length;
    const number = puzzleNumber(date);
    const spec = schedule.puzzles[((number % count) + count) % count];
    return makePuzzle(spec, date, number, words);
  }

  /** Saved words for a day, ignoring anything that does not fit the puzzle
   * (for example if the word list or the schedule has been changed since). */
  function savedFound(saved: SavedDay | undefined, puzzle: Puzzle): string[] {
    if (!saved || saved.puzzle !== puzzleSpec(puzzle) || !Array.isArray(saved.found)) return [];
    return saved.found.filter((word, i) => puzzle.answers.includes(word) && saved.found.indexOf(word) === i);
  }

  function savedCelebrations(saved: SavedDay | undefined, puzzle: Puzzle): Celebration[] {
    if (!saved || saved.puzzle !== puzzleSpec(puzzle) || !Array.isArray(saved.celebrated)) return [];
    return saved.celebrated.filter((c) => c === "nero" || c === "queen");
  }

  const state = reactive({
    today: "",
    puzzle: null as unknown as Puzzle,
    /** Words found today, in the order they were found. */
    found: [] as string[],
    celebrated: [] as Celebration[],
    yesterday: null as { puzzle: Puzzle; found: string[] } | null,
    /** The word being typed. */
    guess: "",
    /** True after a rejected guess, until it is cleared. */
    rejected: false,
  });

  function load(): void {
    const today = localDateString(now());
    const saved = readSaved();
    state.today = today;
    state.puzzle = puzzleFor(today);
    state.found = savedFound(saved[today], state.puzzle);
    state.celebrated = savedCelebrations(saved[today], state.puzzle);
    state.guess = "";
    state.rejected = false;

    const yesterday = addDays(today, -1);
    if (puzzleNumber(yesterday) >= 0) {
      const puzzle = puzzleFor(yesterday);
      state.yesterday = { puzzle, found: savedFound(saved[yesterday], puzzle) };
    } else {
      state.yesterday = null; // the first day: there was no puzzle yesterday
    }
  }

  /** Add words (and celebrations) saved by another tab of the same game. */
  function mergeSaved(saved: SavedDay | undefined): void {
    const missing = savedFound(saved, state.puzzle).filter((word) => !state.found.includes(word));
    if (missing.length) state.found.push(...missing);
    for (const mark of savedCelebrations(saved, state.puzzle)) {
      if (!state.celebrated.includes(mark)) state.celebrated.push(mark);
    }
  }

  function save(): void {
    if (!storage) return;
    const saved = readSaved();
    mergeSaved(saved[state.today]); // don't overwrite words found in another tab
    saved[state.today] = {
      puzzle: puzzleSpec(state.puzzle),
      found: [...state.found],
      celebrated: [...state.celebrated],
    };
    for (const date of Object.keys(saved)) {
      if (!/^\d{4}-\d\d-\d\d$/.test(date) || daysBetween(date, state.today) > KEEP_DAYS) delete saved[date];
    }
    try {
      storage.setItem(PROGRESS_KEY, JSON.stringify(saved));
    } catch {
      // Storage is full or blocked: the game still works, progress just isn't saved.
    }
  }

  const score = computed(() => totalScore(state.found));
  const rank = computed(() => rankIndex(score.value, state.puzzle.maxScore));
  const isQueen = computed(() => state.found.length === state.puzzle.answers.length);

  function clearRejected(): void {
    if (state.rejected) {
      state.guess = "";
      state.rejected = false;
    }
  }

  function typeLetter(letter: string): void {
    clearRejected();
    if (state.guess.length < MAX_GUESS_LENGTH) state.guess += letter;
  }

  function deleteLetter(): void {
    if (state.rejected) clearRejected();
    else state.guess = state.guess.slice(0, -1);
  }

  function clearGuess(): void {
    state.guess = "";
    state.rejected = false;
  }

  /** Check the typed word. Returns null if nothing was typed. */
  function submit(): GuessResult | null {
    if (!state.guess || state.rejected) return null;
    const result = checkGuess(state.guess, state.puzzle, state.found);
    if (result.ok) {
      state.found.push(result.word);
      state.guess = "";
      save();
    } else {
      state.rejected = true;
    }
    return result;
  }

  /** A celebration that is due but has not been shown yet. */
  function pendingCelebration(): Celebration | null {
    if (isQueen.value && !state.celebrated.includes("queen")) return "queen";
    if (rank.value >= GENIUS_INDEX && !state.celebrated.includes("nero")) return "nero";
    return null;
  }

  function markCelebrated(celebration: Celebration): void {
    const marks: Celebration[] = celebration === "queen" ? ["queen", "nero"] : ["nero"];
    for (const mark of marks) if (!state.celebrated.includes(mark)) state.celebrated.push(mark);
    save();
  }

  /** Words found in another browser tab show up here too. */
  function syncFromStorage(): void {
    mergeSaved(readSaved()[state.today]);
  }

  /** Switch to the new puzzle if midnight has passed. Returns true if it did. */
  function refreshIfNewDay(): boolean {
    if (localDateString(now()) === state.today) return false;
    load();
    return true;
  }

  load();

  return {
    state,
    score,
    rank,
    isQueen,
    typeLetter,
    deleteLetter,
    clearGuess,
    clearRejected,
    submit,
    pendingCelebration,
    markCelebrated,
    syncFromStorage,
    refreshIfNewDay,
  };
}

export type Game = ReturnType<typeof createGame>;

export const WORDS: readonly string[] = wordsText.split(/\r?\n/).filter(Boolean);
export const SCHEDULE: Schedule = scheduleJson;

let game: Game | null = null;

/** The game used by the app (created on first use). */
export function useGame(): Game {
  game ??= createGame({ words: WORDS, schedule: SCHEDULE });
  return game;
}

/** For tests: start over with a fresh game. */
export function resetGame(options?: Partial<GameOptions>): Game {
  game = createGame({ words: WORDS, schedule: SCHEDULE, ...options });
  return game;
}
