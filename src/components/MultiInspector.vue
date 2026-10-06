<script setup lang="ts">
import type { Alignment } from "../lib/alignment";
defineProps<{ count: number; busy: boolean }>();
defineEmits<{ align: [action: Alignment]; close: [] }>();
const operations: { label: string; value: Alignment }[] = [
  { label: "左对齐", value: "left" },
  { label: "水平居中", value: "center" },
  { label: "右对齐", value: "right" },
  { label: "顶部对齐", value: "top" },
  { label: "垂直居中", value: "middle" },
  { label: "底部对齐", value: "bottom" },
];
</script>
<template>
  <section class="note-panel" aria-label="多个对象对齐">
    <header class="note-panel-heading">
      <h2>已选 {{ count }} 个对象</h2>
      <button @click="$emit('close')">取消多选</button>
    </header>
    <p class="context-help">
      Shift点选增减选择。以选区边界和中心对齐，尺寸与内容保持。
    </p>
    <div class="alignment-grid">
      <button
        v-for="op in operations"
        :key="op.value"
        :disabled="busy || count < 2"
        @click="$emit('align', op.value)"
      >
        {{ op.label }}</button
      ><button
        :disabled="busy || count < 3"
        @click="$emit('align', 'horizontal')"
      >
        水平均分间距</button
      ><button
        :disabled="busy || count < 3"
        @click="$emit('align', 'vertical')"
      >
        垂直均分间距
      </button>
    </div>
    <p class="context-help">
      均分至少3个对象，固定两端；空间不足时原布局保持。每次可完整撤销。
    </p>
  </section>
</template>
