"""Tests for the data scripts. Run from the repository root with:  python -m pytest"""

from datetime import date

import pytest

import build_data as bd


@pytest.mark.parametrize(
    "headword",
    ["ennen kuin", "ala-", "-inen", "keski-ikä", "ALV", "3D-tulostin", "moulinélanka", "hmm"],
)
def test_rejects_phrases_affixes_abbreviations_and_odd_characters(headword):
    assert bd.rejection_reason(headword) is not None


@pytest.mark.parametrize("headword", ["talo", "juosta", "sähköisku", "häät", "yllä"])
def test_accepts_ordinary_words(headword):
    assert bd.rejection_reason(headword) is None


def test_playable_words_are_long_enough_and_use_at_most_seven_puzzle_letters():
    assert bd.is_playable("talo")
    assert not bd.is_playable("isä")  # too short
    assert not bd.is_playable("kirjasto")  # 8 different letters
    assert not bd.is_playable("baari")  # b is not used in puzzles


def test_word_points():
    assert bd.word_points("talo") == 1
    assert bd.word_points("kissa") == 5
    assert bd.word_points("sähköisku") == 9 + 7  # pangram bonus


def test_finnish_alphabetical_order():
    words = ["öljy", "äiti", "zeta", "auto", "åbo"]
    assert sorted(words, key=bd.finnish_sort_key) == ["auto", "zeta", "åbo", "äiti", "öljy"]


def test_build_word_list_applies_additions_and_removals():
    result = bd.build_word_list(
        ["talo", "talo", "ennen kuin", "kissa", "ryssä", "ala"],
        added=["somettaa"],
        removed=["ryssä", "eiole"],
    )
    assert result.words == ["kissa", "somettaa", "talo"]
    assert result.added == 1
    assert result.removed == 1
    assert result.unknown_removals == ["eiole"]


def test_answers_must_contain_the_center_and_only_puzzle_letters():
    index = bd.WordIndex(["sähköisku", "sähkö", "äkki", "hiki", "kiuas", "kissa"])
    puzzle = bd.Puzzle.parse("ä:hiksuäö")
    assert index.answers(puzzle) == ["sähkö", "sähköisku", "äkki"]


def test_puzzle_text_format_round_trips():
    puzzle = bd.Puzzle.parse("ä:öäuskih")
    assert puzzle.letters == "hiksuäö"
    assert str(puzzle) == "ä:hiksuäö"
    with pytest.raises(ValueError):
        bd.Puzzle.parse("x:hiksuäö")  # center is not one of the letters


def test_update_schedule_replaces_only_unplayable_puzzles(monkeypatch):
    monkeypatch.setattr(bd, "MIN_ANSWERS_TO_KEEP", 1)
    index = bd.WordIndex(["sähköisku", "sähkö", "kaniini", "kannel", "kaneli"])
    good = bd.Puzzle.parse("ä:hiksuäö")  # has the pangram "sähköisku"
    broken = bd.Puzzle.parse("n:aeiklnt")  # no pangram in this word list
    new = bd.Puzzle.parse("s:hiksuäö")
    schedule = bd.Schedule(date(2026, 1, 1), [good, broken])

    update = bd.update_schedule(schedule, index, date(2026, 1, 1), new_puzzles=lambda: [good, new])

    assert update.schedule.puzzles[:2] == [good, new]
    assert update.replaced == [(1, broken, new)]


def test_update_schedule_does_not_need_new_puzzles_when_nothing_changes(monkeypatch):
    monkeypatch.setattr(bd, "MIN_ANSWERS_TO_KEEP", 1)
    monkeypatch.setattr(bd, "MIN_FUTURE_DAYS", 1)
    index = bd.WordIndex(["sähköisku"])
    puzzle = bd.Puzzle.parse("ä:hiksuäö")
    schedule = bd.Schedule(date(2026, 1, 1), [puzzle, bd.Puzzle.parse("s:hiksuäö")])

    def fail():
        raise AssertionError("should not look for new puzzles")

    update = bd.update_schedule(schedule, index, date(2026, 1, 1), new_puzzles=fail)
    assert update.replaced == [] and update.appended == 0


def test_update_schedule_tops_up_when_running_out(monkeypatch):
    monkeypatch.setattr(bd, "MIN_ANSWERS_TO_KEEP", 1)
    monkeypatch.setattr(bd, "MIN_FUTURE_DAYS", 10)
    index = bd.WordIndex(["sähköisku"])
    first = bd.Puzzle.parse("ä:hiksuäö")
    extra = [bd.Puzzle.parse("s:hiksuäö"), bd.Puzzle.parse("k:hiksuäö")]
    schedule = bd.Schedule(date(2026, 1, 1), [first])

    update = bd.update_schedule(schedule, index, date(2026, 1, 1), new_puzzles=lambda: [first, *extra])
    assert update.schedule.puzzles == [first, *extra]
    assert update.appended == 2


def test_schedule_repeats_after_the_last_puzzle():
    puzzles = [bd.Puzzle.parse("ä:hiksuäö"), bd.Puzzle.parse("s:hiksuäö")]
    schedule = bd.Schedule(date(2026, 1, 1), puzzles)
    assert schedule.puzzle_for(date(2026, 1, 2)) == puzzles[1]
    assert schedule.puzzle_for(date(2026, 1, 3)) == puzzles[0]


# --- Checks on the generated files in src/data/ ---------------------------------


@pytest.fixture(scope="module")
def generated_words():
    return bd.WORDS_OUT.read_text(encoding="utf-8").splitlines()


def test_generated_word_list_is_clean(generated_words):
    assert b"\r" not in bd.WORDS_OUT.read_bytes(), "words.txt must use Unix line endings"
    assert generated_words == sorted(set(generated_words), key=bd.finnish_sort_key)
    assert all(bd.is_playable(w) for w in generated_words)
    removed = set(bd.read_word_file(bd.WORDS_REMOVED))
    assert not removed & set(generated_words)


def test_every_scheduled_puzzle_is_playable(generated_words):
    schedule = bd.load_schedule()
    index = bd.WordIndex(generated_words)
    assert len(set(schedule.puzzles)) == len(schedule.puzzles), "duplicate puzzles"
    unplayable = [str(p) for p in schedule.puzzles if not bd.is_playable_puzzle(index.answers(p))]
    assert unplayable == []


def test_game_rules_match_the_web_app():
    logic = (bd.ROOT / "src" / "game" / "logic.ts").read_text(encoding="utf-8")
    assert f"MIN_WORD_LENGTH = {bd.MIN_WORD_LENGTH};" in logic
    assert f"LETTERS_PER_PUZZLE = {bd.LETTERS_PER_PUZZLE};" in logic
    assert f"PANGRAM_BONUS = {bd.PANGRAM_BONUS};" in logic
