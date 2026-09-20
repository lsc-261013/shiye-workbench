<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import BoardCanvas from "./BoardCanvas.vue";
import { useAssetDrag } from "../composables/useAssetDrag";
import { type Board, type Asset, clone, uid, WIDTH, HEIGHT } from "../types";
const props = defineProps<{
  board: Board;
  saveState: string;
  canUndo: boolean;
  canRedo: boolean;
  busy: boolean;
}>();
const emit = defineEmits<{
  change: [b: Board];
  undo: [];
  redo: [];
  home: [];
  upload: [files: File[]];
  replace: [assetId: string, file: File];
  details: [a: Asset];
  link: [];
  png: [];
  text: [];
  backup: [];
  import: [];
  retry: [];
  start: [kind: "blank" | "product" | "life"];
}>();
const selected = ref(""),
  preview = ref(false),
  sidebar = ref(true),
  mobile = ref(false);
const upload = ref<HTMLInputElement>(),
  replace = ref<HTMLInputElement>();
let media: MediaQueryList;
const selectedItem = computed(() =>
  props.board.items.find((p) => p.id === selected.value),
);
const selectedAsset = computed(() =>
  props.board.assets.find((a) => a.id === selectedItem.value?.assetId),
);
function mediaChange() {
  mobile.value = media.matches;
  sidebar.value = !mobile.value;
}
onMounted(() => {
  media = matchMedia("(max-width: 760px)");
  mediaChange();
  media.addEventListener("change", mediaChange);
  window.addEventListener("keydown", keyboard);
});
onBeforeUnmount(() => {
  media.removeEventListener("change", mediaChange);
  window.removeEventListener("keydown", keyboard);
});
function keyboard(e: KeyboardEvent) {
  if (
    document.querySelector("dialog[open]") ||
    (e.target as HTMLElement).closest("input,textarea") ||
    preview.value
  )
    return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    e.shiftKey ? emit("redo") : emit("undo");
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
    e.preventDefault();
    emit("redo");
  }
  if (e.key === "Delete" && selectedItem.value) {
    e.preventDefault();
    remove();
  }
  if (e.key === "Escape") selected.value = "";
}
function add(
  id: string,
  x = 80 + (props.board.items.length % 4) * 70,
  y = 150 + (props.board.items.length % 4) * 60,
) {
  if (props.board.items.length >= 150) return;
  const b = clone(props.board);
  const p = {
    id: uid(),
    assetId: id,
    x: Math.max(0, Math.min(WIDTH - 400, x)),
    y: Math.max(100, Math.min(HEIGHT - 325, y)),
    w: 400,
    h: 300,
  };
  b.items.push(p);
  emit("change", b);
  selected.value = p.id;
  if (mobile.value) sidebar.value = false;
}
function remove() {
  const b = clone(props.board);
  b.items = b.items.filter((p) => p.id !== selected.value);
  emit("change", b);
  selected.value = "";
}
function layer(direction: number) {
  const b = clone(props.board);
  const i = b.items.findIndex((p) => p.id === selected.value);
  const j = i + direction;
  if (i >= 0 && j >= 0 && j < b.items.length) {
    const [p] = b.items.splice(i, 1);
    b.items.splice(j, 0, p!);
    emit("change", b);
  }
}
function rename(e: Event) {
  const b = clone(props.board);
  b.title = (e.target as HTMLInputElement).value.trim() || "未命名视觉方案";
  emit("change", b);
}
function selectedFiles(e: Event) {
  const t = e.target as HTMLInputElement;
  emit("upload", Array.from(t.files || []));
  t.value = "";
}
function replaced(e: Event) {
  const t = e.target as HTMLInputElement;
  const f = t.files?.[0];
  if (f && selectedAsset.value) emit("replace", selectedAsset.value.id, f);
  t.value = "";
}
const assetDrag = useAssetDrag(
  () => mobile.value,
  add,
  (asset) => emit("details", asset),
);
const ghost = assetDrag.ghost;
function showDetails(id: string) {
  const a = props.board.assets.find((a) => a.id === id);
  if (a) emit("details", a);
}
</script>
<template>
  <div class="editor" :class="{ 'is-preview': preview }">
    <div
      v-if="ghost"
      class="drag-ghost"
      :style="{ left: ghost.x + 14 + 'px', top: ghost.y + 14 + 'px' }"
    >
      ＋ {{ ghost.title }} · 松手加入画板
    </div>
    <header class="editor-top">
      <button class="editor-home" @click="emit('home')" aria-label="返回首页">
        ← <span class="mini-brand">拾页</span>
      </button>
      <div class="project-meta">
        <input
          aria-label="方案名称"
          :value="board.title"
          maxlength="100"
          @change="rename"
          @blur="rename"
          :readonly="preview"
        /><button
          v-if="saveState.includes('失败')"
          class="save-error"
          @click="emit('retry')"
        >
          {{ saveState }} · 重试</button
        ><span v-else class="save-state"><i></i>{{ saveState }}</span>
      </div>
      <div class="editor-actions">
        <button
          v-if="!preview"
          :disabled="!canUndo"
          @click="emit('undo')"
          title="撤销 Ctrl+Z"
          aria-label="撤销"
        >
          ↶</button
        ><button
          v-if="!preview"
          :disabled="!canRedo"
          @click="emit('redo')"
          title="重做 Ctrl+Shift+Z"
          aria-label="重做"
        >
          ↷</button
        ><button @click="preview = !preview">
          {{ preview ? "返回编辑" : "预览" }}</button
        ><button class="primary" :disabled="busy" @click="emit('png')">
          {{ busy ? "处理中…" : "导出 PNG" }}<span>↓</span>
        </button>
        <details
          class="more-menu"
          @click="
            (e) => {
              if ((e.target as HTMLElement).closest('button'))
                (e.currentTarget as HTMLDetailsElement).open = false;
            }
          "
        >
          <summary aria-label="更多操作">•••</summary>
          <div>
            <button @click="emit('text')">下载参考清单 .txt</button
            ><button @click="emit('backup')">导出完整备份</button
            ><button @click="emit('import')">导入备份</button>
            <hr />
            <button @click="emit('start', 'blank')">新建空白方案</button
            ><button @click="emit('start', 'product')">使用产品网站示例</button
            ><button @click="emit('start', 'life')">使用生活方式示例</button>
          </div>
        </details>
      </div>
    </header>
    <div class="workspace">
      <aside
        v-show="sidebar && !preview"
        class="asset-sidebar"
        :class="{ mobile }"
      >
        <header>
          <h2>
            素材
            <span>{{ board.assets.length.toString().padStart(2, "0") }}</span>
          </h2>
          <button
            class="icon-button"
            aria-label="收起素材栏"
            @click="sidebar = false"
          >
            {{ mobile ? "×" : "‹" }}
          </button>
        </header>
        <div class="asset-add">
          <button @click="upload?.click()" :disabled="busy">＋ 上传图片</button
          ><button @click="emit('link')" :disabled="busy">↗ 添加链接</button>
        </div>
        <p class="sidebar-hint">
          {{
            mobile
              ? "新素材留在这里，点 ＋ 加入画板。"
              : "点 ＋ 加入画板，或拖到想放的位置。"
          }}
        </p>
        <div class="asset-list">
          <div v-for="a in board.assets" :key="a.id" class="asset-tile">
            <button
              class="asset-thumb"
              @click="assetDrag.click(a)"
              @pointerdown="assetDrag.start($event, a)"
              @pointermove="assetDrag.move"
              @pointerup="assetDrag.end($event)"
              @pointercancel="assetDrag.end($event, true)"
              @dragstart.prevent
              :aria-label="'查看素材：' + a.title"
            >
              <img
                v-if="a.data"
                :src="a.data"
                :alt="a.title"
                draggable="false"
              /><span v-else>↗<small>参考链接</small></span>
            </button>
            <div class="asset-row">
              <button class="asset-name" @click="emit('details', a)">
                {{ a.title }}</button
              ><button
                class="asset-plus"
                @click="add(a.id)"
                :aria-label="'加入画板：' + a.title"
                :disabled="board.items.length >= 150"
              >
                ＋
              </button>
            </div>
          </div>
          <div class="empty-materials" v-if="!board.assets.length">
            从一张图片开始。<br />也可以添加参考链接。
          </div>
        </div>
        <p class="sidebar-foot">
          PNG / JPEG / WebP · 单张 ≤ 12 MB<br />最多 100 份素材 ·
          图片仅保存在本机
        </p>
      </aside>
      <section class="canvas-area">
        <div
          class="context-toolbar"
          :class="{ 'has-selection': !!selectedAsset }"
          v-if="!preview"
        >
          <button v-if="!sidebar" @click="sidebar = true">▦ 素材</button
          ><template v-if="selectedAsset"
            ><span class="selection-title">{{ selectedAsset.title }}</span
            ><button
              v-if="mobile"
              class="close-tools"
              aria-label="收起素材工具"
              @click="selected = ''"
            >
              ×</button
            ><button @click="replace?.click()" :disabled="busy">替换图片</button
            ><button @click="emit('details', selectedAsset)">
              查看 / 编辑说明</button
            ><template v-if="!mobile"
              ><button
                @click="layer(-1)"
                :disabled="board.items[0]?.id === selected"
              >
                后移</button
              ><button
                @click="layer(1)"
                :disabled="board.items.at(-1)?.id === selected"
              >
                前移
              </button></template
            ><button class="danger-text" @click="remove">
              从画板移除
            </button></template
          ><span v-else class="toolbar-hint">{{
            mobile
              ? "选择画板素材，查看或修改说明"
              : "选择一份素材，开始编排你的方向"
          }}</span>
        </div>
        <div v-else class="preview-label-bar">预览 · 只留下你的方案</div>
        <BoardCanvas
          :board="board"
          :selected="selected"
          :preview="preview"
          :mobile="mobile"
          @select="
            (id) => {
              selected = id;
              if (mobile && id) sidebar = false;
            }
          "
          @change="emit('change', $event)"
          @details="showDetails"
          @add="add"
          @files="emit('upload', $event)"
        />
        <div class="editor-bottom">
          <span v-if="mobile">精细编排请在电脑完成，跨设备使用备份转移。</span
          ><span v-else
            >一页参考，一种方向。<span class="subtle">
              · 双击素材查看完整说明</span
            ></span
          ><span>{{ board.items.length }} 个画板元素</span>
        </div>
      </section>
    </div>
    <input
      ref="upload"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      multiple
      hidden
      @change="selectedFiles"
    /><input
      ref="replace"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      hidden
      @change="replaced"
    />
  </div>
</template>
