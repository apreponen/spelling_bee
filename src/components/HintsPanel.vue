<script setup lang="ts">
// Hints: totals, a grid of words by first letter and length, and the
// first two letters of every word. The numbers count words not yet found.
import { computed } from "vue";
import LetterRow from "./LetterRow.vue";
import {
  hintGrid,
  isPangram,
  isPerfectPangram,
  totalScore,
  twoLetterHints,
  type HintCell,
  type Puzzle,
} from "../game/logic";
import { pointCount, wordCount } from "../texts";

const props = defineProps<{ puzzle: Puzzle; found: string[] }>();

const grid = computed(() => hintGrid(props.puzzle.answers, props.found));
const twoLetters = computed(() => twoLetterHints(props.puzzle.answers, props.found));
const pangrams = computed(() => props.puzzle.answers.filter(isPangram));
const perfect = computed(() => pangrams.value.filter(isPerfectPangram).length);
const wordsLeft = computed(() => props.puzzle.answers.length - props.found.length);
const pointsLeft = computed(() => props.puzzle.maxScore - totalScore(props.found));

function show(cell: HintCell): string {
  if (cell.total === 0) return "·";
  if (cell.left === 0) return "✓";
  return String(cell.left);
}
function cellClass(cell: HintCell) {
  return { empty: cell.total === 0, done: cell.total > 0 && cell.left === 0 };
}
</script>

<template>
  <div class="hints">
    <LetterRow :center="puzzle.center" :letters="puzzle.letters" />
    <p class="totals">
      <span><b>{{ puzzle.answers.length }}</b> sanaa</span>
      <span><b>{{ puzzle.maxScore }}</b> pistettä</span>
      <span>
        <b>{{ pangrams.length }}</b> {{ pangrams.length === 1 ? "pangrammi" : "pangrammia" }}
        <template v-if="perfect">({{ perfect }} {{ perfect === 1 ? "täydellinen" : "täydellistä" }})</template>
      </span>
    </p>
    <p class="left">Löytämättä {{ wordCount(wordsLeft) }} ja {{ pointCount(pointsLeft) }}.</p>

    <h3>Alkukirjain ja pituus</h3>
    <p class="note">
      Taulukko kertoo, montako sanaa on vielä löytämättä. Rivit ovat sanan ensimmäinen kirjain ja sarakkeet
      sanan pituus. ✓ = kaikki löydetty.
    </p>
    <div class="table-wrap">
      <table class="grid">
        <thead>
          <tr>
            <th scope="col"></th>
            <th v-for="length in grid.lengths" :key="length" scope="col">{{ length }}</th>
            <th scope="col">Σ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in grid.rows" :key="row.letter">
            <th scope="row">{{ row.letter.toUpperCase() }}</th>
            <td v-for="(cell, i) in row.cells" :key="i" :class="cellClass(cell)">{{ show(cell) }}</td>
            <td class="sum" :class="cellClass(row.sum)">{{ show(row.sum) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Σ</th>
            <td v-for="(cell, i) in grid.columnSums" :key="i" class="sum" :class="cellClass(cell)">{{ show(cell) }}</td>
            <td class="sum" :class="cellClass(grid.sum)">{{ show(grid.sum) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <h3>Kaksi ensimmäistä kirjainta</h3>
    <div class="two-letter">
      <p v-for="group in twoLetters" :key="group.letter">
        <span v-for="item in group.prefixes" :key="item.prefix" :class="{ done: item.left === 0 }"
          >{{ item.prefix.toUpperCase() }}-{{ item.left }}</span
        >
      </p>
    </div>
  </div>
</template>

<style scoped>
.totals {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 0;
}
.left {
  margin: 4px 0 0;
  color: var(--muted);
}
h3 {
  margin: 20px 0 4px;
  font-size: 1rem;
}
.note {
  margin: 0 0 10px;
  font-size: 0.85rem;
  color: var(--muted);
}
.table-wrap {
  overflow-x: auto;
}
.grid {
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}
.grid th,
.grid td {
  min-width: 34px;
  padding: 5px 6px;
  text-align: center;
  border-bottom: 1px solid var(--border);
}
.grid thead th {
  color: var(--muted);
  font-weight: 600;
}
.grid tbody th,
.grid tfoot th {
  font-weight: 700;
}
.grid td {
  font-weight: 600;
}
.grid .sum {
  background: var(--hover);
}
.grid .empty {
  color: var(--border);
  font-weight: 400;
}
.grid .done {
  color: var(--success);
}
.two-letter p {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin: 0 0 6px;
  font-variant-numeric: tabular-nums;
}
.two-letter .done {
  color: var(--muted);
  text-decoration: line-through;
}
</style>
