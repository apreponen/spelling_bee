<script setup lang="ts">
// The seven letters of a puzzle in a row, center letter first and highlighted.
defineProps<{ center: string; letters: string[] }>();
</script>

<template>
  <p class="letter-row" :aria-label="`Kirjaimet: ${letters.join(', ').toUpperCase()}`">
    <span class="center">{{ center.toUpperCase() }}</span>
    <span v-for="letter in letters.filter((l) => l !== center)" :key="letter">{{ letter.toUpperCase() }}</span>
  </p>
</template>

<style scoped>
.letter-row {
  display: flex;
  gap: 6px;
  margin: 0 0 12px;
}
.letter-row span {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: var(--cell);
  font-weight: 700;
}
.letter-row .center {
  background: var(--honey);
  color: var(--on-honey);
}
</style>
