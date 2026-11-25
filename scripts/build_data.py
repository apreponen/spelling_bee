#!/usr/bin/env python3
"""
Build the data files for the Sanakenno game from the Kotus word list.

Inputs (in data/):
    nykysuomensanalista2022.csv  the original Kotus "Nykysuomen sanalista" (never edited)
    words_added.txt              extra words the game should accept
    words_removed.txt            words the game must reject (slurs, swear words, ...)

Outputs (in src/data/, read by the web app):
    words.txt                    every word the game accepts, one per line
    puzzles.json                 the daily puzzle schedule

Usage (run from the repository root):
    python scripts/build_data.py                  # normal update, keeps the existing schedule
    python scripts/build_data.py --new-schedule   # throw the schedule away and make a new one

Choosing new puzzles needs the `wordfreq` package:  pip install -r requirements.txt

How the Kotus list is adapted to Finnish grammar
------------------------------------------------
English Spelling Bee accepts inflected forms such as "dogs" or "walked". In Finnish
every noun has hundreds of inflected forms (talo, talon, taloa, talossa, taloissani...),
so the game only accepts the dictionary (base) forms that are listed in the Kotus
list: nouns and adjectives in the nominative singular, verbs in the basic infinitive.
Compound words (yhdyssanat) are fine when they are listed. Multi-word phrases,
prefixes like "ala-", hyphenated words and abbreviations are dropped.
"""

from __future__ import annotations

import argparse
import csv
import json
import random
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date
from itertools import combinations
from pathlib import Path
from typing import Callable, Iterable

ROOT = Path(__file__).resolve().parent.parent
KOTUS_CSV = ROOT / "data" / "nykysuomensanalista2022.csv"
WORDS_ADDED = ROOT / "data" / "words_added.txt"
WORDS_REMOVED = ROOT / "data" / "words_removed.txt"
WORDS_OUT = ROOT / "src" / "data" / "words.txt"
PUZZLES_OUT = ROOT / "src" / "data" / "puzzles.json"

# --------------------------------------------------------------------------
# Game rules. Keep these in sync with src/game/logic.ts.
# --------------------------------------------------------------------------
MIN_WORD_LENGTH = 4
LETTERS_PER_PUZZLE = 7
PANGRAM_BONUS = 7

# Letters that puzzles are built from: the letters of native Finnish words
# ("g" only appears in "ng", as in "kangas"). Loan-word letters (b, c, f, q, w,
# x, z, å, š, ž) are left out so that every puzzle feels Finnish.
PUZZLE_ALPHABET = "adeghijklmnoprstuvyäö"

# Finnish alphabetical order: å, ä and ö come after z.
FINNISH_ALPHABET = "abcdefghijklmnopqrstuvwxyzåäö"

# --------------------------------------------------------------------------
# Puzzle quality rules for choosing *new* puzzles.
# --------------------------------------------------------------------------
MIN_ANSWERS = 20
MAX_ANSWERS = 60
MAX_POINTS = 360
# Word frequencies come from the wordfreq package, on the "Zipf" scale:
# 0 = not in its data at all, 1 = very rare, 3 = everyday word, 5 = very common.
# They are only used to pick nice puzzles. Every word in the list is accepted,
# because many ordinary words (e.g. "odottaja") are rare as exact base forms.
#
# A word counts as "familiar" if it appears in the frequency data at all...
FAMILIAR_WORD_ZIPF = 1.0
# ...except adverbs listed in Kotus only as adverbs (word class P), such as
# "päällä" or "lukosta": they are often frequent only because they are also
# ordinary inflected forms of nouns, so they must be really common to count.
FAMILIAR_ADVERB_ZIPF = 3.0
# Familiar words must be worth at least this share of a puzzle's points, so
# the "Nero" rank (70 %) can be reached without knowing obscure words.
MIN_FAMILIAR_POINTS_SHARE = 0.70
# At least one pangram must be a well-known noun, adjective or verb (not one
# of the adverbs above, which players would not think of trying).
MIN_PANGRAM_ZIPF = 2.0

# A puzzle that is already in the schedule is only replaced if it becomes
# unplayable (e.g. after removing words): it must keep a pangram and this many words.
MIN_ANSWERS_TO_KEEP = 15

# The schedule is topped up whenever fewer than this many future days are left.
MIN_FUTURE_DAYS = 365

# Fixed random seed, so the same input always gives the same schedule.
SCHEDULE_SEED = 2026

WORD_RE = re.compile(r"[a-zåäö]+")
VOWELS = set("aeiouyåäö")
_FINNISH_RANK = {letter: i for i, letter in enumerate(FINNISH_ALPHABET)}


def finnish_sort_key(word: str) -> list[int]:
    """Sort key that puts å, ä and ö after z, like a Finnish dictionary."""
    return [_FINNISH_RANK.get(ch, 1000 + ord(ch)) for ch in word]


def sort_letters(letters: Iterable[str]) -> str:
    return "".join(sorted(letters, key=finnish_sort_key))


# --------------------------------------------------------------------------
# Reading the input files
# --------------------------------------------------------------------------
def read_kotus(path: Path = KOTUS_CSV) -> dict[str, set[str]]:
    """Return {headword: word classes} from the Kotus word list.

    Word classes (column "Sanaluokka"): S = noun, A = adjective, V = verb,
    P = adverb or other particle, N = numeral, PR = pronoun. Homonyms such as
    "kuusi" (spruce / six) are listed twice; their classes are merged."""
    classes: dict[str, set[str]] = {}
    with path.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f, delimiter="\t", quoting=csv.QUOTE_NONE):
            headword = row["Hakusana"].strip()
            if headword:
                word_classes = {c.strip() for c in row["Sanaluokka"].split(",") if c.strip()}
                classes.setdefault(headword, set()).update(word_classes)
    return classes


def read_word_file(path: Path) -> list[str]:
    """Read a words_added.txt / words_removed.txt style file (# starts a comment)."""
    if not path.exists():
        return []
    words = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.split("#", 1)[0].strip()
        if line:
            words.append(line)
    return words


# --------------------------------------------------------------------------
# Choosing the words
# --------------------------------------------------------------------------
def rejection_reason(headword: str) -> str | None:
    """Explain why a headword cannot be a game word, or return None if it can."""
    if " " in headword:
        return "multi-word phrase (e.g. 'ennen kuin')"
    if headword.startswith("-") or headword.endswith("-"):
        return "prefix or suffix (e.g. 'ala-', '-inen')"
    if "-" in headword:
        return "hyphenated word (e.g. 'keski-ikä')"
    if headword != headword.lower():
        return "abbreviation or capital letters (e.g. 'ALV')"
    if not WORD_RE.fullmatch(headword):
        return "digits, accents or other special characters"
    if not VOWELS & set(headword):
        return "no vowels"
    return None


def is_playable(word: str) -> bool:
    """Could this word ever be an answer? It must be long enough, use at most
    7 different letters, and only use letters that puzzles are built from."""
    letters = set(word)
    return (
        len(word) >= MIN_WORD_LENGTH
        and len(letters) <= LETTERS_PER_PUZZLE
        and letters <= set(PUZZLE_ALPHABET)
    )


@dataclass
class WordListResult:
    words: list[str]  # playable words, sorted
    rejected: Counter  # reason -> count
    accepted_entries: int  # usable Kotus words (before the playable filter)
    added: int
    removed: int
    unknown_removals: list[str]  # entries of words_removed.txt that were not in the list
    invalid_additions: list[str]  # entries of words_added.txt that were not valid words


def build_word_list(
    headwords: Iterable[str], added: Iterable[str], removed: Iterable[str]
) -> WordListResult:
    rejected: Counter = Counter()
    words: set[str] = set()
    for headword in headwords:
        reason = rejection_reason(headword)
        if reason:
            rejected[reason] += 1
        else:
            words.add(headword)  # homonyms (kuusi 1, kuusi 2) collapse into one
    accepted_entries = len(words)

    invalid_additions = []
    added_count = 0
    for word in added:
        if rejection_reason(word):
            invalid_additions.append(word)
        elif word not in words:
            words.add(word)
            added_count += 1

    removed_set = set(removed)
    unknown_removals = sorted(removed_set - words, key=finnish_sort_key)
    removed_count = len(words & removed_set)
    words -= removed_set

    playable = sorted((w for w in words if is_playable(w)), key=finnish_sort_key)
    return WordListResult(
        words=playable,
        rejected=rejected,
        accepted_entries=accepted_entries,
        added=added_count,
        removed=removed_count,
        unknown_removals=unknown_removals,
        invalid_additions=invalid_additions,
    )


# --------------------------------------------------------------------------
# Puzzles
# --------------------------------------------------------------------------
@dataclass(frozen=True)
class Puzzle:
    center: str  # the letter every word must contain
    letters: str  # all 7 letters (including the center), sorted

    @classmethod
    def parse(cls, text: str) -> "Puzzle":
        """Parse the "center:letters" format used in puzzles.json, e.g. "k:aeiklst"."""
        center, letters = text.split(":")
        if len(set(letters)) != LETTERS_PER_PUZZLE or center not in letters:
            raise ValueError(f"Invalid puzzle {text!r}")
        return cls(center, sort_letters(letters))

    def __str__(self) -> str:
        return f"{self.center}:{self.letters}"


def word_points(word: str) -> int:
    """4-letter words give 1 point, longer words 1 point per letter, and a
    pangram (uses all 7 letters) gives 7 extra points."""
    if len(word) == MIN_WORD_LENGTH:
        return 1
    points = len(word)
    if len(set(word)) == LETTERS_PER_PUZZLE:
        points += PANGRAM_BONUS
    return points


def is_pangram(word: str) -> bool:
    return len(set(word)) == LETTERS_PER_PUZZLE


class WordIndex:
    """Finds the answers of a puzzle quickly by grouping words by their letter set."""

    def __init__(self, words: Iterable[str]):
        self.by_letters: dict[frozenset, list[str]] = defaultdict(list)
        for word in words:
            self.by_letters[frozenset(word)].append(word)

    def answers(self, puzzle: Puzzle) -> list[str]:
        others = [ch for ch in puzzle.letters if ch != puzzle.center]
        found = []
        for size in range(len(others) + 1):
            for combo in combinations(others, size):
                found.extend(self.by_letters.get(frozenset(combo + (puzzle.center,)), []))
        return sorted(found, key=finnish_sort_key)

    def pangram_letter_sets(self) -> list[str]:
        """Every 7-letter set that has at least one pangram, as sorted strings."""
        sets = {
            sort_letters(letters)
            for letters in self.by_letters
            if len(letters) == LETTERS_PER_PUZZLE
        }
        return sorted(sets, key=finnish_sort_key)


def is_playable_puzzle(answers: list[str]) -> bool:
    return len(answers) >= MIN_ANSWERS_TO_KEEP and any(map(is_pangram, answers))


@dataclass(frozen=True)
class WordInfo:
    zipf: float  # frequency from wordfreq (0 = not in its data)
    adverb_only: bool  # Kotus lists the word only as an adverb/particle (P)

    @property
    def familiar(self) -> bool:
        return self.zipf >= (FAMILIAR_ADVERB_ZIPF if self.adverb_only else FAMILIAR_WORD_ZIPF)


@dataclass
class PuzzleQuality:
    answers: int
    points: int
    familiar_points_share: float
    best_pangram_zipf: float  # most frequent pangram that is not an adverb

    def is_good(self) -> bool:
        return (
            MIN_ANSWERS <= self.answers <= MAX_ANSWERS
            and self.points <= MAX_POINTS
            and self.familiar_points_share >= MIN_FAMILIAR_POINTS_SHARE
            and self.best_pangram_zipf >= MIN_PANGRAM_ZIPF
        )


UNKNOWN_WORD = WordInfo(zipf=0.0, adverb_only=False)


def puzzle_quality(answers: list[str], info: dict[str, WordInfo]) -> PuzzleQuality:
    points = sum(word_points(w) for w in answers)
    familiar_points = sum(word_points(w) for w in answers if info.get(w, UNKNOWN_WORD).familiar)
    pangram_zipfs = [
        info.get(w, UNKNOWN_WORD).zipf
        for w in answers
        if is_pangram(w) and not info.get(w, UNKNOWN_WORD).adverb_only
    ]
    return PuzzleQuality(
        answers=len(answers),
        points=points,
        familiar_points_share=familiar_points / points if points else 0.0,
        best_pangram_zipf=max(pangram_zipfs, default=0.0),
    )


def load_word_info(words: Iterable[str], kotus: dict[str, set[str]]) -> dict[str, WordInfo]:
    """Look up how common each word is (needs the wordfreq package)."""
    try:
        from wordfreq import zipf_frequency
    except ImportError:
        sys.exit(
            "Choosing new puzzles needs the 'wordfreq' package.\n"
            "Install it with:  pip install -r requirements.txt"
        )
    print("Looking up word frequencies...")
    return {
        w: WordInfo(zipf_frequency(w, "fi", wordlist="large"), kotus.get(w) == {"P"})
        for w in words
    }


def find_good_puzzles(
    index: WordIndex, info: dict[str, WordInfo], seed: int = SCHEDULE_SEED
) -> list[Puzzle]:
    """Return every good puzzle in a random (but repeatable) order.

    A letter set can make a good puzzle with several center letters. The list
    first has one puzzle from every letter set, then a second center for the
    sets that have one, and so on, so a letter set comes back only years later."""
    rng = random.Random(seed)
    options_per_set = []
    for letters in index.pangram_letter_sets():
        good = [
            Puzzle(center, letters)
            for center in letters
            if puzzle_quality(index.answers(Puzzle(center, letters)), info).is_good()
        ]
        if good:
            rng.shuffle(good)
            options_per_set.append(good)

    puzzles: list[Puzzle] = []
    for round_number in range(LETTERS_PER_PUZZLE):
        batch = [options[round_number] for options in options_per_set if len(options) > round_number]
        rng.shuffle(batch)
        puzzles.extend(batch)
    return puzzles


# --------------------------------------------------------------------------
# The schedule (puzzles.json)
# --------------------------------------------------------------------------
@dataclass
class Schedule:
    epoch: date  # the date of puzzle number 0
    puzzles: list[Puzzle]

    def index_for(self, day: date) -> int:
        """Which puzzle is played on `day` (the schedule repeats when it runs out)."""
        return (day - self.epoch).days % len(self.puzzles)

    def puzzle_for(self, day: date) -> Puzzle:
        return self.puzzles[self.index_for(day)]


def load_schedule(path: Path = PUZZLES_OUT) -> Schedule | None:
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return Schedule(
        epoch=date.fromisoformat(data["epoch"]),
        puzzles=[Puzzle.parse(p) for p in data["puzzles"]],
    )


def save_schedule(schedule: Schedule, path: Path = PUZZLES_OUT) -> None:
    data = {
        "_comment": "Generated by scripts/build_data.py. Puzzle n is played n days after epoch. "
        "Format: 'center letter:all seven letters'.",
        "epoch": schedule.epoch.isoformat(),
        "puzzles": [str(p) for p in schedule.puzzles],
    }
    text = json.dumps(data, ensure_ascii=False, indent=0)
    path.write_text(text + "\n", encoding="utf-8", newline="\n")


@dataclass
class ScheduleUpdate:
    schedule: Schedule
    replaced: list[tuple[int, Puzzle, Puzzle]]  # (position, old, new)
    appended: int


def update_schedule(
    schedule: Schedule,
    index: WordIndex,
    today: date,
    new_puzzles: Callable[[], list[Puzzle]],
) -> ScheduleUpdate:
    """Keep the existing schedule, but replace puzzles that became unplayable and
    add more puzzles when fewer than MIN_FUTURE_DAYS are left.

    `new_puzzles` is only called when new puzzles are actually needed, because
    computing them requires word frequencies."""
    puzzles = list(schedule.puzzles)
    used = set(puzzles)
    pool: list[Puzzle] | None = None

    def next_new_puzzle() -> Puzzle | None:
        nonlocal pool
        if pool is None:
            pool = [p for p in new_puzzles() if p not in used]
        while pool:
            candidate = pool.pop(0)
            if candidate not in used:
                used.add(candidate)
                return candidate
        return None

    replaced = []
    for position, puzzle in enumerate(puzzles):
        if not is_playable_puzzle(index.answers(puzzle)):
            replacement = next_new_puzzle()
            if replacement is None:
                print(f"WARNING: puzzle {position} ({puzzle}) is unplayable and no replacement is left.")
                continue
            puzzles[position] = replacement
            replaced.append((position, puzzle, replacement))

    appended = 0
    days_left = len(puzzles) - (today - schedule.epoch).days
    if days_left < MIN_FUTURE_DAYS:
        while (extra := next_new_puzzle()) is not None:
            puzzles.append(extra)
            appended += 1
        if appended == 0:
            print("WARNING: no unused puzzles left. The schedule will start repeating.")

    return ScheduleUpdate(Schedule(schedule.epoch, puzzles), replaced, appended)


# --------------------------------------------------------------------------
# Main program
# --------------------------------------------------------------------------
def write_words(words: list[str], path: Path = WORDS_OUT) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # newline="\n": Unix line endings even on Windows, so the file is the same everywhere.
    path.write_text("\n".join(words) + "\n", encoding="utf-8", newline="\n")


def describe_puzzle(puzzle: Puzzle, answers: list[str]) -> str:
    points = sum(map(word_points, answers))
    pangrams = [w for w in answers if is_pangram(w)]
    others = " ".join(ch.upper() for ch in puzzle.letters if ch != puzzle.center)
    return (
        f"center {puzzle.center.upper()}, other letters {others}: "
        f"{len(answers)} words, {points} points, pangrams: {', '.join(pangrams)}"
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--new-schedule",
        action="store_true",
        help="replace the whole puzzle schedule (changes today's puzzle for everyone!)",
    )
    parser.add_argument(
        "--start",
        type=date.fromisoformat,
        default=None,
        help="first day of a new schedule, YYYY-MM-DD (default: today)",
    )
    args = parser.parse_args(argv)
    today = date.today()

    # 1. Words
    kotus = read_kotus()
    result = build_word_list(kotus, read_word_file(WORDS_ADDED), read_word_file(WORDS_REMOVED))
    print(f"Kotus list: {result.accepted_entries} usable single words. Left out:")
    for reason, count in result.rejected.most_common():
        print(f"  {count:6}  {reason}")
    print(f"words_added.txt added {result.added}, words_removed.txt removed {result.removed}.")
    for word in result.invalid_additions:
        print(f"  WARNING: ignored '{word}' in words_added.txt (not a single lowercase word)")
    for word in result.unknown_removals:
        print(f"  note: '{word}' in words_removed.txt is not in the word list (typo?)")
    write_words(result.words)
    print(
        f"Wrote {len(result.words)} playable words to {WORDS_OUT.relative_to(ROOT)} "
        f"(at least {MIN_WORD_LENGTH} letters, at most {LETTERS_PER_PUZZLE} different letters)."
    )

    # 2. Puzzle schedule
    index = WordIndex(result.words)
    cached: list[Puzzle] = []

    def new_puzzles() -> list[Puzzle]:
        if not cached:
            cached.extend(find_good_puzzles(index, load_word_info(result.words, kotus)))
            print(f"Found {len(cached)} good puzzles.")
        return cached

    existing = None if args.new_schedule else load_schedule()
    if existing is None:
        schedule = Schedule(epoch=args.start or today, puzzles=new_puzzles())
        if not schedule.puzzles:
            sys.exit("ERROR: no puzzle satisfies the quality rules. Loosen them at the top of this script.")
        print(f"Created a new schedule of {len(schedule.puzzles)} puzzles starting {schedule.epoch}.")
    else:
        update = update_schedule(existing, index, today, new_puzzles)
        schedule = update.schedule
        for position, old, new in update.replaced:
            print(f"Replaced puzzle {position} ({old}) with {new}: it no longer had enough words or a pangram.")
        if update.appended:
            print(f"Added {update.appended} new puzzles to the end of the schedule.")
        if not update.replaced and not update.appended:
            print("The puzzle schedule did not need changes.")

    save_schedule(schedule)
    days_left = len(schedule.puzzles) - (today - schedule.epoch).days
    print(
        f"Wrote {len(schedule.puzzles)} puzzles to {PUZZLES_OUT.relative_to(ROOT)} "
        f"(about {days_left / 365:.1f} years of new puzzles left before they repeat)."
    )
    todays = schedule.puzzle_for(today)
    print(f"Today's puzzle: {describe_puzzle(todays, index.answers(todays))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
