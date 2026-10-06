<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import Icon from "./Icon.vue";
defineProps<{ title: string; kind?: string }>();
const emit = defineEmits<{ close: [] }>();
const el = ref<HTMLDialogElement>();
const headingId = "dialog-" + crypto.randomUUID();
let previous: HTMLElement | null = null;
onMounted(() => {
  previous = document.activeElement as HTMLElement;
  el.value?.showModal();
});
onUnmounted(() => {
  const target = previous?.isConnected
    ? previous
    : document.querySelector<HTMLElement>(".editor-home,.nav-action");
  target?.focus({ preventScroll: true });
});
function backdrop(e: MouseEvent) {
  if (e.target !== el.value) return;
  const r = el.value!.getBoundingClientRect();
  if (
    e.clientX < r.left ||
    e.clientX > r.right ||
    e.clientY < r.top ||
    e.clientY > r.bottom
  )
    emit("close");
}
</script>
<template>
  <dialog
    ref="el"
    :class="kind ? 'dialog-' + kind : ''"
    :aria-labelledby="headingId"
    @cancel.prevent="emit('close')"
    @click="backdrop"
  >
    <header class="modal-head">
      <div>
        <span class="eyebrow">SHIYE / 拾页</span>
        <h2 :id="headingId">{{ title }}</h2>
      </div>
      <button
        type="button"
        class="icon-button"
        aria-label="关闭弹窗"
        @click="emit('close')"
      >
        <Icon name="close" :size="20" />
      </button>
    </header>
    <slot />
  </dialog>
</template>
