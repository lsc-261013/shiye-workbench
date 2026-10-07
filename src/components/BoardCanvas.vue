<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue";
import { isTextInteraction } from "../lib/keyboard";
import { type Board, type Placement, clone, WIDTH, HEIGHT } from "../types";
import { move, resize } from "../lib/geometry";
import { fitText } from "../lib/text";
import { moveSelection } from "../lib/alignment";
import TextArtwork from "./TextArtwork.vue";
import CroppedImage from "./CroppedImage.vue";
const props = defineProps<{
  board: Board;
  selected: string;
  selectedIds: string[];
  preview: boolean;
  mobile: boolean;
  locked?: boolean;
  editing?: boolean;
}>();
const emit = defineEmits<{
  select: [id: string, multiple?: boolean];
  message: [message: string];
  change: [board: Board];
  details: [id: string];
  add: [id: string, x: number, y: number];
  files: [files: File[]];
}>();
const host = ref<HTMLElement>();
const scale = ref(0.6);
const temp = ref<Board | null>(null);
const shown = computed(() => temp.value || props.board);
const activePlacement = computed(() =>
  shown.value.items.find((p) => p.id === props.selected),
);
const guides = ref<{ x?: number; y?: number }>({});
let observer: ResizeObserver;
let drag: {
  id: string;
  start: Placement;
  x: number;
  y: number;
  mode: "move" | "resize";
  scale: number;
  group: Placement[];
} | null = null;
let resizeError = "";
function fit() {
  if (!host.value) return;
  const availableHeight = host.value.clientHeight - 50;
  scale.value = Math.max(
    0.1,
    Math.min(
      1,
      (host.value.clientWidth - (props.mobile ? 24 : 40)) / WIDTH,
      props.mobile
        ? matchMedia("(orientation: landscape)").matches
          ? Math.max(120, window.innerHeight - 155) / HEIGHT
          : 1
        : availableHeight / HEIGHT,
    ),
  );
}
watch(() => props.mobile, fit);
onMounted(() => {
  observer = new ResizeObserver(fit);
  observer.observe(host.value!);
});
onBeforeUnmount(() => observer?.disconnect());
function start(e: PointerEvent, p: Placement, mode: "move" | "resize") {
  if (props.preview || props.locked) return;
  if (e.shiftKey && !props.mobile) {
    e.preventDefault();
    emit("select", p.id, true);
    return;
  }
  if (!props.selectedIds.includes(p.id)) emit("select", p.id);
  if (props.mobile || e.button !== 0) return;
  e.preventDefault();
  if (props.editing) return;
  (e.currentTarget as HTMLElement).focus({ preventScroll: true });
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  drag = {
    id: p.id,
    start: clone(p),
    x: e.clientX,
    y: e.clientY,
    mode,
    scale: scale.value,
    group: props.selectedIds.includes(p.id)
      ? clone(props.board.items.filter((i) => props.selectedIds.includes(i.id)))
      : [clone(p)],
  };
  resizeError = "";
  temp.value = clone(props.board);
}
function pointerMove(e: PointerEvent) {
  if (!drag || !temp.value) return;
  const p = temp.value.items.find((p) => p.id === drag!.id)!;
  const dx = (e.clientX - drag.x) / drag.scale,
    dy = (e.clientY - drag.y) / drag.scale;
  if (drag.mode === "resize") {
    try {
      Object.assign(
        p,
        p.kind === "text"
          ? fitText(
              drag.start,
              p.text,
              Math.max(100, Math.min(1600 - p.x, drag.start.w + dx)),
            )
          : resize(drag.start, dx, dy),
      );
      resizeError = "";
    } catch (e) {
      resizeError = (e as Error).message;
    }
  } else {
    if (drag.group.length > 1) {
      for (const next of moveSelection(drag.group, dx, dy))
        Object.assign(temp.value.items.find((p) => p.id === next.id)!, next);
      return;
    }
    const moved = move(drag.start, dx, dy);
    p.x = moved.x;
    p.y = moved.y;
    guides.value = moved.guides;
  }
}
function end(cancel = false) {
  if (resizeError && !cancel) emit("message", resizeError);
  if (
    drag &&
    temp.value &&
    !cancel &&
    JSON.stringify(temp.value) !== JSON.stringify(props.board)
  )
    emit("change", temp.value);
  drag = null;
  temp.value = null;
  guides.value = {};
}
defineExpose({ cancelInteraction: () => end(true) });
function drop(e: DragEvent) {
  if (props.preview || props.locked) return;
  const files = Array.from(e.dataTransfer?.files || []);
  if (files.length) {
    emit("files", files);
    return;
  }
  const id = e.dataTransfer?.getData("application/x-shiye-asset");
  if (id && !props.mobile) {
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    emit(
      "add",
      id,
      (e.clientX - box.left) / scale.value,
      (e.clientY - box.top) / scale.value,
    );
  }
}
function key(e: KeyboardEvent, p: Placement) {
  if (
    props.preview ||
    props.mobile ||
    props.locked ||
    props.editing ||
    isTextInteraction(e.target, e.isComposing)
  )
    return;
  const directions: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };
  const delta = directions[e.key];
  if (delta) {
    e.preventDefault();
    if (!props.selectedIds.includes(p.id)) emit("select", p.id);
    const b = clone(props.board);
    if (props.selectedIds.length > 1) {
      for (const next of moveSelection(
        b.items.filter((p) => props.selectedIds.includes(p.id)),
        delta[0] * (e.shiftKey ? 20 : 10),
        delta[1] * (e.shiftKey ? 20 : 10),
      ))
        Object.assign(b.items.find((p) => p.id === next.id)!, next);
      emit("change", b);
      return;
    }
    Object.assign(
      b.items.find((i) => i.id === p.id)!,
      move(
        p,
        delta[0] * (e.shiftKey ? 20 : 10),
        delta[1] * (e.shiftKey ? 20 : 10),
      ),
    );
    emit("change", b);
  }
}
</script>
<template>
  <div class="canvas-host" ref="host">
    <div
      class="board-viewport"
      :style="{ width: WIDTH * scale + 'px', height: HEIGHT * scale + 'px' }"
    >
      <div
        class="board"
        tabindex="0"
        aria-label="视觉画板"
        :class="{ preview }"
        :style="{
          width: WIDTH + 'px',
          height: HEIGHT + 'px',
          transform: `scale(${scale})`,
        }"
        @dragover.prevent
        @drop.prevent="drop"
        @click.self="emit('select', '')"
      >
        <header class="board-heading">
          <h2>{{ board.title }}</h2>
          <p>VISUAL NOTES / 视觉参考方案</p>
        </header>
        <div v-if="!shown.items.length" class="board-empty">
          <span>＋</span>
          <h3>一页新的可能</h3>
          <p>从素材区拖入，或点「添加到画板」。允许重叠。</p>
        </div>
        <article
          v-for="p in shown.items"
          :key="p.id"
          :data-object-id="p.id"
          class="board-item"
          :class="{
            selected: selectedIds.includes(p.id) && !preview,
            'text-item': p.kind === 'text',
            'polygon-item': !!p.crop?.points,
          }"
          :style="{
            left: p.x + 'px',
            top: p.y + 'px',
            width: p.w + 'px',
            height: p.h + 'px',
          }"
          tabindex="0"
          :aria-label="
            p.kind === 'text'
              ? '画板文字：' + p.text?.content.slice(0, 40)
              : '画板素材：' +
                shown.assets.find((a) => a.id === p.assetId)?.title
          "
          @pointerdown="start($event, p, 'move')"
          @pointermove="pointerMove"
          @pointerup="end()"
          @pointercancel="end(true)"
          @keydown="key($event, p)"
          @click="$event.detail === 0 && emit('select', p.id, $event.shiftKey)"
          @dblclick="p.assetId && emit('details', p.assetId)"
          @keydown.enter="p.assetId && emit('details', p.assetId)"
        >
          <TextArtwork
            v-if="p.kind === 'text' && p.text"
            :text="p.text"
            :width="p.w"
            :height="p.h"
          />
          <template
            v-for="a in shown.assets.filter((a) => a.id === p.assetId)"
            :key="a.id"
            ><div class="item-image">
              <CroppedImage
                v-if="a.data"
                :data="a.data"
                :crop="p.crop"
                :title="a.title"
              />
              <div v-else class="link-art">
                <span>↗</span>
                <p>{{ a.source }}</p>
              </div>
            </div>
            <div class="item-caption">
              <b>{{ a.title }}</b>
              <p>{{ a.note || "添加你的借鉴点" }}</p>
            </div></template
          >
        </article>
        <button
          v-if="
            activePlacement &&
            selectedIds.length === 1 &&
            !preview &&
            !mobile &&
            !editing
          "
          class="resize-handle floating-handle"
          :style="{
            left: activePlacement.x + activePlacement.w - 10 + 'px',
            top: activePlacement.y + activePlacement.h - 10 + 'px',
          }"
          :aria-label="
            activePlacement.kind === 'text'
              ? '调整文字框宽度，字号保持'
              : '等比缩放，拖动右下角'
          "
          @pointerdown.stop="start($event, activePlacement, 'resize')"
          @pointermove.stop="pointerMove"
          @pointerup.stop="end()"
          @pointercancel.stop="end(true)"
        ></button>
        <div
          v-if="guides.x !== undefined"
          class="guide vertical"
          :style="{ left: guides.x + 'px' }"
        ></div>
        <div
          v-if="guides.y !== undefined"
          class="guide horizontal"
          :style="{ top: guides.y + 'px' }"
        ></div>
      </div>
    </div>
    <div class="canvas-caption">
      <span>{{
        mobile
          ? "查看全貌 · 点选素材后查看说明"
          : "拖动编排 · Shift点选多个 · 方向键微调"
      }}</span
      ><span>1600 × 1000 · {{ Math.round(scale * 100) }}%</span>
    </div>
  </div>
</template>
