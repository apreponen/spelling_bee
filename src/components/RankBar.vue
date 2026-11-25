<script setup lang="ts">
// The progress bar: current rank, one dot per rank, and the score.
import { computed } from "vue";
import { QUEEN_RANK, RANKS } from "../game/logic";
import { TEXTS, pointCount } from "../texts";

const props = defineProps<{ score: number; rank: number; queen: boolean }>();
defineEmits<{ open: [] }>();

const name = computed(() => (props.queen ? QUEEN_RANK : RANKS[props.rank].name));
const position = (index: number) => `${(index / (RANKS.length - 1)) * 100}%`;
</script>

<template>
  <button
    type="button"
    class="rankbar"
    @mousedown.prevent
    :aria-label="`${TEXTS.rankLabel}: ${name}, ${pointCount(score)}. ${TEXTS.titles.ranks}`"
    @click="$emit('open')">
    <span class="rank-name">{{ name }}</span>
    <span class="track" aria-hidden="true">
      <span class="line" />
      <span class="line filled" :style="{ width: position(rank) }" />
      <span
        v-for="(item, index) in RANKS"
        :key="item.name"
        class="dot"
        :class="{ reached: index <= rank, current: index === rank, last: index === RANKS.length - 1 }"
        :style="{ left: position(index) }">
        <span v-if="index === rank" class="score">{{ score }}</span>
      </span>
    </span>
  </button>
</template>

<style scoped>
.rankbar {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 12px 4px;
  border: none;
  background: none;
  color: var(--text);
  font: inherit;
  cursor: pointer;
  text-align: left;
}
.rank-name {
  font-weight: 700;
  min-width: 6.5em;
  white-space: nowrap;
}
.track {
  position: relative;
  flex: 1;
  height: 32px;
  margin: 0 14px;
}
.line {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  margin-top: -1px;
  background: var(--border);
}
.line.filled {
  right: auto;
  background: var(--honey);
  transition: width 400ms ease;
}
.dot {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  margin: -5px 0 0 -5px;
  border-radius: 50%;
  background: var(--border);
  transition: all 300ms ease;
}
.dot.last {
  border-radius: 2px;
}
.dot.reached {
  background: var(--honey);
}
.dot.current {
  width: 32px;
  height: 32px;
  margin: -16px 0 0 -16px;
  display: grid;
  place-items: center;
}
.dot.current.last {
  border-radius: 8px;
}
.score {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--on-honey);
}
@media (max-height: 700px) and (max-width: 859px) {
  .rankbar {
    padding: 6px 4px;
  }
}
</style>
