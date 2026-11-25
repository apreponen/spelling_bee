<script setup lang="ts">
// The list of found words. On phones it is a bar that opens into a list;
// on wide screens the list is always shown next to the hive.
import { computed, ref } from "vue";
import { isPangram, sortFinnish } from "../game/logic";
import { TEXTS, foundWordsTitle } from "../texts";

const props = defineProps<{ found: string[] }>();
const open = ref(false);

const newestFirst = computed(() => [...props.found].reverse());
const alphabetical = computed(() => sortFinnish(props.found));
const title = computed(() => foundWordsTitle(props.found.length));
</script>

<template>
  <section class="found" :class="{ open }">
    <button type="button" class="summary" :aria-expanded="open" @mousedown.prevent @click="open = !open">
      <span v-if="open" class="summary-text">{{ title }}</span>
      <span v-else-if="found.length === 0" class="summary-text muted">{{ TEXTS.yourWords }}</span>
      <span v-else class="summary-text recent">
        <span v-for="word in newestFirst" :key="word" :class="{ pangram: isPangram(word) }">{{ word }}</span>
      </span>
      <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
    </button>
    <div class="list-area">
      <h2 class="list-title">{{ title }}</h2>
      <ul class="word-list">
        <li v-for="word in alphabetical" :key="word" :class="{ pangram: isPangram(word) }">{{ word }}</li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.found {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
}
.summary {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  padding: 8px 12px 8px 16px;
  border: none;
  background: none;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.summary-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.recent span {
  text-transform: capitalize;
}
.recent span + span::before {
  content: " ";
}
.muted {
  color: var(--muted);
}
.chevron {
  width: 22px;
  height: 22px;
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 200ms ease;
}
.open .chevron {
  transform: rotate(180deg);
}
.list-area {
  display: none;
  padding: 0 16px 16px;
}
.open .list-area {
  display: block;
}
.list-title {
  display: none;
  margin: 0 0 12px;
  font-size: 1rem;
  font-weight: 600;
}
.word-list {
  list-style: none;
  margin: 0;
  padding: 0;
  columns: 2;
  column-gap: 24px;
  max-height: 55vh;
  overflow-y: auto;
}
.word-list li {
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
  text-transform: capitalize;
  break-inside: avoid;
}
.pangram {
  font-weight: 700;
}
.word-list .pangram {
  text-decoration: underline 3px var(--honey);
  text-underline-offset: 3px;
}

/* Wide screens: always show the full list. */
@media (min-width: 860px) {
  .summary {
    display: none;
  }
  .list-area {
    display: block;
    padding-top: 16px;
    min-height: 420px;
  }
  .list-title {
    display: block;
  }
  .word-list {
    columns: 3;
    max-height: 60vh;
  }
}
</style>
