<script setup lang="ts">
import Icon from "./Icon.vue";
import { useAssetDrag } from "../composables/useAssetDrag";
import type { Board, Asset } from "../types";
const props = defineProps<{
  board: Board;
  selectedAssetId: string;
  mobile: boolean;
  busy: boolean;
  busyLabel?: string;
}>();
const emit = defineEmits<{
  choose: [asset: Asset];
  add: [id: string, x?: number, y?: number];
  upload: [];
  link: [];
  close: [];
}>();
const drag = useAssetDrag(
  () => props.mobile,
  (id, x, y) => emit("add", id, x, y),
  (a) => emit("choose", a),
);
const ghost = drag.ghost;
</script>
<template>
  <aside class="asset-library" :aria-busy="busy">
    <div
      v-if="ghost"
      class="drag-ghost"
      :style="{ left: ghost.x + 14 + 'px', top: ghost.y + 14 + 'px' }"
    >
      ＋ {{ ghost.title }} · 松手加入画板
    </div>
    <header v-if="!mobile" class="library-head">
      <div>
        <span class="eyebrow">YOUR REFERENCES</span>
        <h2>
          素材
          <span>{{ board.assets.length.toString().padStart(2, "0") }}</span>
        </h2>
      </div>
      <button
        class="icon-button"
        @click="emit('close')"
        aria-label="收起素材栏"
      >
        <Icon name="back" :size="16" />
      </button>
    </header>
    <div class="asset-add">
      <button class="upload-button" @click="emit('upload')" :disabled="busy">
        <span v-if="busy" class="spinner"></span><Icon v-else name="plus" />
        {{ busy ? "处理中…" : "上传图片" }}</button
      ><button @click="emit('link')" :disabled="busy">
        <Icon name="link" :size="15" /> 添加链接
      </button>
    </div>
    <p class="sidebar-hint">
      {{
        busy
          ? busyLabel || "正在处理素材，请稍候…"
          : mobile
            ? "点图片查看，点 ＋ 放进画板。"
            : "点选查看详情 · 拖入画板自由编排"
      }}
    </p>
    <div class="asset-list">
      <div
        v-for="a in board.assets"
        :key="a.id"
        class="asset-tile"
        :class="{ active: selectedAssetId === a.id }"
      >
        <button
          class="asset-thumb"
          :aria-label="'选择素材：' + a.title"
          :aria-pressed="selectedAssetId === a.id"
          @click="drag.click(a)"
          @pointerdown="drag.start($event, a)"
          @pointermove="drag.move"
          @pointerup="drag.end($event)"
          @pointercancel="drag.end($event, true)"
          @dragstart.prevent
        >
          <img
            v-if="a.data"
            :src="a.data"
            :alt="a.title"
            draggable="false"
            loading="lazy"
          /><span v-else class="link-thumb"
            ><Icon name="link" :size="24" /><small>参考链接</small></span
          >
          <span
            v-if="board.items.some((p) => p.assetId === a.id)"
            class="in-board"
            aria-label="已在画板"
            ><Icon name="check" :size="12"
          /></span>
        </button>
        <div class="asset-row">
          <button
            class="asset-name"
            @click="emit('choose', a)"
            :title="a.title"
          >
            {{ a.title }}</button
          ><button
            class="asset-plus"
            @click="emit('add', a.id)"
            :aria-label="'加入画板：' + a.title"
            :disabled="board.items.length >= 150 || busy"
          >
            <Icon name="plus" :size="16" />
          </button>
        </div>
      </div>
      <div v-if="!board.assets.length" class="empty-materials">
        <Icon name="image" :size="32" />
        <h3>先留住一张喜欢的</h3>
        <p>上传图片或添加来源链接。<br />准备好后，放进画板。</p>
      </div>
    </div>
    <p class="sidebar-foot">
      PNG / JPEG / WebP · 单张 ≤ 12 MB<br />最多 100 份素材 · 图片只保存在本机
    </p>
  </aside>
</template>
