<script setup lang="ts">
// The word being typed. The center letter is highlighted and letters that
// are not in the hive are greyed out.
import { computed } from "vue";

const props = defineProps<{ guess: string; center: string; letters: string[]; shake: boolean }>();

const size = computed(() => {
  const length = props.guess.length;
  if (length > 20) return "small";
  if (length > 13) return "medium";
  return "large";
});
</script>

<template>
  <div class="guess" :class="[size, { shake }]" aria-live="polite" :aria-label="guess || undefined">
    <span
      v-for="(letter, index) in guess"
      :key="index"
      :class="{ center: letter === center, invalid: !letters.includes(letter) }"
      >{{ letter.toUpperCase() }}</span
    ><span class="caret" aria-hidden="true" />
  </div>
</template>

<style scoped>
.guess {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 56px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.large {
  font-size: 2rem;
}
.medium {
  font-size: 1.5rem;
}
.small {
  font-size: 1.1rem;
}
.center {
  color: var(--honey-text);
}
.invalid {
  color: var(--muted);
  opacity: 0.6;
}
.caret {
  display: inline-block;
  width: 2px;
  height: 1.1em;
  margin-left: 2px;
  background: var(--honey-text);
  animation: blink 1s step-end infinite;
}
.shake {
  animation: shake 400ms ease;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}
@keyframes shake {
  20%,
  60% {
    transform: translateX(-8px);
  }
  40%,
  80% {
    transform: translateX(8px);
  }
}
@media (max-height: 700px) and (max-width: 859px) {
  .guess {
    min-height: 44px;
  }
  .large {
    font-size: 1.7rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .shake,
  .caret {
    animation: none;
  }
}
</style>
