<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import BoardCanvas from "./BoardCanvas.vue";
import AssetLibrary from "./AssetLibrary.vue";
import SelectionInspector from "./SelectionInspector.vue";
import EditorToolbar from "./EditorToolbar.vue";
import ExportPanel from "./ExportPanel.vue";
import ImageViewer from "./ImageViewer.vue";
import Modal from "./Modal.vue";
import Icon from "./Icon.vue";
import { useNotesDraft } from "../composables/useNotesDraft";
import { useLayoutActions } from "../composables/useLayoutActions";
import { MAX_AUTO_ITEMS } from "../lib/layout";
import { isTextInteraction } from "../lib/keyboard";
import { clone, type Board, type Asset } from "../types";

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
  library = ref(false),
  mobile = ref(false),
  exporting = ref(false);
const viewer = ref<Asset>(),
  pendingAction = ref<(() => void) | null>(null);
const uploadInput = ref<HTMLInputElement>(),
  replaceInput = ref<HTMLInputElement>();
let media: MediaQueryList,
  replacementTarget = "";
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
const references = computed(
  () =>
    props.board.items.filter((p) => p.assetId === selectedAsset.value?.id)
      .length,
);
const notes = useNotesDraft(
  () => selectedAsset.value,
  () => props.board,
  (b) => emit("change", b),
);
const { draft, dirty, error: noteError, composing } = notes;
function chooseRaw(id: string, assetId: string) {
  selected.value = id;
  focusedAsset.value = assetId;
}
const layout = useLayoutActions(
  () => props.board,
  (b) => emit("change", b),
  chooseRaw,
  (message) => emit("notify", message),
  () => (library.value = false),
);
const { working, noSpace } = layout;
const busy = computed(() => props.busy || working.value);
const busyLabel = computed(() =>
  working.value ? "正在计算排版…" : props.busyLabel,
);
function run(action: () => void) {
  if (busy.value || pendingAction.value) return;
  if (dirty.value) pendingAction.value = action;
  else action();
}
function continueAction(save: boolean) {
  const action = pendingAction.value;
  if (save && !notes.save()) {
    pendingAction.value = null;
    return;
  }
  if (!save) notes.reset();
  pendingAction.value = null;
  action?.();
}
function saveNotes() {
  if (notes.save()) emit("notify", "笔记已更新，可撤销。");
}
function select(id: string) {
  if (id === selected.value && (id || !focusedAsset.value)) return;
  run(() =>
    chooseRaw(id, props.board.items.find((p) => p.id === id)?.assetId || ""),
  );
}
function choose(a: Asset) {
  run(() => {
    chooseRaw(
      props.board.items.find((p) => p.assetId === a.id)?.id || "",
      a.id,
    );
    library.value = false;
    nextTick(() => {
      if (mobile.value)
        document
          .querySelector(selectedItem.value ? ".board-viewport" : ".note-panel")
          ?.scrollIntoView({ block: "nearest" });
    });
  });
}
function showImage(assetId: string) {
  const a = props.board.assets.find((a) => a.id === assetId);
  if (!a?.data) return;
  const open = () => {
    chooseRaw(
      props.board.items.find((p) => p.assetId === a.id)?.id || "",
      a.id,
    );
    viewer.value = a;
  };
  if (selectedAsset.value?.id === assetId) viewer.value = a;
  else run(open);
}
function add(id: string, x?: number, y?: number) {
  run(() => {
    void layout.add(id, x, y);
  });
}
function arrange() {
  run(() => {
    void layout.arrange();
  });
}
function remove() {
  run(() => {
    const b = clone(props.board);
    b.items = b.items.filter((p) => p.id !== selected.value);
    emit("change", b);
    selected.value = "";
    emit("notify", "已从画板移除，参考仍保留在素材区，可撤销。");
  });
}
function layer(direction: number) {
  run(() => {
    const b = clone(props.board),
      i = selectedIndex.value,
      j = i + direction;
    if (i < 0 || j < 0 || j >= b.items.length) return;
    const [p] = b.items.splice(i, 1);
    b.items.splice(j, 0, p!);
    emit("change", b);
  });
}
function rename(e: Event) {
  const b = clone(props.board);
  b.title = (e.target as HTMLInputElement).value.trim() || "未命名视觉方案";
  emit("change", b);
}
function upload() {
  run(() => {
    library.value = false;
    uploadInput.value?.click();
  });
}
function link() {
  run(() => {
    library.value = false;
    emit("link");
  });
}
function selectedFiles(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  input.value = "";
  if (files.length) run(() => emit("upload", files));
}
function replace() {
  run(() => {
    replacementTarget = selectedAsset.value?.id || "";
    replaceInput.value?.click();
  });
}
function replaced(e: Event) {
  const input = e.target as HTMLInputElement,
    file = input.files?.[0],
    target = replacementTarget;
  input.value = "";
  replacementTarget = "";
  if (file && target) run(() => emit("replace", target, file));
}
function openExport() {
  run(() => {
    emit("prepareExport");
    exporting.value = true;
  });
}
function keyboard(e: KeyboardEvent) {
  if (
    document.querySelector("dialog[open]") ||
    isTextInteraction(e.target, e.isComposing) ||
    preview.value ||
    busy.value
  )
    return;
  if (e.key === "Escape") {
    select("");
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    run(() => (e.shiftKey ? emit("redo") : emit("undo")));
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
    e.preventDefault();
    run(() => emit("redo"));
  }
  if (e.key === "Delete" && selectedItem.value) {
    e.preventDefault();
    remove();
  }
}
function beforeUnload(e: BeforeUnloadEvent) {
  if (dirty.value || working.value) e.preventDefault();
}
function mediaChange() {
  mobile.value = media.matches;
  if (mobile.value && !selectedAsset.value && props.board.items[0])
    chooseRaw(props.board.items[0].id, props.board.items[0].assetId);
}
watch(
  () => props.board,
  (b, old) => {
    const added = b.assets.find(
      (a) => !old.assets.some((previous) => previous.id === a.id),
    );
    if (added && !dirty.value) {
      chooseRaw(
        b.items.find((p) => p.assetId === added.id)?.id || "",
        added.id,
      );
      library.value = false;
    }
    if (selected.value && !b.items.some((p) => p.id === selected.value))
      selected.value = "";
    if (
      focusedAsset.value &&
      !b.assets.some((a) => a.id === focusedAsset.value)
    )
      focusedAsset.value = "";
    if (mobile.value && !selectedAsset.value && b.items[0])
      chooseRaw(b.items[0].id, b.items[0].assetId);
  },
);
onMounted(() => {
  media = matchMedia(
    "(max-width: 760px), (max-width: 1000px) and (max-height: 500px) and (orientation: landscape)",
  );
  mediaChange();
  media.addEventListener("change", mediaChange);
  window.addEventListener("keydown", keyboard);
  window.addEventListener("beforeunload", beforeUnload);
});
onBeforeUnmount(() => {
  media.removeEventListener("change", mediaChange);
  window.removeEventListener("keydown", keyboard);
  window.removeEventListener("beforeunload", beforeUnload);
});
</script>
<template>
  <div
    class="editor studio"
    :class="{ 'is-preview': preview, 'is-mobile': mobile }"
  >
    <EditorToolbar
      :title="board.title"
      :save-state="saveState"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :busy="busy"
      :preview="preview"
      @home="run(() => emit('home'))"
      @rename="rename"
      @undo="run(() => emit('undo'))"
      @redo="run(() => emit('redo'))"
      @preview="run(() => (preview = !preview))"
      @export="openExport"
      @import="run(() => emit('import'))"
      @backup="run(() => emit('backup'))"
      @retry="emit('retry')"
      @start="(kind) => run(() => emit('start', kind))"
    />
    <div class="workspace">
      <main class="canvas-area">
        <div v-if="!preview" class="studio-tools">
          <button class="reference-upload" :disabled="busy" @click="upload">
            <Icon name="upload" :size="16" />上传图片</button
          ><button :disabled="busy" @click="link">
            <Icon name="link" :size="16" />添加链接
          </button>
          <button :disabled="busy" @click="run(() => (library = true))">
            <Icon name="grid" :size="16" />素材区
            <span>{{ board.assets.length }}</span>
          </button>
          <button
            class="arrange-button"
            :disabled="busy || !board.items.length"
            @click="arrange"
          >
            <Icon name="grid" :size="16" />{{
              working ? "整理中…" : "整理排版"
            }}
          </button>
        </div>
        <div v-else class="preview-label-bar">
          <span class="red-rule"></span>作品预览
        </div>
        <BoardCanvas
          :board="board"
          :selected="selected"
          :preview="preview"
          :mobile="mobile"
          :locked="busy"
          :editing="dirty"
          @select="select"
          @change="emit('change', $event)"
          @details="showImage"
          @add="add"
          @files="(files) => run(() => emit('upload', files))"
        />
        <p v-if="!preview && !board.items.length" class="studio-empty">
          上传或添加链接，参考会放入空位。准备好后，点「整理排版」。
        </p>
        <div
          v-if="mobile && !preview && board.items.length"
          class="studio-strip"
          aria-label="画板参考浏览"
        >
          <button
            v-for="p in board.items"
            :key="p.id"
            :aria-label="
              '选择参考：' + board.assets.find((a) => a.id === p.assetId)?.title
            "
            :aria-pressed="selected === p.id"
            :class="{ active: selected === p.id }"
            @click="select(p.id)"
          >
            <img
              v-if="board.assets.find((a) => a.id === p.assetId)?.data"
              :src="board.assets.find((a) => a.id === p.assetId)?.data"
              alt=""
            /><Icon v-else name="link" /><span>{{
              board.assets.find((a) => a.id === p.assetId)?.title
            }}</span>
          </button>
        </div>
        <SelectionInspector
          v-if="mobile && !preview"
          :asset="selectedAsset"
          :draft="draft"
          :dirty="dirty"
          :error="noteError"
          :on-board="!!selectedItem"
          :references="references"
          :can-back="selectedIndex > 0"
          :can-forward="
            selectedIndex >= 0 && selectedIndex < board.items.length - 1
          "
          :busy="busy"
          :composing="composing"
          @view="showImage(selectedAsset!.id)"
          @save="saveNotes"
          @cancel="notes.reset"
          @replace="replace"
          @remove="remove"
          @layer="layer"
          @add="add"
          @close="select('')"
          @composition="composing = $event"
        />
      </main>
      <SelectionInspector
        v-if="!mobile && !preview"
        :asset="selectedAsset"
        :draft="draft"
        :dirty="dirty"
        :error="noteError"
        :on-board="!!selectedItem"
        :references="references"
        :can-back="selectedIndex > 0"
        :can-forward="
          selectedIndex >= 0 && selectedIndex < board.items.length - 1
        "
        :busy="busy"
        :composing="composing"
        @view="showImage(selectedAsset!.id)"
        @save="saveNotes"
        @cancel="notes.reset"
        @replace="replace"
        @remove="remove"
        @layer="layer"
        @add="add"
        @close="select('')"
        @composition="composing = $event"
      />
    </div>
    <Modal
      v-if="library"
      title="素材区"
      kind="references"
      @close="library = false"
      ><AssetLibrary
        :board="board"
        :selected-asset-id="selectedAsset?.id || ''"
        :busy="busy"
        :busy-label="busyLabel"
        @choose="choose"
        @add="add"
        @upload="upload"
        @link="link"
    /></Modal>
    <Modal
      v-if="pendingAction"
      title="这条笔记还没保存"
      kind="unsaved"
      @close="pendingAction = null"
      ><p>
        先处理「{{
          selectedAsset?.title
        }}」的修改，再继续。文字不会写到下一份参考。
      </p>
      <div class="modal-actions">
        <button @click="pendingAction = null">继续编辑</button
        ><button @click="continueAction(false)">放弃修改并继续</button
        ><button
          class="primary"
          :disabled="composing"
          @click="continueAction(true)"
        >
          保存并继续
        </button>
      </div></Modal
    >
    <Modal
      v-if="noSpace"
      title="暂时没有合适空位"
      kind="no-space"
      @close="noSpace = ''"
      ><p>参考已经留在素材区，原来的排版没有改动。</p>
      <p>
        {{
          board.items.length >= MAX_AUTO_ITEMS
            ? "整理适合一页最多12个元素。先移除部分元素，再加入这份参考。"
            : "也可以明确整理整张画板，并把这份参考一起放入；一次撤销就能恢复。"
        }}
      </p>
      <div class="modal-actions">
        <button @click="noSpace = ''">留在素材区</button
        ><button
          class="primary"
          :disabled="busy || board.items.length >= MAX_AUTO_ITEMS"
          @click="layout.arrange(noSpace)"
        >
          整理后加入
        </button>
      </div></Modal
    >
    <ImageViewer v-if="viewer" :asset="viewer" @close="viewer = undefined" />
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
    /><input
      ref="replaceInput"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      hidden
      @change="replaced"
    />
  </div>
</template>
