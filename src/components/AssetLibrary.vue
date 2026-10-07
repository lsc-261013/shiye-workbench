<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import Icon from "./Icon.vue";
import type { Board, Asset } from "../types";
import { clientToBoard } from "../lib/objects";
const props = defineProps<{
  board: Board;
  selectedAssetId: string;
  busy: boolean;
  busyLabel: string;
  mobile: boolean;
}>();
const emit = defineEmits<{
  choose: [a: Asset];
  add: [id: string, x?: number, y?: number];
  upload: [];
  link: [];
  close: [];
  dragging: [value: boolean];
}>();
const ghost = ref<{ a: Asset; x: number; y: number; valid: boolean }>();
let drag: {
    a: Asset;
    x: number;
    y: number;
    pointer: number;
    active: boolean;
  } | null = null,
  didDrag = false;
function start(e: PointerEvent, a: Asset) {
  didDrag = false;
  if (props.mobile || props.busy || e.button !== 0) return;
  e.preventDefault();
  const target = e.currentTarget as HTMLElement;
  target.focus({ preventScroll: true });
  target.setPointerCapture(e.pointerId);
  drag = { a, x: e.clientX, y: e.clientY, pointer: e.pointerId, active: false };
}
function move(e: PointerEvent) {
  if (!drag || drag.pointer !== e.pointerId) return;
  if (!drag.active && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5)
    return;
  drag.active = true;
  emit("dragging", true);
  const box = document.querySelector(".board")?.getBoundingClientRect();
  ghost.value = {
    a: drag.a,
    x: e.clientX,
    y: e.clientY,
    valid: !!box && !!clientToBoard(e.clientX, e.clientY, box),
  };
}
function end(e?: PointerEvent) {
  if (!drag) return;
  if (e && e.pointerId !== drag.pointer) return;
  didDrag = drag.active;
  if (e && drag.active) {
    const box = document.querySelector(".board")?.getBoundingClientRect();
    const point = box && clientToBoard(e.clientX, e.clientY, box);
    if (point) emit("add", drag.a.id, point.x, point.y);
  }
  drag = null;
  ghost.value = undefined;
  emit("dragging", false);
}
function choose(a: Asset) {
  if (didDrag) {
    didDrag = false;
    return;
  }
  emit("choose", a);
}
defineExpose({ cancelInteraction: () => end() });
onMounted(() => {
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", cancel);
});
function cancel() {
  end();
}
onBeforeUnmount(() => {
  window.removeEventListener("pointermove", move);
  window.removeEventListener("pointerup", end);
  window.removeEventListener("pointercancel", cancel);
});
</script>
<template>
  <aside class="asset-panel" :aria-busy="busy" aria-label="素材区">
    <header v-if="!mobile" class="asset-panel-heading">
      <h2>
        素材区 <small>{{ board.assets.length }}</small>
      </h2>
      <button
        aria-label="收起素材区"
        :disabled="!!ghost"
        @click="emit('close')"
      >
        <Icon name="close" :size="18" />
      </button>
    </header>
    <div class="reference-add">
      <button :disabled="busy" @click="emit('upload')">
        <Icon name="upload" :size="16" />上传</button
      ><button :disabled="busy" @click="emit('link')">
        <Icon name="link" :size="16" />链接
      </button>
    </div>
    <p class="asset-panel-help" role="status">
      {{
        busy
          ? busyLabel
          : mobile
            ? "收集后点添加到画板，允许重叠。"
            : "拖到画板决定位置，允许重叠；点击可定位查看。"
      }}
    </p>
    <div class="asset-panel-list">
      <article
        v-for="a in board.assets"
        :key="a.id"
        class="asset-row"
        :class="{ active: selectedAssetId === a.id }"
      >
        <button
          class="reference-thumbnail"
          :aria-label="'选择参考：' + a.title"
          :disabled="busy"
          @pointerdown="start($event, a)"
          @click="choose(a)"
        >
          <img
            v-if="a.data"
            :src="a.data"
            :alt="a.title"
            loading="lazy"
            draggable="false"
          /><Icon v-else name="link" :size="24" />
        </button>
        <div class="asset-row-info">
          <button
            :disabled="busy"
            class="reference-title"
            @click="emit('choose', a)"
          >
            {{ a.title }}</button
          ><small
            >{{
              board.items.filter((p) => p.assetId === a.id).length
            }}份在画板</small
          ><button
            class="asset-add-button"
            :aria-label="'添加到画板：' + a.title"
            :disabled="busy"
            @click="emit('add', a.id)"
          >
            添加到画板
          </button>
        </div>
      </article>
    </div>
    <p v-if="!board.assets.length" class="reference-empty">
      先上传喜欢的图片，或添加来源链接。
    </p>
    <p class="asset-panel-limit">单图≤12MB · 最多100份素材</p>
  </aside>
  <Teleport to="body"
    ><div
      v-if="ghost"
      class="asset-drag-ghost"
      :style="{ left: ghost.x + 'px', top: ghost.y + 'px' }"
    >
      <img v-if="ghost.a.data" :src="ghost.a.data" alt="" /><span>{{
        ghost.valid ? "松手放在此处" : "移到画板内 · 外侧松手取消"
      }}</span>
    </div></Teleport
  >
</template>
