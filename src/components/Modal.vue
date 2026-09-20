<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
defineProps<{ title: string }>();
const emit = defineEmits<{ close: [] }>();
const el = ref<HTMLDialogElement>();
let previous: HTMLElement | null = null;
onMounted(() => {
  previous = document.activeElement as HTMLElement;
  el.value?.showModal();
});
onBeforeUnmount(() => previous?.focus());
</script>
<template>
  <dialog
    ref="el"
    @cancel.prevent="emit('close')"
    @click="
      (e) => {
        if (e.target === el) emit('close');
      }
    "
  >
    <header class="modal-head">
      <h2>{{ title }}</h2>
      <button class="icon-button" aria-label="关闭弹窗" @click="emit('close')">
        ×
      </button>
    </header>
    <slot />
  </dialog>
</template>
