<script setup lang="ts">
// Yesterday's puzzle with all of its answers. Words the player found are
// ticked and pangrams are bold.
import { computed } from "vue";
import LetterRow from "./LetterRow.vue";
import { formatDate, isPangram, type Puzzle } from "../game/logic";

const props = defineProps<{ puzzle: Puzzle; found: string[] }>();
const foundSet = computed(() => new Set(props.found));
</script>

<template>
  <div class="yesterday">
    <p class="date">{{ formatDate(puzzle.date) }}</p>
    <LetterRow :center="puzzle.center" :letters="puzzle.letters" />
    <p v-if="found.length">Löysit {{ found.length }} / {{ puzzle.answers.length }} sanaa.</p>
    <p v-else>Sanoja oli {{ puzzle.answers.length }}.</p>
    <ul class="answers">
      <li
        v-for="word in puzzle.answers"
        :key="word"
        :class="{ pangram: isPangram(word), found: foundSet.has(word) }">
        <span class="tick" aria-hidden="true">{{ foundSet.has(word) ? "✓" : "" }}</span>
        <span>{{ word }}</span>
        <span v-if="foundSet.has(word)" class="visually-hidden">(löysit)</span>
      </li>
    </ul>
    <p class="note">Lihavoidut sanat ovat pangrammeja. ✓ = löysit sanan.</p>
  </div>
</template>

<style scoped>
.date {
  margin: 0 0 10px;
  color: var(--muted);
}
.answers {
  list-style: none;
  margin: 12px 0;
  padding: 0;
  columns: 2;
  column-gap: 24px;
}
@media (min-width: 520px) {
  .answers {
    columns: 3;
  }
}
.answers li {
  display: flex;
  gap: 6px;
  padding: 3px 0;
  break-inside: avoid;
  text-transform: capitalize;
}
.tick {
  width: 1em;
  color: var(--success);
  flex: none;
}
.pangram {
  font-weight: 700;
}
.note {
  font-size: 0.85rem;
  color: var(--muted);
}
</style>
