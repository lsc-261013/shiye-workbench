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
import TextInspector from "./TextInspector.vue";
import MultiInspector from "./MultiInspector.vue";
import CropEditor from "./CropEditor.vue";
import { useTextDraft } from "../composables/useTextDraft";
import { textDefaults, textLayout } from "../lib/text";
import { applyCrop } from "../lib/crop";
import { alignItems, type Alignment } from "../lib/alignment";
import { useNotesDraft } from "../composables/useNotesDraft";
import { useLayoutActions } from "../composables/useLayoutActions";
import {
  placeAt,
  copyObjects,
  pasteObjects,
  removeObjects,
  type ObjectClipboard,
} from "../lib/objects";
import { isTextInteraction } from "../lib/keyboard";
import { clone, uid, type Board, type Asset } from "../types";

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
  original: [];
  import: [];
  retry: [];
  prepareExport: [];
  notify: [message: string];
  start: [kind: "blank" | "product" | "life" | "creative"];
}>();
const selected = ref(""),
  selectedIds = ref<string[]>([]),
  focusedAsset = ref(""),
  preview = ref(false),
  library = ref(false),
  mobile = ref(false),
  exporting = ref(false);
const cropping = ref(false),
  shortcuts = ref(false),
  draggingAsset = ref(false);
const editorRoot = ref<HTMLElement>(),
  boardCanvas = ref<InstanceType<typeof BoardCanvas>>(),
  assetPanel = ref<InstanceType<typeof AssetLibrary>>();
let clipboard: ObjectClipboard | null = null,
  pasteIteration = 0;
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
const { draft, error: noteError, composing } = notes;
const textNotes = useTextDraft(
  () => selectedItem.value,
  () => props.board,
  (b) => emit("change", b),
);
const {
  draft: textDraft,
  error: textError,
  composing: textComposing,
} = textNotes;
const dirty = computed(() => notes.dirty.value || textNotes.dirty.value);
function saveCurrent() {
  return selectedItem.value?.kind === "text" ? textNotes.save() : notes.save();
}
function resetCurrent() {
  notes.reset();
  textNotes.reset();
}
function chooseRaw(id: string, assetId: string) {
  selected.value = id;
  selectedIds.value = id ? [id] : [];
  focusedAsset.value = assetId;
}
const layout = useLayoutActions(
  () => props.board,
  (b) => emit("change", b),
  chooseRaw,
  (message) => emit("notify", message),
  () => {
    if (mobile.value) library.value = false;
  },
);
const { working } = layout;
const busy = computed(() => props.busy || working.value);
const busyLabel = computed(() =>
  working.value ? layout.label.value : props.busyLabel,
);
function run(action: () => void) {
  if (busy.value || pendingAction.value) return;
  if (dirty.value) pendingAction.value = action;
  else action();
}
async function continueAction(save: boolean) {
  const action = pendingAction.value;
  if (save && !saveCurrent()) {
    pendingAction.value = null;
    return;
  }
  if (!save) resetCurrent();
  // Let the committed board reach props before a queued action clones it.
  await nextTick();
  pendingAction.value = null;
  action?.();
}
function saveNotes() {
  if (notes.save()) emit("notify", "笔记已更新，可撤销。");
}
function select(id: string, multiple = false) {
  if (multiple && !mobile.value) {
    run(() => {
      selectedIds.value = selectedIds.value.includes(id)
        ? selectedIds.value.filter((i) => i !== id)
        : [...selectedIds.value, id];
      selected.value =
        selectedIds.value.length === 1 ? selectedIds.value[0]! : "";
      focusedAsset.value = selectedItem.value?.assetId || "";
    });
    return;
  }
  if (
    selectedIds.value.length <= 1 &&
    id === selected.value &&
    (id || !focusedAsset.value)
  )
    return;
  run(() =>
    chooseRaw(id, props.board.items.find((p) => p.id === id)?.assetId || ""),
  );
}

function addText() {
  run(() => {
    if (props.board.items.length >= 150) {
      emit("notify", "画板已有150个对象，本次未添加。");
      return;
    }
    const b = clone(props.board),
      text = textDefaults(),
      size = { w: 480, h: textLayout(text, 480).height };
    const p = {
      id: uid(),
      kind: "text" as const,
      text,
      ...placeAt(
        size,
        800 + (b.items.length % 5) * 24,
        450 + (b.items.length % 5) * 24,
      ),
    };
    b.items.push(p);
    if (b.version === 1) b.version = 2;
    emit("change", b);
    chooseRaw(p.id, "");
  });
}
function saveText() {
  if (textNotes.save()) emit("notify", "文字已更新，可撤销。");
}
function focusObjects(ids: string[]) {
  if (mobile.value) return;
  nextTick(() => {
    document
      .querySelector<HTMLElement>(
        ids.length ? `[data-object-id="${ids[0]}"]` : ".board",
      )
      ?.focus({ preventScroll: true });
  });
}
function paste(snapshot: ObjectClipboard, iteration = 0) {
  try {
    const result = pasteObjects(props.board, snapshot, iteration);
    emit("change", result.board);
    selectedIds.value = result.ids;
    selected.value = result.ids.length === 1 ? result.ids[0]! : "";
    focusedAsset.value =
      result.ids.length === 1
        ? result.board.items.find((p) => p.id === selected.value)?.assetId || ""
        : "";
    focusObjects(result.ids);
    emit("notify", `已粘贴${result.ids.length}个对象，已有排版保持，可撤销。`);
    return true;
  } catch (e) {
    emit("notify", (e as Error).message);
    return false;
  }
}
function duplicate() {
  run(() => {
    if (selectedIds.value.length)
      paste(copyObjects(props.board, selectedIds.value));
  });
}
function copy() {
  run(() => {
    if (!selectedIds.value.length) return;
    clipboard = copyObjects(props.board, selectedIds.value);
    pasteIteration = 0;
    emit(
      "notify",
      `已复制${clipboard.items.length}个对象，本次编辑会话可用Ctrl+V粘贴。`,
    );
  });
}
function pasteClipboard() {
  if (clipboard)
    run(() => {
      if (paste(clipboard!, pasteIteration)) pasteIteration++;
    });
}
function align(action: Alignment) {
  run(() => {
    try {
      emit("change", alignItems(props.board, selectedIds.value, action));
      emit("notify", "已调整选中对象，可完整撤销。");
    } catch (e) {
      emit("notify", (e as Error).message);
    }
  });
}
function crop() {
  run(() => {
    if (selectedItem.value && selectedAsset.value?.data && !mobile.value)
      cropping.value = true;
  });
}
function restoreCrop() {
  run(() => {
    if (selectedItem.value)
      emit("change", applyCrop(props.board, selectedItem.value.id));
  });
}
function choose(a: Asset) {
  run(() => {
    chooseRaw(
      props.board.items.find((p) => p.assetId === a.id)?.id || "",
      a.id,
    );
    if (mobile.value) library.value = false;
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
    if (!selectedIds.value.length) return;
    const count = selectedIds.value.length;
    emit("change", removeObjects(props.board, selectedIds.value));
    chooseRaw("", "");
    focusObjects([]);
    emit("notify", `已移除${count}个画板对象，素材保留，可撤销。`);
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
    library.value = true;
    uploadInput.value?.click();
  });
}
function link() {
  run(() => {
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

function historyAction(action: "undo" | "redo") {
  run(() => {
    if (action === "undo") emit("undo");
    else emit("redo");
    nextTick(() => {
      // Undoing an insertion can remove the focused object from the DOM.
      // Keep the next shortcut inside the editor without taking focus from inputs.
      if (document.activeElement === document.body)
        editorRoot.value
          ?.querySelector<HTMLElement>(".board")
          ?.focus({ preventScroll: true });
    });
  });
}

function keyboard(e: KeyboardEvent) {
  if (
    e.defaultPrevented ||
    document.querySelector("dialog[open]") ||
    isTextInteraction(e.target, e.isComposing) ||
    preview.value ||
    busy.value ||
    !(e.target instanceof Element) ||
    !editorRoot.value?.contains(e.target)
  )
    return;
  const key = e.key.toLowerCase(),
    mod = e.ctrlKey || e.metaKey;
  if (key === "escape") {
    boardCanvas.value?.cancelInteraction();
    assetPanel.value?.cancelInteraction();
    const opened = editorRoot.value.querySelector("details[open]");
    if (opened) {
      opened.removeAttribute("open");
      return;
    }
    if (library.value) {
      library.value = false;
      return;
    }
    select("");
    return;
  }
  if (mod && key === "c" && selectedIds.value.length) {
    e.preventDefault();
    if (!e.repeat) copy();
    return;
  }
  if (mod && key === "v" && clipboard) {
    e.preventDefault();
    if (!e.repeat) pasteClipboard();
    return;
  }
  if (mod && key === "z") {
    e.preventDefault();
    historyAction(e.shiftKey ? "redo" : "undo");
    return;
  }
  if (mod && key === "y") {
    e.preventDefault();
    historyAction("redo");
    return;
  }
  if (
    !mod &&
    (key === "delete" || key === "backspace") &&
    selectedIds.value.length
  ) {
    e.preventDefault();
    if (!e.repeat) remove();
  }
}
function beforeUnload(e: BeforeUnloadEvent) {
  if (dirty.value || working.value) e.preventDefault();
}
function mediaChange() {
  mobile.value = media.matches;
  if (mobile.value && selectedIds.value.length > 1)
    chooseRaw(
      selectedIds.value[0]!,
      props.board.items.find((p) => p.id === selectedIds.value[0])?.assetId ||
        "",
    );
  if (
    mobile.value &&
    !selectedItem.value &&
    !selectedAsset.value &&
    props.board.items[0]
  )
    chooseRaw(props.board.items[0].id, props.board.items[0].assetId || "");
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
      library.value = true;
    }
    if (selected.value && !b.items.some((p) => p.id === selected.value))
      selected.value = "";
    selectedIds.value = selectedIds.value.filter((id) =>
      b.items.some((p) => p.id === id),
    );
    if (
      focusedAsset.value &&
      !b.assets.some((a) => a.id === focusedAsset.value)
    )
      focusedAsset.value = "";
    if (
      mobile.value &&
      !selectedItem.value &&
      !selectedAsset.value &&
      b.items[0]
    )
      chooseRaw(b.items[0].id, b.items[0].assetId || "");
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
    ref="editorRoot"
    class="editor studio"
    :class="{
      'is-preview': preview,
      'is-mobile': mobile,
      'has-library': library,
      'dragging-asset': draggingAsset,
    }"
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
      @undo="historyAction('undo')"
      @redo="historyAction('redo')"
      @preview="run(() => (preview = !preview))"
      @export="openExport"
      @import="run(() => emit('import'))"
      @backup="run(() => emit('backup'))"
      @original="run(() => emit('original'))"
      @retry="emit('retry')"
      @start="(kind) => run(() => emit('start', kind))"
      @shortcuts="shortcuts = true"
    />
    <div class="workspace">
      <AssetLibrary
        v-if="library && !mobile && !preview"
        ref="assetPanel"
        :board="board"
        :selected-asset-id="selectedAsset?.id || ''"
        :busy="busy"
        :busy-label="busyLabel"
        :mobile="mobile"
        @choose="choose"
        @add="add"
        @upload="upload"
        @link="link"
        @close="library = false"
        @dragging="draggingAsset = $event"
      />
      <main class="canvas-area">
        <div v-if="!preview" class="studio-tools">
          <button class="reference-upload" :disabled="busy" @click="upload">
            <Icon name="upload" :size="16" />上传图片</button
          ><button :disabled="busy" @click="link">
            <Icon name="link" :size="16" />添加链接
          </button>
          <button :disabled="busy" @click="addText">添加文字</button>
          <button
            :disabled="busy || draggingAsset"
            :aria-expanded="library"
            @click="run(() => (library = !library))"
          >
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
          ref="boardCanvas"
          :board="board"
          :selected="selected"
          :selected-ids="selectedIds"
          :preview="preview"
          :mobile="mobile"
          :locked="busy"
          :editing="dirty"
          @select="select"
          @message="emit('notify', $event)"
          @change="emit('change', $event)"
          @details="showImage"
          @add="add"
          @files="(files) => run(() => emit('upload', files))"
        />
        <p v-if="!preview && !board.items.length" class="studio-empty">
          上传先收集到素材区，再拖到画板或点「添加到画板」。允许重叠，整理只在主动点击时进行。
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
              p.kind === 'text'
                ? '选择文字：' + p.text?.content.slice(0, 40)
                : '选择参考：' +
                  board.assets.find((a) => a.id === p.assetId)?.title
            "
            :aria-pressed="selected === p.id"
            :class="{ active: selected === p.id }"
            @click="select(p.id)"
          >
            <img
              v-if="board.assets.find((a) => a.id === p.assetId)?.data"
              :src="board.assets.find((a) => a.id === p.assetId)?.data"
              alt=""
            /><span v-else-if="p.kind === 'text'" class="text-strip-icon"
              >文</span
            ><Icon v-else name="link" /><span>{{
              p.kind === "text"
                ? p.text?.content
                : board.assets.find((a) => a.id === p.assetId)?.title
            }}</span>
          </button>
        </div>
        <TextInspector
          v-if="mobile && !preview && selectedItem?.kind === 'text'"
          :draft="textDraft"
          :dirty="textNotes.dirty.value"
          :error="textError"
          :composing="textComposing"
          :busy="busy"
          :can-back="selectedIndex > 0"
          :can-forward="
            selectedIndex >= 0 && selectedIndex < board.items.length - 1
          "
          @save="saveText"
          @cancel="textNotes.reset"
          @close="select('')"
          @duplicate="duplicate"
          @remove="remove"
          @layer="layer"
          @composition="textComposing = $event"
        />
        <SelectionInspector
          v-else-if="mobile && !preview"
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
          :mobile="mobile"
          :cropped="!!selectedItem?.crop"
          @crop="crop"
          @restore="restoreCrop"
          @duplicate="duplicate"
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
      <MultiInspector
        v-if="!mobile && !preview && selectedIds.length > 1"
        :count="selectedIds.length"
        :busy="busy"
        @align="align"
        @close="select('')"
      />
      <TextInspector
        v-else-if="!mobile && !preview && selectedItem?.kind === 'text'"
        :draft="textDraft"
        :dirty="textNotes.dirty.value"
        :error="textError"
        :composing="textComposing"
        :busy="busy"
        :can-back="selectedIndex > 0"
        :can-forward="
          selectedIndex >= 0 && selectedIndex < board.items.length - 1
        "
        @save="saveText"
        @cancel="textNotes.reset"
        @close="select('')"
        @duplicate="duplicate"
        @remove="remove"
        @layer="layer"
        @composition="textComposing = $event"
      />
      <SelectionInspector
        v-else-if="!mobile && !preview"
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
        :mobile="mobile"
        :cropped="!!selectedItem?.crop"
        @crop="crop"
        @restore="restoreCrop"
        @duplicate="duplicate"
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
      v-if="library && mobile"
      title="素材区"
      kind="references"
      @close="library = false"
      ><AssetLibrary
        ref="assetPanel"
        :board="board"
        :selected-asset-id="selectedAsset?.id || ''"
        :busy="busy"
        :busy-label="busyLabel"
        :mobile="mobile"
        @choose="choose"
        @add="add"
        @upload="upload"
        @link="link"
        @close="library = false"
        @dragging="draggingAsset = $event"
    /></Modal>
    <Modal
      v-if="shortcuts"
      title="常用快捷键"
      kind="shortcuts"
      @close="shortcuts = false"
      ><p>在画板选择对象后使用；输入框内保留正常文字操作。</p>
      <dl class="shortcut-list">
        <dt>Backspace / Delete</dt>
        <dd>移除选中对象 · 素材保留</dd>
        <dt>Ctrl+C / Ctrl+V</dt>
        <dd>复制快照 / 在附近粘贴 · 本次编辑会话</dd>
        <dt>Ctrl+Z</dt>
        <dd>撤销</dd>
        <dt>Ctrl+Shift+Z / Ctrl+Y</dt>
        <dd>重做</dd>
        <dt>Esc</dt>
        <dd>取消当前操作 / 关闭浮层 / 取消选择</dd>
        <dt>方向键 / Shift+方向键</dt>
        <dd>微调10 / 20画板像素 · 桌面</dd>
      </dl>
      <p class="context-help">
        对象复制仅在本次编辑会话可用。输入中保持正常文字操作；裁切中方向键调整角点。Mac使用Cmd对应键。
      </p></Modal
    >
    <Modal
      v-if="pendingAction"
      title="修改还没保存"
      kind="unsaved"
      @close="pendingAction = null"
      ><p>
        先处理「{{
          selectedItem?.kind === "text" ? "当前文字" : selectedAsset?.title
        }}」的修改，再继续。文字不会写到下一份参考。
      </p>
      <div class="modal-actions">
        <button @click="pendingAction = null">继续编辑</button
        ><button @click="continueAction(false)">放弃修改并继续</button
        ><button
          class="primary"
          :disabled="composing || textComposing"
          @click="continueAction(true)"
        >
          保存并继续
        </button>
      </div></Modal
    >
    <ImageViewer v-if="viewer" :asset="viewer" @close="viewer = undefined" />
    <CropEditor
      v-if="cropping && selectedAsset && selectedItem"
      :asset="selectedAsset"
      :crop="selectedItem.crop"
      @close="cropping = false"
      @save="
        (value) => {
          emit('change', applyCrop(board, selectedItem!.id, value));
          cropping = false;
          emit('notify', '当前对象已裁切，原图保持，可撤销。');
        }
      "
    />
    <ExportPanel
      v-if="exporting"
      :busy="busy"
      :busy-label="busyLabel"
      :result="exportResult"
      :title="board.title"
      :version="board.version"
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
