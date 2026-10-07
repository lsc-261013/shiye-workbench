<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { uid, type Crop } from "../types";
import { imageLoaded } from "../lib/data";
import { cropSource } from "../lib/crop";
const props = defineProps<{ data: string; crop?: Crop; title: string }>();
const size = ref({ w: 1, h: 1 }),
  ready = ref(false),
  clipId = "crop-" + uid();
let generation = 0;
watch(
  () => props.data,
  async (data) => {
    const request = ++generation;
    ready.value = false;
    try {
      const im = await imageLoaded(data);
      if (request === generation) {
        size.value = { w: im.naturalWidth, h: im.naturalHeight };
        ready.value = true;
      }
    } catch {
      /* Import and upload validate image decoding. */
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => generation++);
const rect = computed(() => cropSource(props.crop, size.value.w, size.value.h));
</script>
<template>
  <img v-if="!crop" :src="data" :alt="title" draggable="false" />
  <svg
    v-else-if="ready"
    class="cropped-artwork"
    :viewBox="`${rect.x} ${rect.y} ${rect.w} ${rect.h}`"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    :aria-label="title + '（已裁切）'"
  >
    <defs>
      <clipPath :id="clipId">
        <polygon
          v-if="crop?.points"
          :points="
            crop.points.map((p) => `${p.x * size.w},${p.y * size.h}`).join(' ')
          "
        />
        <rect v-else :x="rect.x" :y="rect.y" :width="rect.w" :height="rect.h" />
      </clipPath>
    </defs>
    <image
      :href="data"
      :width="size.w"
      :height="size.h"
      :clip-path="`url(#${clipId})`"
    />
  </svg>
</template>
