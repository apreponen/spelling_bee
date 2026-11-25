<script setup lang="ts">
// A pop-up window built on the browser's own <dialog> element, which takes
// care of keyboard focus and closing with the Esc key.
import { onMounted, onUnmounted, ref } from "vue";
import { TEXTS } from "../texts";

defineProps<{ title: string; wide?: boolean }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement | null>(null);
let focusedBefore: HTMLElement | null = null;

onMounted(() => {
  focusedBefore = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const el = dialog.value;
  if (!el) return;
  if (typeof el.showModal === "function") el.showModal();
  else el.setAttribute("open", "");
});

// Put keyboard focus back where it was (e.g. on the menu button that opened this).
onUnmounted(() => {
  if (focusedBefore && focusedBefore !== document.body && focusedBefore.isConnected) focusedBefore.focus();
});

// A click on the dimmed background lands on the <dialog> element itself.
function onClick(event: MouseEvent) {
  if (event.target === dialog.value) emit("close");
}
</script>

<template>
  <dialog
    ref="dialog"
    class="modal"
    :class="{ wide }"
    :aria-label="title"
    @cancel.prevent="emit('close')"
    @close="emit('close')"
    @click="onClick">
    <div class="modal-box">
      <header class="modal-header">
        <h2>{{ title }}</h2>
        <button type="button" class="modal-close" :aria-label="TEXTS.close" @click="emit('close')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </header>
      <div class="modal-body">
        <slot />
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.modal {
  border: none;
  padding: 0;
  background: transparent;
  color: var(--text);
  width: min(560px, calc(100vw - 24px));
  max-height: calc(100dvh - 32px);
}
.modal.wide {
  width: min(720px, calc(100vw - 24px));
}
.modal::backdrop {
  background: rgb(0 0 0 / 0.45);
}
.modal-box {
  background: var(--surface);
  border-radius: 16px;
  box-shadow: 0 12px 40px rgb(0 0 0 / 0.25);
  max-height: calc(100dvh - 32px);
  display: flex;
  flex-direction: column;
  animation: pop-in 160ms ease-out;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 16px 8px 20px;
}
.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
}
.modal-close {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  flex: none;
}
.modal-close:hover {
  background: var(--hover);
}
.modal-close svg {
  width: 22px;
  height: 22px;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}
.modal-body {
  padding: 4px 20px 20px;
  overflow-y: auto;
  line-height: 1.5;
}
@keyframes pop-in {
  from {
    transform: translateY(8px) scale(0.98);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .modal-box {
    animation: none;
  }
}
</style>
