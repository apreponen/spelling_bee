<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import Celebration from "./components/Celebration.vue";
import FoundWords from "./components/FoundWords.vue";
import GuessDisplay from "./components/GuessDisplay.vue";
import HintsPanel from "./components/HintsPanel.vue";
import Hive from "./components/Hive.vue";
import HowToPlay from "./components/HowToPlay.vue";
import Modal from "./components/Modal.vue";
import RankBar from "./components/RankBar.vue";
import RanksPanel from "./components/RanksPanel.vue";
import YesterdayPanel from "./components/YesterdayPanel.vue";
import { GENIUS_INDEX, QUEEN_RANK, RANKS, TYPEABLE, formatDate, seededRandom, shuffled } from "./game/logic";
import { PROGRESS_KEY, useGame, type Celebration as CelebrationKind } from "./game/store";
import { TEXTS, praise } from "./texts";
import { currentTheme, setTheme, type Theme } from "./theme";

const game = useGame();
const { state, score, rank, isQueen } = game;

// Which pop-up window is open, if any.
type Panel = "help" | "hints" | "yesterday" | "ranks" | CelebrationKind;
const panel = ref<Panel | null>(null);

/** Show the Nero or Kuningatar celebration if one is due and no other window is open. */
function showDueCelebration() {
  const due = game.pendingCelebration();
  if (due && !panel.value) panel.value = due;
}

function closePanel() {
  if (panel.value === "nero" || panel.value === "queen") game.markCelebrated(panel.value);
  panel.value = null;
  showDueCelebration(); // e.g. one that had to wait while this window was open
}

// ----- The six outer letters, in the order they are shown -----
const outer = ref<string[]>([]);
const fading = ref(false);

watch(
  () => state.today,
  () => {
    // Same order every time the page is opened on the same day.
    const letters = state.puzzle.letters.filter((letter) => letter !== state.puzzle.center);
    outer.value = shuffled(letters, seededRandom(state.today));
  },
  { immediate: true },
);

function shuffle() {
  if (fading.value) return;
  fading.value = true;
  window.setTimeout(() => {
    outer.value = shuffled(outer.value);
    fading.value = false;
  }, 150);
}

// ----- Messages above the word ("Hyvä!", "Liian lyhyt", ...) -----
interface Toast {
  id: number;
  text: string;
  kind: "error" | "praise" | "pangram";
  points?: number;
}
const toast = ref<Toast | null>(null);
let toastTimer = 0;
let toastId = 0;

function showToast(message: Omit<Toast, "id">, duration: number) {
  window.clearTimeout(toastTimer);
  toast.value = { ...message, id: ++toastId };
  toastTimer = window.setTimeout(() => (toast.value = null), duration);
}

const shake = ref(false);
let rejectTimer = 0;

function submit() {
  const result = game.submit();
  if (!result) return;
  if (result.ok) {
    showToast(
      result.pangram
        ? { text: TEXTS.pangram, kind: "pangram", points: result.points }
        : { text: praise(result.points), kind: "praise", points: result.points },
      1600,
    );
    // Let the praise show first, then celebrate a new rank.
    if (game.pendingCelebration()) window.setTimeout(showDueCelebration, 900);
  } else {
    showToast({ text: TEXTS.errors[result.error], kind: "error" }, 1300);
    shake.value = false;
    requestAnimationFrame(() => (shake.value = true));
    window.clearTimeout(rejectTimer);
    rejectTimer = window.setTimeout(() => {
      shake.value = false;
      game.clearRejected();
    }, 700);
  }
}

// ----- Keyboard -----
function keyToLetter(event: KeyboardEvent): string | null {
  const key = event.key.toLowerCase();
  if (TYPEABLE.test(key)) return key;
  // On an English keyboard layout: the keys where Finnish keyboards have Ö and Ä.
  if (event.code === "Semicolon" && key === ";") return "ö";
  if (event.code === "Quote" && key === "'") return "ä";
  return null;
}

function onKeydown(event: KeyboardEvent) {
  if (panel.value || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest("input, textarea, select, [contenteditable]")) return;
  // Enter and Space may press a focused button, but only while no word is being typed.
  const onControl = target?.closest("button, a") != null && state.guess === "";

  switch (event.key) {
    case "Enter":
      if (onControl) return; // let Enter press the focused button
      event.preventDefault();
      submit();
      return;
    case " ":
      if (onControl) return;
      event.preventDefault();
      shuffle();
      return;
    case "Backspace":
    case "Delete":
      event.preventDefault();
      game.deleteLetter();
      return;
    case "Escape":
      game.clearGuess();
      return;
  }
  const letter = keyToLetter(event);
  if (letter) {
    event.preventDefault();
    game.typeLetter(letter);
  }
}

// ----- Theme -----
const theme = ref<Theme>("light");
function toggleTheme() {
  theme.value = theme.value === "dark" ? "light" : "dark";
  setTheme(theme.value);
}

// ----- New day, other tabs -----
function onVisibilityChange() {
  if (document.visibilityState === "visible") game.refreshIfNewDay();
}
function onStorage(event: StorageEvent) {
  if (event.key === PROGRESS_KEY) game.syncFromStorage();
}
let dayTimer = 0;

onMounted(() => {
  theme.value = currentTheme();
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("storage", onStorage);
  document.addEventListener("visibilitychange", onVisibilityChange);
  dayTimer = window.setInterval(() => game.refreshIfNewDay(), 60_000);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("storage", onStorage);
  document.removeEventListener("visibilitychange", onVisibilityChange);
  window.clearInterval(dayTimer);
  window.clearTimeout(toastTimer);
  window.clearTimeout(rejectTimer);
});
</script>

<template>
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <svg class="logo" viewBox="-52 -46 104 92" aria-hidden="true">
          <polygon points="52,0 26,45 -26,45 -52,0 -26,-45 26,-45" />
        </svg>
        <div>
          <h1>{{ TEXTS.appName }}</h1>
          <p class="date">
            <span class="long">{{ formatDate(state.today) }}</span>
            <span class="short">{{ formatDate(state.today, true) }}</span>
          </p>
        </div>
      </div>
      <nav class="menu" aria-label="Valikko">
        <!-- @mousedown.prevent: a click doesn't leave focus on the button, so Enter keeps submitting words -->
        <button
          type="button"
          class="menu-button"
          @mousedown.prevent
          :title="TEXTS.menu.help"
          @click="panel = 'help'">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9.5" />
            <path d="M9.4 9.3a2.7 2.7 0 1 1 3.7 2.5c-.7.3-1.1.9-1.1 1.6v.6" />
            <circle class="fill" cx="12" cy="17.2" r="1.1" />
          </svg>
          <span>{{ TEXTS.menu.help }}</span>
        </button>
        <button
          type="button"
          class="menu-button"
          @mousedown.prevent
          :title="TEXTS.menu.hints"
          @click="panel = 'hints'">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
          </svg>
          <span>{{ TEXTS.menu.hints }}</span>
        </button>
        <button
          type="button"
          class="menu-button"
          @mousedown.prevent
          :title="TEXTS.menu.yesterday"
          :disabled="!state.yesterday"
          @click="panel = 'yesterday'">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
            <path d="M3.5 10h17M8 3v4M16 3v4" />
          </svg>
          <span>{{ TEXTS.menu.yesterday }}</span>
        </button>
        <button
          type="button"
          class="menu-button"
          @mousedown.prevent
          :title="theme === 'dark' ? TEXTS.menu.lightTheme : TEXTS.menu.darkTheme"
          :aria-label="theme === 'dark' ? TEXTS.menu.lightTheme : TEXTS.menu.darkTheme"
          @click="toggleTheme">
          <svg v-if="theme === 'dark'" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
          </svg>
        </button>
      </nav>
    </header>

    <main class="game">
      <div class="status">
        <RankBar :score="score" :rank="rank" :queen="isQueen" @open="panel = 'ranks'" />
        <FoundWords :found="state.found" />
      </div>

      <div class="play">
        <div class="input-area">
          <Transition name="toast">
            <div v-if="toast" :key="toast.id" class="toast" :class="toast.kind" role="status">
              {{ toast.text }}<span v-if="toast.points" class="toast-points">+{{ toast.points }}</span>
            </div>
          </Transition>
          <GuessDisplay
            :guess="state.guess"
            :center="state.puzzle.center"
            :letters="state.puzzle.letters"
            :shake="shake" />
        </div>

        <Hive :center="state.puzzle.center" :outer="outer" :fading="fading" @letter="game.typeLetter" />

        <div class="controls">
          <button type="button" class="control" @mousedown.prevent @click="game.deleteLetter()">
            {{ TEXTS.controls.delete }}
          </button>
          <button
            type="button"
            class="control round"
            :title="TEXTS.controls.shuffle"
            :aria-label="TEXTS.controls.shuffle"
            @mousedown.prevent
            @click="shuffle">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4" />
            </svg>
          </button>
          <button type="button" class="control" @mousedown.prevent @click="submit">
            {{ TEXTS.controls.enter }}
          </button>
        </div>
      </div>
    </main>

    <Modal v-if="panel === 'help'" :title="TEXTS.titles.help" @close="closePanel">
      <HowToPlay />
    </Modal>
    <Modal v-else-if="panel === 'hints'" :title="TEXTS.titles.hints" wide @close="closePanel">
      <HintsPanel :puzzle="state.puzzle" :found="state.found" />
    </Modal>
    <Modal v-else-if="panel === 'yesterday' && state.yesterday" :title="TEXTS.titles.yesterday" @close="closePanel">
      <YesterdayPanel :puzzle="state.yesterday.puzzle" :found="state.yesterday.found" />
    </Modal>
    <Modal v-else-if="panel === 'ranks'" :title="TEXTS.titles.ranks" @close="closePanel">
      <RanksPanel :max-score="state.puzzle.maxScore" :score="score" :rank="rank" :queen="isQueen" />
    </Modal>
    <Modal
      v-else-if="panel === 'nero' || panel === 'queen'"
      :title="panel === 'queen' ? `${QUEEN_RANK}!` : `${RANKS[GENIUS_INDEX].name}!`"
      @close="closePanel">
      <Celebration :kind="panel" :score="score" :words="state.found.length" />
    </Modal>
  </div>
</template>
