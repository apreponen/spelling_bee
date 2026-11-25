#!/usr/bin/env python3
"""
Show the puzzle and all of its answers for one day. Handy for checking puzzles
after editing the word lists. (Spoiler warning!)

Usage (run from the repository root):
    python scripts/show_puzzle.py               # today
    python scripts/show_puzzle.py 2026-12-24    # a given day
    python scripts/show_puzzle.py +1            # tomorrow (-1 = yesterday)
"""

from __future__ import annotations

import sys
from datetime import date, timedelta
from itertools import groupby

from build_data import WORDS_OUT, WordIndex, is_pangram, load_schedule, word_points

# Rank names and the share of the maximum score they need. Same as src/game/logic.ts.
RANKS = [
    ("Aloittelija", 0.00),
    ("Hyvä alku", 0.02),
    ("Nousussa", 0.05),
    ("Hyvä", 0.08),
    ("Vahva", 0.15),
    ("Mainio", 0.25),
    ("Loistava", 0.40),
    ("Upea", 0.50),
    ("Nero", 0.70),
]


def parse_day(text: str | None) -> date:
    if not text:
        return date.today()
    if text[0] in "+-":
        return date.today() + timedelta(days=int(text))
    return date.fromisoformat(text)


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    day = parse_day(args[0] if args else None)
    schedule = load_schedule()
    if schedule is None:
        sys.exit("No puzzle schedule yet. Run:  python scripts/build_data.py")
    index = WordIndex(WORDS_OUT.read_text(encoding="utf-8").split())

    puzzle = schedule.puzzle_for(day)
    answers = index.answers(puzzle)
    total = sum(map(word_points, answers))
    others = " ".join(ch.upper() for ch in puzzle.letters if ch != puzzle.center)

    print(f"{day:%Y-%m-%d (%A)}: puzzle number {schedule.index_for(day)}")
    print(f"Center letter {puzzle.center.upper()}, other letters {others}")
    print(f"{len(answers)} words, {total} points")
    print("Ranks: " + ", ".join(f"{name} {round(total * share)}" for name, share in RANKS))
    print(f"Pangrams: {', '.join(w.upper() for w in answers if is_pangram(w))}")
    print()
    for length, words in groupby(sorted(answers, key=len), key=len):
        print(f"{length:2} letters: {' '.join(words)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
