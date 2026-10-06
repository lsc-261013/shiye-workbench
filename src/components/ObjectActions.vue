<script setup lang="ts">
defineProps<{
  busy: boolean;
  canBack: boolean;
  canForward: boolean;
  isText?: boolean;
}>();
defineEmits<{ duplicate: []; remove: []; layer: [direction: number] }>();
</script>
<template>
  <details class="object-menu">
    <summary aria-label="对象与图层操作">更多</summary>
    <div>
      <button :disabled="busy" @click="$emit('duplicate')">复制对象</button>
      <button :disabled="busy || !canBack" @click="$emit('layer', -1)">
        后移一层
      </button>
      <button :disabled="busy || !canForward" @click="$emit('layer', 1)">
        前移一层
      </button>
      <button :disabled="busy" class="danger-text" @click="$emit('remove')">
        {{ isText ? "删除文字" : "从画板移除 · 保留素材" }}
      </button>
    </div>
  </details>
</template>
