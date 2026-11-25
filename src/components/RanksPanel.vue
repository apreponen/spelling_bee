<script setup lang="ts">
// The ranks and how many points each one needs today.
// The top rank for finding every word (Kuningatar) is a secret: it is not listed here.
import { computed } from "vue";
import { rankThresholds } from "../game/logic";
import { pointCount } from "../texts";

const props = defineProps<{ maxScore: number; score: number; rank: number; queen: boolean }>();

const thresholds = computed(() => rankThresholds(props.maxScore));
const next = computed(() => thresholds.value[props.rank + 1] ?? null);
</script>

<template>
  <div class="ranks">
    <p>
      Taso nousee sitä mukaa kuin keräät pisteitä. Rajat lasketaan joka päivä sen mukaan, paljonko kennosta
      voi saada pisteitä.
    </p>
    <table>
      <thead>
        <tr>
          <th scope="col">Taso</th>
          <th scope="col">Pisteitä</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in thresholds"
          :key="item.name"
          :class="{ current: index === rank, reached: score >= item.minScore }">
          <td>{{ item.name }}</td>
          <td>{{ item.minScore }}</td>
        </tr>
      </tbody>
    </table>
    <p>
      Sinulla on {{ pointCount(score) }}.
      <template v-if="queen">Löysit kaikki päivän sanat!</template>
      <template v-else-if="next">Tasolle {{ next.name }} tarvitset vielä {{ pointCount(next.minScore - score) }}.</template>
    </p>
  </div>
</template>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}
th,
td {
  padding: 7px 10px;
  border-bottom: 1px solid var(--border);
  text-align: left;
}
th:last-child,
td:last-child {
  text-align: right;
}
thead th {
  color: var(--muted);
  font-weight: 600;
}
.reached td:first-child::before {
  content: "✓ ";
  color: var(--success);
}
.current {
  background: var(--honey);
  color: var(--on-honey);
  font-weight: 700;
}
.current td:first-child::before {
  color: inherit;
}
</style>
