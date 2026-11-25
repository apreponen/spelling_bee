<script setup lang="ts">
// Shown once when the player reaches the "Nero" rank and once when they find every word.
import type { Celebration } from "../game/store";
import { pointCount, wordCount } from "../texts";

defineProps<{ kind: Celebration; score: number; words: number }>();
</script>

<template>
  <div class="celebration">
    <div class="honeycombs" aria-hidden="true">
      <span v-for="i in 12" :key="i" :style="{ '--i': i }" />
    </div>
    <p class="emoji" aria-hidden="true">{{ kind === "queen" ? "👑" : "🐝" }}</p>
    <p v-if="kind === 'queen'">
      Löysit kaikki päivän sanat ({{ wordCount(words) }}, {{ pointCount(score) }}). Olet kennon kuningatar!
    </p>
    <p v-else>Saavutit Nero-tason ({{ pointCount(score) }}). Löydätkö vielä loputkin sanat?</p>
  </div>
</template>

<style scoped>
.celebration {
  position: relative;
  text-align: center;
  overflow: hidden;
  padding-top: 8px;
}
.emoji {
  font-size: 3.5rem;
  margin: 0;
  line-height: 1.2;
}
.honeycombs span {
  position: absolute;
  top: -20px;
  left: calc(var(--i) * 8%);
  width: 14px;
  height: 12px;
  background: var(--honey);
  clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%);
  animation: fall 2.2s ease-in calc(var(--i) * 90ms) 2 both;
  opacity: 0.9;
}
@keyframes fall {
  to {
    transform: translateY(220px) rotate(240deg);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .honeycombs {
    display: none;
  }
}
</style>
