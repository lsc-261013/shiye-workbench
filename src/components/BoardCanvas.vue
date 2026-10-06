<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue";
import { isTextInteraction } from "../lib/keyboard";
import { type Board, type Placement, clone, WIDTH, HEIGHT } from "../types";
import { move, resize } from "../lib/geometry";
const props = defineProps<{
  board: Board;
  selected: string;
  preview: boolean;
  mobile: boolean;
  locked?: boolean;
}>();
const emit = defineEmits<{
  select: [id: string];
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
} | null = null;
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
  emit("select", p.id);
  if (props.mobile || e.button !== 0) return;
  e.preventDefault();
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  drag = {
    id: p.id,
    start: clone(p),
    x: e.clientX,
    y: e.clientY,
    mode,
    scale: scale.value,
  };
  temp.value = clone(props.board);
}
function pointerMove(e: PointerEvent) {
  if (!drag || !temp.value) return;
  const p = temp.value.items.find((p) => p.id === drag!.id)!;
  const dx = (e.clientX - drag.x) / drag.scale,
    dy = (e.clientY - drag.y) / drag.scale;
  if (drag.mode === "resize") Object.assign(p, resize(drag.start, dx, dy));
  else {
    const moved = move(drag.start, dx, dy);
    p.x = moved.x;
    p.y = moved.y;
    guides.value = moved.guides;
  }
}
function end(cancel = false) {
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
    emit("select", p.id);
    const b = clone(props.board);
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
          <p>先添加图片或链接，再从素材栏加入画板。</p>
        </div>
        <article
          v-for="p in shown.items"
          :key="p.id"
          class="board-item"
          :class="{ selected: p.id === selected && !preview }"
          :style="{
            left: p.x + 'px',
            top: p.y + 'px',
            width: p.w + 'px',
            height: p.h + 'px',
          }"
          tabindex="0"
          :aria-label="
            '画板素材：' + shown.assets.find((a) => a.id === p.assetId)?.title
          "
          @pointerdown="start($event, p, 'move')"
          @pointermove="pointerMove"
          @pointerup="end()"
          @pointercancel="end(true)"
          @keydown="key($event, p)"
          @click="emit('select', p.id)"
          @dblclick="emit('details', p.assetId)"
          @keydown.enter="emit('details', p.assetId)"
        >
          <template
            v-for="a in shown.assets.filter((a) => a.id === p.assetId)"
            :key="a.id"
            ><div class="item-image">
              <img
                v-if="a.data"
                :src="a.data"
                :alt="a.title"
                draggable="false"
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
          v-if="activePlacement && !preview && !mobile"
          class="resize-handle floating-handle"
          :style="{
            left: activePlacement.x + activePlacement.w - 10 + 'px',
            top: activePlacement.y + activePlacement.h - 10 + 'px',
          }"
          aria-label="等比缩放，拖动右下角"
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
          : "拖动编排 · 角点等比缩放 · 方向键微调"
      }}</span
      ><span>1600 × 1000 · {{ Math.round(scale * 100) }}%</span>
    </div>
  </div>
</template>
