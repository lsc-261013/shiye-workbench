<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { clone, type Asset, type Crop, type CropPoint } from "../types";
import { fullCrop, ratioCrop, validateCrop } from "../lib/crop";
import {
  cropPoints,
  polygonCrop,
  translateCrop,
  resizeCrop,
  clamp01,
} from "../lib/polygon";
import { imageLoaded } from "../lib/data";
import Modal from "./Modal.vue";
import CroppedImage from "./CroppedImage.vue";
const props = defineProps<{ asset: Asset; crop?: Crop }>();
const emit = defineEmits<{ save: [crop: Crop | undefined]; close: [] }>();
const draft = ref<Crop>(clone(props.crop || fullCrop())),
  mode = ref(props.crop?.points ? "points" : "fixed"),
  ratio = ref("current"),
  imageRatio = ref(1),
  ready = ref(false),
  error = ref("");
const source = ref<HTMLElement>(),
  stage = ref<HTMLElement>();
const display = ref({ w: 500, h: 300 });
const points = computed(() => cropPoints(draft.value));
const pointString = computed(() =>
  points.value
    .map((p) => `${p.x * 1000},${(p.y * 1000) / imageRatio.value}`)
    .join(" "),
);
const maskPath = computed(
  () =>
    `M0 0H1000V${1000 / imageRatio.value}H0Z M${points.value.map((p) => `${p.x * 1000} ${(p.y * 1000) / imageRatio.value}`).join("L")}Z`,
);
let drag: { pointer: number; kind: number; start: Crop; at: CropPoint } | null =
  null;
let observer: ResizeObserver;
function fit() {
  if (drag || !stage.value) return;
  const box = stage.value;
  const w = Math.max(
    1,
    Math.min(box.clientWidth - 36, (box.clientHeight - 36) * imageRatio.value),
  );
  display.value = { w, h: w / imageRatio.value };
}
onMounted(async () => {
  try {
    const im = await imageLoaded(props.asset.data);
    imageRatio.value = im.naturalWidth / im.naturalHeight;
    fit();
    ready.value = true;
    observer = new ResizeObserver(fit);
    observer.observe(stage.value!);
  } catch (e) {
    error.value = (e as Error).message;
  }
});
onBeforeUnmount(() => observer?.disconnect());
function at(e: PointerEvent): CropPoint {
  const b = source.value!.getBoundingClientRect();
  return {
    x: (e.clientX - b.left) / b.width,
    y: (e.clientY - b.top) / b.height,
  };
}
function start(e: PointerEvent, kind: number) {
  if (!ready.value || e.button !== 0) return;
  e.preventDefault();
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  drag = { pointer: e.pointerId, kind, start: clone(draft.value), at: at(e) };
  error.value = "";
}
function move(e: PointerEvent) {
  if (!drag || drag.pointer !== e.pointerId) return;
  const p = at(e);
  try {
    if (drag.kind === -1)
      draft.value = translateCrop(drag.start, p.x - drag.at.x, p.y - drag.at.y);
    else if (mode.value === "fixed")
      draft.value = resizeCrop(drag.start, drag.kind, p, imageRatio.value);
    else {
      const next = cropPoints(drag.start);
      next[drag.kind] = { x: clamp01(p.x), y: clamp01(p.y) };
      draft.value = polygonCrop(next);
    }
    error.value = "";
  } catch (e) {
    error.value = (e as Error).message;
  }
}
function end(cancel = false) {
  if (cancel && drag) draft.value = drag.start;
  drag = null;
}
function changeMode() {
  end();
  draft.value =
    mode.value === "points"
      ? polygonCrop(cropPoints(draft.value))
      : {
          x: draft.value.x,
          y: draft.value.y,
          w: draft.value.w,
          h: draft.value.h,
        };
  ratio.value = "current";
  error.value = "";
}
function preset() {
  if (ratio.value === "current") return;
  const r = ratio.value === "original" ? imageRatio.value : Number(ratio.value);
  draft.value = ratioCrop(r, imageRatio.value, draft.value);
  error.value = "";
}
function key(e: KeyboardEvent, i: number) {
  const delta: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };
  if (!delta[e.key]) return;
  e.preventDefault();
  const [dx, dy] = delta[e.key]!;
  const p = points.value[i]!;
  try {
    if (mode.value === "points") {
      const ps = cropPoints(draft.value);
      ps[i] = { x: clamp01(p.x + dx * 0.005), y: clamp01(p.y + dy * 0.005) };
      draft.value = polygonCrop(ps);
    } else
      draft.value = resizeCrop(
        draft.value,
        i,
        { x: p.x + dx * 0.005, y: p.y + dy * 0.005 },
        imageRatio.value,
      );
    error.value = "";
  } catch (e) {
    error.value = (e as Error).message;
  }
}
function save() {
  try {
    validateCrop(draft.value);
    emit("save", clone(draft.value));
  } catch (e) {
    error.value = (e as Error).message;
  }
}
</script>
<template>
  <Modal title="裁切当前图片" kind="crop-editor" @close="emit('close')">
    <div class="direct-crop-controls">
      <label
        >裁切模式<select
          aria-label="裁切模式"
          v-model="mode"
          @change="changeMode"
        >
          <option value="fixed">固定形状 · 等比缩放</option>
          <option value="points">四点自由 · 不拉伸图像</option>
        </select></label
      >
      <label v-if="mode === 'fixed'"
        >框的比例<select aria-label="裁切比例" v-model="ratio" @change="preset">
          <option value="current">保持当前形状</option>
          <option value="original">原图比例</option>
          <option value="1">1:1</option>
          <option value="1.3333333333333333">4:3</option>
          <option value="1.7777777777777777">16:9</option>
        </select></label
      >
      <p v-else class="context-help">四点依序相连，原图像素不做透视拉伸。</p>
    </div>
    <p class="crop-instruction">
      拖角点{{
        mode === "fixed" ? "等比缩放" : "改变轮廓"
      }}，拖框内移动取景。只改当前实例。角点可用方向键微调。
    </p>
    <div class="direct-crop-previews">
      <div class="direct-crop-stage" ref="stage">
        <div
          class="direct-crop-source"
          ref="source"
          :style="{ width: display.w + 'px', height: display.h + 'px' }"
        >
          <svg
            :viewBox="`0 0 1000 ${1000 / imageRatio}`"
            aria-label="原图直接裁切区域"
            @pointermove="move"
            @pointerup="end()"
            @pointercancel="end(true)"
          >
            <image
              :href="asset.data"
              width="1000"
              :height="1000 / imageRatio"
            />
            <path
              :d="maskPath"
              fill="#25272388"
              fill-rule="evenodd"
              pointer-events="none"
            />
            <polygon
              :points="pointString"
              fill="transparent"
              stroke="#b34830"
              stroke-width="2"
              vector-effect="non-scaling-stroke"
              @pointerdown="start($event, -1)"
            />
          </svg>
          <button
            v-for="(p, i) in points"
            :key="i"
            class="crop-corner"
            :aria-label="'裁切角点' + (i + 1)"
            :style="{ left: p.x * 100 + '%', top: p.y * 100 + '%' }"
            :disabled="!ready"
            @pointerdown="start($event, i)"
            @pointermove="move"
            @pointerup="end()"
            @pointercancel="end(true)"
            @keydown="key($event, i)"
          >
            {{ i + 1 }}
          </button>
        </div>
      </div>
      <figure class="direct-crop-result">
        <figcaption>确认后的取景</figcaption>
        <CroppedImage :data="asset.data" :crop="draft" title="裁切结果预览" />
      </figure>
    </div>
    <p class="crop-feedback" :class="{ error }" role="status">
      {{ error || "原图保留。确认一次可撤销；取消或Esc保持进入前的取景。" }}
    </p>
    <div class="modal-actions crop-footer">
      <button @click="emit('close')">取消裁切</button
      ><button :disabled="!ready" @click="emit('save', undefined)">
        恢复完整图</button
      ><button class="primary" :disabled="!ready" @click="save">
        确认裁切
      </button>
    </div>
  </Modal>
</template>
