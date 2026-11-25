// All Finnish text shown in the game, in one place so it is easy to edit.
// (Rank names are in src/game/logic.ts.)

import type { GuessError } from "./game/logic";

export const TEXTS = {
  appName: "Sanakenno",
  menu: {
    help: "Ohjeet",
    hints: "Vihjeet",
    yesterday: "Eilinen",
    darkTheme: "Tumma teema",
    lightTheme: "Vaalea teema",
  },
  controls: {
    delete: "Poista",
    shuffle: "Sekoita kirjaimet",
    enter: "Syötä",
  },
  errors: {
    "too-short": "Liian lyhyt",
    "bad-letters": "Vääriä kirjaimia",
    "missing-center": "Keskikirjain puuttuu",
    "already-found": "Jo löydetty",
    "not-in-list": "Ei sanalistassa",
  } satisfies Record<GuessError, string>,
  pangram: "Pangrammi!",
  yourWords: "Löytämäsi sanat tulevat tähän",
  close: "Sulje",
  rankLabel: "Taso",
  points: "pistettä",
  titles: {
    help: "Näin pelaat",
    hints: "Vihjeet",
    yesterday: "Eilisen sanat",
    ranks: "Tasot",
  },
};

/** Praise for a correct word (pangrams get their own message), growing with the word's points. */
const PRAISE: [minPoints: number, text: string][] = [
  [12, "Uskomatonta!"],
  [9, "Upeaa!"],
  [7, "Mahtavaa!"],
  [5, "Hienoa!"],
  [0, "Hyvä!"],
];

export function praise(points: number): string {
  return PRAISE.find(([minPoints]) => points >= minPoints)![1];
}

/** "Olet löytänyt 5 sanaa" with the right grammatical form. */
export function foundWordsTitle(count: number): string {
  if (count === 0) return "Et ole vielä löytänyt sanoja";
  if (count === 1) return "Olet löytänyt 1 sanan";
  return `Olet löytänyt ${count} sanaa`;
}

/** "1 sana" / "5 sanaa". */
export function wordCount(count: number): string {
  return count === 1 ? "1 sana" : `${count} sanaa`;
}

/** "1 piste" / "5 pistettä". */
export function pointCount(count: number): string {
  return count === 1 ? "1 piste" : `${count} pistettä`;
}
