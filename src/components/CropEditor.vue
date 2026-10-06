<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { Asset, Crop } from "../types";
import { fullCrop, ratioCrop, validateCrop } from "../lib/crop";
import { imageLoaded } from "../lib/data";
import CroppedImage from "./CroppedImage.vue";
import Modal from "./Modal.vue";
const props = defineProps<{ asset: Asset; crop?: Crop }>();
const emit = defineEmits<{ save: [crop: Crop]; close: [] }>();
const draft = ref({ ...(props.crop || fullCrop()) }),
  ratio = ref("free"),
  imageRatio = ref(1),
  ready = ref(false),
  error = ref("");
onMounted(async () => {
  try {
    const im = await imageLoaded(props.asset.data);
    imageRatio.value = im.naturalWidth / im.naturalHeight;
    ready.value = true;
  } catch (e) {
    error.value = (e as Error).message;
  }
});
const percentages = computed(() => ({
  left: draft.value.x * 100 + "%",
  top: draft.value.y * 100 + "%",
  width: draft.value.w * 100 + "%",
  height: draft.value.h * 100 + "%",
}));
function preset() {
  if (ratio.value === "full") draft.value = fullCrop();
  else if (ratio.value !== "free")
    draft.value = ratioCrop(Number(ratio.value), imageRatio.value, draft.value);
}
function size(event: Event, axis: "w" | "h") {
  let value = Number((event.target as HTMLInputElement).value) / 100;
  if (ratio.value !== "free" && ratio.value !== "full") {
    let w =
        axis === "w" ? value : (value * Number(ratio.value)) / imageRatio.value,
      h = (w * imageRatio.value) / Number(ratio.value);
    const factor = Math.min(1, 1 / w, 1 / h);
    w *= factor;
    h *= factor;
    draft.value.w = w;
    draft.value.h = h;
  } else draft.value[axis] = value;
  draft.value.x = Math.min(draft.value.x, 1 - draft.value.w);
  draft.value.y = Math.min(draft.value.y, 1 - draft.value.h);
}
function position(event: Event, axis: "x" | "y") {
  draft.value[axis] = Number((event.target as HTMLInputElement).value) / 100;
}
function save() {
  try {
    validateCrop(draft.value);
    emit("save", { ...draft.value });
  } catch (e) {
    error.value = (e as Error).message;
  }
}
</script>
<template>
  <Modal title="裁切当前图片" kind="crop-editor" @close="emit('close')"
    ><p class="context-help">
      只改变当前对象的取景，原图与其他副本保持。拖动滑块调整，右侧为确认后的完整画面。
    </p>
    <div class="crop-previews">
      <div
        class="crop-source"
        :style="{
          aspectRatio: imageRatio,
          width: `min(100%, ${360 * imageRatio}px)`,
        }"
      >
        <img :src="asset.data" alt="裁切前完整原图" />
        <div class="crop-window" :style="percentages"></div>
      </div>
      <div class="crop-result">
        <CroppedImage :data="asset.data" :crop="draft" title="裁切结果预览" />
      </div>
    </div>
    <div class="crop-controls">
      <label
        >裁切比例<select aria-label="裁切比例" v-model="ratio" @change="preset">
          <option value="free">自由比例</option>
          <option value="1">1:1</option>
          <option value="1.3333333333333333">4:3</option>
          <option value="1.7777777777777777">16:9</option>
          <option value="full">完整图</option>
        </select></label
      >
      <label
        >取景宽度 {{ (draft.w * 100).toFixed(1) }}%<input
          aria-label="取景宽度"
          type="range"
          min="0.1"
          max="100"
          step="0.1"
          :value="draft.w * 100"
          @input="size($event, 'w')"
      /></label>
      <label
        >取景高度 {{ (draft.h * 100).toFixed(1) }}%<input
          aria-label="取景高度"
          type="range"
          min="0.1"
          max="100"
          step="0.1"
          :value="draft.h * 100"
          @input="size($event, 'h')"
      /></label>
      <label
        >左右位置<input
          aria-label="取景左右位置"
          type="range"
          min="0"
          :max="(1 - draft.w) * 100"
          step="0.1"
          :value="draft.x * 100"
          @input="position($event, 'x')"
      /></label>
      <label
        >上下位置<input
          aria-label="取景上下位置"
          type="range"
          min="0"
          :max="(1 - draft.h) * 100"
          step="0.1"
          :value="draft.y * 100"
          @input="position($event, 'y')"
      /></label>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div class="modal-actions">
      <button @click="emit('close')">取消裁切</button
      ><button class="primary" :disabled="!ready" @click="save">
        确认裁切
      </button>
    </div></Modal
  >
</template>
