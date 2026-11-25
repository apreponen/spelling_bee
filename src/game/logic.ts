// Pure game rules: no Vue, no browser APIs. Everything here is unit tested.
// Keep the first three constants in sync with scripts/build_data.py.

export const MIN_WORD_LENGTH = 4;
export const LETTERS_PER_PUZZLE = 7;
export const PANGRAM_BONUS = 7;
/** Longest guess we let the player type. */
export const MAX_GUESS_LENGTH = 30;

/** Ranks and the share of the day's maximum score that each one needs. */
export const RANKS = [
  { name: "Aloittelija", share: 0 },
  { name: "Hyvä alku", share: 0.02 },
  { name: "Nousussa", share: 0.05 },
  { name: "Hyvä", share: 0.08 },
  { name: "Vahva", share: 0.15 },
  { name: "Mainio", share: 0.25 },
  { name: "Loistava", share: 0.4 },
  { name: "Upea", share: 0.5 },
  { name: "Nero", share: 0.7 },
] as const;
/** A secret extra rank for finding every word. It is not shown in the rank table,
 * only celebrated (and shown on the progress bar) once the player reaches it. */
export const QUEEN_RANK = "Kuningatar";
export const GENIUS_INDEX = RANKS.length - 1;

/** Letters a player can type: the Finnish alphabet. */
export const TYPEABLE = /^[a-zåäö]$/;

export interface Puzzle {
  /** Position in the schedule (puzzle number). */
  number: number;
  /** The day this puzzle is played, YYYY-MM-DD. */
  date: string;
  /** The letter every word must contain. */
  center: string;
  /** All seven letters in alphabetical order. */
  letters: string[];
  /** Every accepted word, in alphabetical order. */
  answers: string[];
  maxScore: number;
}

export type GuessError =
  | "too-short"
  | "bad-letters"
  | "missing-center"
  | "already-found"
  | "not-in-list";

export type GuessResult =
  | { ok: true; word: string; points: number; pangram: boolean }
  | { ok: false; error: GuessError };

const collator = new Intl.Collator("fi");

/** Sort words in Finnish alphabetical order (å, ä, ö after z). */
export function sortFinnish(words: Iterable<string>): string[] {
  return [...words].sort(collator.compare);
}

/** A pangram uses all seven letters of the puzzle. */
export function isPangram(word: string): boolean {
  return new Set(word).size === LETTERS_PER_PUZZLE;
}

/** A perfect pangram uses each of the seven letters exactly once. */
export function isPerfectPangram(word: string): boolean {
  return isPangram(word) && word.length === LETTERS_PER_PUZZLE;
}

/** 4-letter words are worth 1 point, longer words 1 point per letter, pangrams 7 more. */
export function wordScore(word: string): number {
  if (word.length === MIN_WORD_LENGTH) return 1;
  return word.length + (isPangram(word) ? PANGRAM_BONUS : 0);
}

export function totalScore(words: Iterable<string>): number {
  let total = 0;
  for (const word of words) total += wordScore(word);
  return total;
}

/** All words (from an alphabetically sorted list) that can be made from the letters. */
export function findAnswers(words: readonly string[], letters: readonly string[], center: string): string[] {
  const onlyThese = new RegExp(`^[${letters.join("")}]+$`);
  return words.filter((word) => word.includes(center) && onlyThese.test(word));
}

export function makePuzzle(spec: string, date: string, number: number, words: readonly string[]): Puzzle {
  const [center, letterString] = spec.split(":");
  const letters = sortFinnish(letterString);
  const answers = findAnswers(words, letters, center);
  return { number, date, center, letters, answers, maxScore: totalScore(answers) };
}

export function checkGuess(guess: string, puzzle: Puzzle, found: readonly string[]): GuessResult {
  const word = guess.toLowerCase();
  if (word.length < MIN_WORD_LENGTH) return { ok: false, error: "too-short" };
  if ([...word].some((letter) => !puzzle.letters.includes(letter))) return { ok: false, error: "bad-letters" };
  if (!word.includes(puzzle.center)) return { ok: false, error: "missing-center" };
  if (found.includes(word)) return { ok: false, error: "already-found" };
  if (!puzzle.answers.includes(word)) return { ok: false, error: "not-in-list" };
  return { ok: true, word, points: wordScore(word), pangram: isPangram(word) };
}

/** Minimum score for each rank, for a puzzle with the given maximum score. */
export function rankThresholds(maxScore: number): { name: string; minScore: number }[] {
  return RANKS.map((rank) => ({ name: rank.name, minScore: Math.round(rank.share * maxScore) }));
}

/** Index into RANKS of the highest rank reached with this score. */
export function rankIndex(score: number, maxScore: number): number {
  const thresholds = rankThresholds(maxScore);
  let index = 0;
  thresholds.forEach((rank, i) => {
    if (score >= rank.minScore) index = i;
  });
  return index;
}

// ----- Hints ---------------------------------------------------------------

export interface HintCell {
  total: number;
  left: number;
}

export interface HintGrid {
  /** Word lengths that occur in the puzzle (the columns). */
  lengths: number[];
  rows: { letter: string; cells: HintCell[]; sum: HintCell }[];
  columnSums: HintCell[];
  sum: HintCell;
}

function addTo(cell: HintCell, isFound: boolean) {
  cell.total += 1;
  if (!isFound) cell.left += 1;
}

/** Counts of words by first letter and length: total and still to be found. */
export function hintGrid(answers: readonly string[], found: readonly string[]): HintGrid {
  const foundSet = new Set(found);
  const lengths = [...new Set(answers.map((w) => w.length))].sort((a, b) => a - b);
  const firstLetters = sortFinnish(new Set(answers.map((w) => w[0])));
  const newCell = () => ({ total: 0, left: 0 });
  const rows = firstLetters.map((letter) => ({ letter, cells: lengths.map(newCell), sum: newCell() }));
  const columnSums = lengths.map(newCell);
  const sum = newCell();
  for (const word of answers) {
    const row = rows[firstLetters.indexOf(word[0])];
    const column = lengths.indexOf(word.length);
    const isFound = foundSet.has(word);
    for (const cell of [row.cells[column], row.sum, columnSums[column], sum]) addTo(cell, isFound);
  }
  return { lengths, rows, columnSums, sum };
}

/** Counts of words by their first two letters, grouped by the first letter. */
export function twoLetterHints(
  answers: readonly string[],
  found: readonly string[],
): { letter: string; prefixes: ({ prefix: string } & HintCell)[] }[] {
  const foundSet = new Set(found);
  const counts = new Map<string, HintCell>();
  for (const word of answers) {
    const prefix = word.slice(0, 2);
    if (!counts.has(prefix)) counts.set(prefix, { total: 0, left: 0 });
    addTo(counts.get(prefix)!, foundSet.has(word));
  }
  const groups = new Map<string, ({ prefix: string } & HintCell)[]>();
  for (const prefix of sortFinnish(counts.keys())) {
    const letter = prefix[0];
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter)!.push({ prefix, ...counts.get(prefix)! });
  }
  return [...groups].map(([letter, prefixes]) => ({ letter, prefixes }));
}

// ----- Dates ---------------------------------------------------------------
// Dates are handled as "YYYY-MM-DD" strings in the player's own time zone, so
// a new puzzle appears at local midnight.

export function localDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dayNumber(dateString: string): number {
  const [year, month, day] = dateString.split("-").map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

export function addDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** For example "keskiviikkona 25. marraskuuta 2026", or "ke 25.11.2026" when short. */
export function formatDate(dateString: string, short = false): string {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat("fi-FI", {
    weekday: short ? "short" : "long",
    day: "numeric",
    month: short ? "numeric" : "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

/** Random numbers (0 ≤ n < 1) that are always the same for the same seed text. */
export function seededRandom(seed: string): () => number {
  let state = 2166136261;
  for (const ch of seed) state = Math.imul(state ^ ch.charCodeAt(0), 16777619);
  return () => {
    // mulberry32
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle that returns a new array. */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
