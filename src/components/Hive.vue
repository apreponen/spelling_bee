<script setup lang="ts">
// The honeycomb: the center letter and six letters around it, drawn as SVG.
import { computed } from "vue";

const props = defineProps<{ center: string; outer: string[]; fading?: boolean }>();
const emit = defineEmits<{ letter: [letter: string] }>();

// Flat-topped hexagon with corners 52 units from its middle.
const R = 52;
const H = (R * Math.sqrt(3)) / 2;
const GAP = 1.08; // a little space between the cells
const HEXAGON = [
  [R, 0],
  [R / 2, H],
  [-R / 2, H],
  [-R, 0],
  [-R / 2, -H],
  [R / 2, -H],
]
  .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
  .join(" ");
// Middles of the six outer cells, clockwise from the top.
const OUTER_POSITIONS = [
  [0, -2 * H],
  [1.5 * R, -H],
  [1.5 * R, H],
  [0, 2 * H],
  [-1.5 * R, H],
  [-1.5 * R, -H],
].map(([x, y]) => [x * GAP, y * GAP]);

const cells = computed(() => [
  { letter: props.center, x: 0, y: 0, center: true },
  ...props.outer.map((letter, i) => ({
    letter,
    x: OUTER_POSITIONS[i][0],
    y: OUTER_POSITIONS[i][1],
    center: false,
  })),
]);
</script>

<template>
  <svg class="hive" viewBox="-146 -152 292 304" role="group" aria-label="Kirjaimet">
    <g
      v-for="(cell, index) in cells"
      :key="index"
      class="cell"
      :class="{ center: cell.center, fading: fading && !cell.center }"
      :transform="`translate(${cell.x.toFixed(1)} ${cell.y.toFixed(1)})`"
      role="button"
      :aria-label="cell.letter.toUpperCase()"
      @click="emit('letter', cell.letter)">
      <polygon class="hexagon" :points="HEXAGON" />
      <text class="label" text-anchor="middle" dominant-baseline="central">{{ cell.letter.toUpperCase() }}</text>
    </g>
  </svg>
</template>

<style scoped>
.hive {
  display: block;
  width: min(100%, 340px);
  margin: 0 auto;
  user-select: none;
  -webkit-user-select: none;
  overflow: visible;
}
.cell {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.hexagon {
  fill: var(--cell);
  transition:
    transform 100ms ease,
    fill 100ms ease;
  transform-box: fill-box;
  transform-origin: center;
}
.cell:hover .hexagon {
  fill: var(--cell-hover);
}
.center .hexagon,
.center:hover .hexagon {
  fill: var(--honey);
}
.cell:active .hexagon {
  transform: scale(0.93);
}
.label {
  font-size: 38px;
  font-weight: 700;
  fill: var(--text);
  pointer-events: none;
  transition: opacity 150ms ease;
}
.center .label {
  fill: var(--on-honey);
}
.fading .label {
  opacity: 0;
}
/* Shorter phone screens get a smaller hive so everything fits. */
@media (max-height: 760px) and (max-width: 859px) {
  .hive {
    width: min(100%, 290px);
  }
}
@media (max-height: 640px) and (max-width: 859px) {
  .hive {
    width: min(100%, 225px);
  }
}
</style>
