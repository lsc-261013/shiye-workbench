<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue";
import BoardCanvas from "./BoardCanvas.vue";
import AssetLibrary from "./AssetLibrary.vue";
import SelectionInspector from "./SelectionInspector.vue";
import ExportPanel from "./ExportPanel.vue";
import Modal from "./Modal.vue";
import Icon from "./Icon.vue";
import { isTextInteraction } from "../lib/keyboard";
import { type Board, type Asset, clone, uid, WIDTH, HEIGHT } from "../types";
const props = defineProps<{
  board: Board;
  saveState: string;
  canUndo: boolean;
  canRedo: boolean;
  busy: boolean;
  busyLabel: string;
  exportResult: string;
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
  prepareExport: [];
  notify: [message: string];
  start: [kind: "blank" | "product" | "life"];
}>();
const selected = ref(""),
  focusedAsset = ref(""),
  preview = ref(false),
  sidebar = ref(true),
  mobile = ref(false),
  exporting = ref(false);
const uploadInput = ref<HTMLInputElement>(),
  replaceInput = ref<HTMLInputElement>(),
  more = ref<HTMLDetailsElement>();
let media: MediaQueryList;
let replacementTarget = "";
const selectedItem = computed(() =>
  props.board.items.find((p) => p.id === selected.value),
);
const selectedAsset = computed(() =>
  props.board.assets.find(
    (a) => a.id === (selectedItem.value?.assetId || focusedAsset.value),
  ),
);
const selectedIndex = computed(() =>
  props.board.items.findIndex((p) => p.id === selected.value),
);
const referenceCount = computed(
  () =>
    props.board.items.filter((p) => p.assetId === selectedAsset.value?.id)
      .length,
);
function select(id: string) {
  selected.value = id;
  focusedAsset.value =
    props.board.items.find((p) => p.id === id)?.assetId || "";
}
function choose(a: Asset) {
  focusedAsset.value = a.id;
  selected.value = props.board.items.find((p) => p.assetId === a.id)?.id || "";
  if (mobile.value) sidebar.value = false;
}
function mediaChange() {
  mobile.value = media.matches;
  sidebar.value = !mobile.value;
  if (mobile.value && !selectedAsset.value && props.board.items[0])
    select(props.board.items[0].id);
}
watch(
  () => props.board,
  () => {
    if (selected.value && !selectedItem.value) selected.value = "";
    if (
      focusedAsset.value &&
      !props.board.assets.some((a) => a.id === focusedAsset.value)
    )
      focusedAsset.value = "";
    if (mobile.value && !selectedAsset.value && props.board.items[0])
      select(props.board.items[0].id);
  },
);
onMounted(() => {
  media = matchMedia(
    "(max-width: 760px), (max-width: 1000px) and (max-height: 500px) and (orientation: landscape)",
  );
  mediaChange();
  media.addEventListener("change", mediaChange);
  window.addEventListener("keydown", keyboard);
  window.addEventListener("click", outsideMenu);
});
onBeforeUnmount(() => {
  media.removeEventListener("change", mediaChange);
  window.removeEventListener("keydown", keyboard);
  window.removeEventListener("click", outsideMenu);
});
function outsideMenu(e: MouseEvent) {
  if (more.value && !more.value.contains(e.target as Node))
    more.value.open = false;
}
function keyboard(e: KeyboardEvent) {
  if (
    document.querySelector("dialog[open]") ||
    isTextInteraction(e.target, e.isComposing) ||
    preview.value
  )
    return;
  if (e.key === "Escape") {
    select("");
    if (more.value) more.value.open = false;
    return;
  }
  if (props.busy) return;
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
}
function add(
  id: string,
  x = 80 + (props.board.items.length % 4) * 70,
  y = 150 + (props.board.items.length % 4) * 60,
) {
  if (props.busy) return;
  if (props.board.items.length >= 150) {
    emit("notify", "画板最多放置 150 个元素，先移除一个再添加。");
    return;
  }
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
  focusedAsset.value = id;
  if (mobile.value) sidebar.value = false;
  emit("notify", "已加入画板，可继续编排或补充借鉴点。");
}
function remove() {
  const b = clone(props.board);
  b.items = b.items.filter((p) => p.id !== selected.value);
  emit("change", b);
  selected.value = "";
  emit("notify", "已从画板移除，素材仍在；可以撤销。");
}
function layer(direction: number) {
  const b = clone(props.board),
    i = selectedIndex.value,
    j = i + direction;
  if (i >= 0 && j >= 0 && j < b.items.length) {
    const [p] = b.items.splice(i, 1);
    b.items.splice(j, 0, p!);
    emit("change", b);
    emit("notify", direction > 0 ? "已前移一层。" : "已后移一层。");
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
function requestReplacement() {
  replacementTarget = selectedAsset.value?.id || "";
  replaceInput.value?.click();
}
function replaced(e: Event) {
  const t = e.target as HTMLInputElement,
    f = t.files?.[0];
  if (f && replacementTarget) emit("replace", replacementTarget, f);
  t.value = "";
  replacementTarget = "";
}
function showDetails(id: string) {
  const a = props.board.assets.find((a) => a.id === id);
  if (a) emit("details", a);
}
function openExport() {
  emit("prepareExport");
  exporting.value = true;
}
function menuAction(action: () => void) {
  if (more.value) more.value.open = false;
  action();
}
</script>
<template>
  <div class="editor" :class="{ 'is-preview': preview, 'is-mobile': mobile }">
    <header class="editor-top">
      <button class="editor-home" @click="emit('home')" aria-label="返回首页">
        <Icon name="back" /><span class="mini-brand">拾页</span>
      </button>
      <div class="project-meta">
        <input
          aria-label="方案名称"
          :value="board.title"
          maxlength="100"
          @change="rename"
          @blur="rename"
          :readonly="preview || busy"
        /><button
          v-if="saveState.includes('失败')"
          class="save-error"
          @click="emit('retry')"
        >
          保存失败 · 点击重试</button
        ><span
          v-else
          class="save-state"
          :data-state="saveState.includes('中') ? 'saving' : 'saved'"
          role="status"
          ><span v-if="saveState.includes('中')" class="spinner"></span
          ><Icon v-else name="check" :size="11" />{{ saveState }}</span
        >
      </div>
      <div class="editor-actions">
        <div class="history-actions" v-if="!preview">
          <button
            :disabled="!canUndo || busy"
            @click="emit('undo')"
            title="撤销 Ctrl+Z"
            aria-label="撤销"
          >
            <Icon name="undo" /></button
          ><button
            :disabled="!canRedo || busy"
            @click="emit('redo')"
            title="重做 Ctrl+Shift+Z"
            aria-label="重做"
          >
            <Icon name="redo" />
          </button>
        </div>
        <button
          class="preview-toggle"
          @click="preview = !preview"
          :aria-pressed="preview"
        >
          <Icon :name="preview ? 'edit' : 'eye'" />{{
            preview ? "返回编辑" : "预览作品"
          }}
        </button>
        <button class="primary export-trigger" @click="openExport">
          <Icon name="download" :size="16" />导出<span class="desktop-only"
            >作品</span
          >
        </button>
        <details ref="more" class="more-menu">
          <summary aria-label="更多操作">
            <Icon name="more" :size="22" />
          </summary>
          <div class="menu-panel">
            <span class="menu-label">当前方案</span
            ><button @click="menuAction(() => emit('import'))" :disabled="busy">
              <Icon name="upload" :size="15" />导入完整备份</button
            ><button @click="menuAction(() => emit('backup'))" :disabled="busy">
              <Icon name="file" :size="15" />保存完整备份 JSON
            </button>
            <hr />
            <span class="menu-label">开始另一页 · 将确认替换草稿</span
            ><button
              @click="menuAction(() => emit('start', 'blank'))"
              :disabled="busy"
            >
              新建空白方案</button
            ><button
              @click="menuAction(() => emit('start', 'product'))"
              :disabled="busy"
            >
              使用「留白之间」示例</button
            ><button
              @click="menuAction(() => emit('start', 'life'))"
              :disabled="busy"
            >
              使用「光与日常」示例
            </button>
          </div>
        </details>
      </div>
    </header>
    <div class="workspace">
      <AssetLibrary
        v-if="!mobile && sidebar && !preview"
        :board="board"
        :mobile="false"
        :selected-asset-id="selectedAsset?.id || ''"
        :busy="busy"
        :busy-label="busyLabel"
        @choose="choose"
        @add="add"
        @upload="uploadInput?.click()"
        @link="emit('link')"
        @close="sidebar = false"
      />
      <main class="canvas-area">
        <div class="canvas-topline" v-if="!preview">
          <button
            v-if="mobile || !sidebar"
            class="library-toggle"
            @click="sidebar = true"
          >
            <Icon name="grid" :size="16" />素材
            <span>{{ board.assets.length }}</span></button
          ><span class="workspace-label">{{
            mobile ? "视觉板全貌" : "你的视觉板"
          }}</span
          ><span class="board-count"
            >{{ board.items.length }} 个元素
            <span class="desktop-only">/ 1600 × 1000</span></span
          >
        </div>
        <div v-else class="preview-label-bar">
          <span class="red-rule"></span>作品预览
          <small>只有画面、来源与想法</small>
        </div>
        <BoardCanvas
          :board="board"
          :selected="selected"
          :preview="preview"
          :mobile="mobile"
          :locked="busy"
          @select="select"
          @change="emit('change', $event)"
          @details="showDetails"
          @add="add"
          @files="emit('upload', $event)"
        />
        <div v-if="!preview && !board.items.length" class="empty-next-step">
          <button
            @click="mobile ? (sidebar = true) : uploadInput?.click()"
            :disabled="busy"
          >
            <Icon name="plus" :size="16" />{{
              board.assets.length ? "从素材栏点 ＋ 加入画板" : "上传第一张图片"
            }}</button
          ><span>也可以添加来源链接，慢慢找到自己的方向。</span>
        </div>
        <div class="editor-bottom" v-if="!mobile">
          <span>{{
            preview
              ? "准备好了，就把这一页带走。"
              : "拖动编排 · 角点缩放 · 双击查看说明"
          }}</span
          ><span>本地创作 / SHIYE STUDIO</span>
        </div>
        <section
          v-if="mobile && !preview && board.items.length"
          class="mobile-references"
          aria-label="画板素材浏览"
        >
          <div>
            <h2>画板里的参考</h2>
            <span>点选后，往下看大图与笔记</span>
          </div>
          <div class="reference-strip">
            <button
              v-for="p in board.items"
              :key="p.id"
              :class="{ active: selected === p.id }"
              :aria-label="
                '查看画板详情：' +
                board.assets.find((a) => a.id === p.assetId)?.title
              "
              :aria-pressed="selected === p.id"
              @click="select(p.id)"
            >
              <img
                v-if="board.assets.find((a) => a.id === p.assetId)?.data"
                :src="board.assets.find((a) => a.id === p.assetId)?.data"
                alt=""
              /><Icon v-else name="link" :size="25" /><span>{{
                board.assets.find((a) => a.id === p.assetId)?.title
              }}</span>
            </button>
          </div>
        </section>
        <SelectionInspector
          v-if="mobile && !preview"
          :asset="selectedAsset"
          :on-board="!!selectedItem"
          :references="referenceCount"
          :can-back="false"
          :can-forward="false"
          :mobile="true"
          :busy="busy"
          @details="emit('details', $event)"
          @replace="requestReplacement"
          @remove="remove"
          @add="add"
          @close="select('')"
        />
        <p v-if="mobile" class="mobile-edit-note">
          {{
            preview
              ? "导出作品图用于展示，完整备份用于继续。"
              : "手机适合查看与轻编辑 · 精细编排请在电脑完成"
          }}
        </p>
      </main>
      <SelectionInspector
        v-if="!mobile && !preview"
        :asset="selectedAsset"
        :on-board="!!selectedItem"
        :references="referenceCount"
        :can-back="selectedIndex > 0"
        :can-forward="
          selectedIndex >= 0 && selectedIndex < board.items.length - 1
        "
        :mobile="false"
        :busy="busy"
        @details="emit('details', $event)"
        @replace="requestReplacement"
        @remove="remove"
        @layer="layer"
        @add="add"
        @close="select('')"
      />
    </div>
    <Modal
      v-if="mobile && sidebar && !preview"
      title="收集你的参考"
      kind="library"
      @close="sidebar = false"
      ><AssetLibrary
        :board="board"
        :mobile="true"
        :selected-asset-id="selectedAsset?.id || ''"
        :busy="busy"
        :busy-label="busyLabel"
        @choose="choose"
        @add="add"
        @upload="uploadInput?.click()"
        @link="emit('link')"
        @close="sidebar = false"
    /></Modal>
    <ExportPanel
      v-if="exporting"
      :busy="busy"
      :busy-label="busyLabel"
      :result="exportResult"
      :title="board.title"
      @close="exporting = false"
      @png="emit('png')"
      @text="emit('text')"
      @backup="emit('backup')"
    />
    <input
      ref="uploadInput"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      multiple
      hidden
      @change="selectedFiles"
    />
    <input
      ref="replaceInput"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      hidden
      @change="replaced"
    />
  </div>
</template>
