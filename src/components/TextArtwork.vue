<script setup lang="ts">
import { computed } from "vue";
import type { TextBlock } from "../types";
import { textLayout, TEXT_FONT, TEXT_PADDING } from "../lib/text";
const props = defineProps<{ text: TextBlock; width: number; height: number }>();
const layout = computed(() => textLayout(props.text, props.width));
const x = computed(() =>
  props.text.align === "left"
    ? TEXT_PADDING
    : props.text.align === "center"
      ? props.width / 2
      : props.width - TEXT_PADDING,
);
</script>
<template>
  <svg
    class="text-artwork"
    :viewBox="`0 0 ${width} ${height}`"
    :width="width"
    :height="height"
    aria-hidden="true"
  >
    <rect
      v-if="text.style === 'note'"
      :width="width"
      :height="height"
      fill="#ece8dc"
    />
    <text
      :fill="text.color"
      :font-family="TEXT_FONT"
      :font-size="text.size"
      :font-weight="text.bold ? 700 : 400"
      :text-anchor="
        text.align === 'left'
          ? 'start'
          : text.align === 'center'
            ? 'middle'
            : 'end'
      "
    >
      <tspan
        v-for="(line, i) in layout.lines"
        :key="i"
        :x="x"
        :y="TEXT_PADDING + text.size + i * layout.lineHeight"
        xml:space="preserve"
      >
        {{ line || " " }}
      </tspan>
    </text>
  </svg>
</template>
