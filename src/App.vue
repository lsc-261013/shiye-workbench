<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from "vue";
import Home from "./components/Home.vue";
import Editor from "./components/Editor.vue";
import Modal from "./components/Modal.vue";
import AssetModal from "./components/AssetModal.vue";
import { type Board, type Asset, clone, uid } from "./types";
import {
  blank,
  readImage,
  parseBackup,
  validateBoard,
  download,
  backupBlob,
  fileName,
  textList,
  MAX_TOTAL_DATA,
} from "./lib/data";
import { loadBoard, saveBoard } from "./lib/storage";
import { example } from "./lib/examples";
import { History } from "./lib/history";
import { renderPng } from "./lib/export";
const board = ref<Board>(blank()),
  hasDraft = ref(false),
  page = ref<"home" | "editor">("home"),
  busy = ref(true),
  saveState = ref("尚未保存"),
  notice = ref(""),
  error = ref(""),
  details = ref<Asset | null>(null),
  fresh = ref(false),
  pending = ref<Board | null>(null),
  importInput = ref<HTMLInputElement>();
const history = reactive(new History<Board>());
let timer: ReturnType<typeof setTimeout>;
let noticeTimer: ReturnType<typeof setTimeout>;
let revision = 0;
let queue = Promise.resolve();
let recoveryIssue = false;
function notify(message: string) {
  notice.value = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => (notice.value = ""), 6500);
}
function schedule() {
  saveState.value = "保存中…";
  revision++;
  clearTimeout(timer);
  timer = setTimeout(save, 350);
}
async function save() {
  const snapshot = clone(board.value),
    r = revision;
  saveState.value = "保存中…";
  queue = queue.then(async () => {
    try {
      await saveBoard(snapshot);
      if (r === revision) {
        saveState.value = "已保存到本机";
        hasDraft.value = true;
      }
    } catch {
      if (r === revision) saveState.value = "保存失败";
      notify("本机保存失败，当前编辑仍在。可重试或导出完整备份。");
    }
  });
  await queue;
}
function change(next: Board) {
  if (next.assets.reduce((n, a) => n + a.data.length, 0) > MAX_TOTAL_DATA) {
    error.value = "方案图片总量超过 90 MB，请使用更小的图片。当前内容未修改。";
    return false;
  }
  if (JSON.stringify(next) === JSON.stringify(board.value)) return true;
  history.push(board.value);
  board.value = clone(next);
  schedule();
  return true;
}
function undo() {
  const b = history.undo(board.value);
  if (b) {
    board.value = b;
    schedule();
  }
}
function redo() {
  const b = history.redo(board.value);
  if (b) {
    board.value = b;
    schedule();
  }
}
function useBoard(b: Board) {
  board.value = b;
  history.clear();
  hasDraft.value = true;
  page.value = "editor";
  pending.value = null;
  recoveryIssue = false;
  schedule();
  notify("素材只保存在当前浏览器。清理浏览器数据前，请导出完整备份。");
}
function propose(b: Board) {
  if (hasDraft.value || recoveryIssue) pending.value = b;
  else useBoard(b);
}
async function start(kind: "blank" | "product" | "life") {
  if (busy.value) return;
  busy.value = true;
  try {
    propose(kind === "blank" ? blank() : await example(kind));
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function upload(files: File[]) {
  if (busy.value) {
    notify("正在处理文件，请稍后再试。");
    return;
  }
  if (!files.length) return;
  if (files.length + board.value.assets.length > 100) {
    error.value = "最多保存 100 份素材，请减少本次上传数量";
    return;
  }
  busy.value = true;
  const added: Asset[] = [];
  const failures: string[] = [];
  for (const f of files) {
    try {
      added.push({
        id: uid(),
        kind: "image",
        title: f.name.slice(0, 120),
        source: "",
        note: "",
        data: await readImage(f),
      });
    } catch (e) {
      failures.push(`${f.name}：${(e as Error).message}`);
    }
  }
  if (added.length) {
    const b = clone(board.value);
    b.assets.push(...added);
    if (change(b)) notify("图片已加入素材栏，点 ＋ 加入画板。");
  }
  if (failures.length) error.value = failures.join("\n");
  busy.value = false;
}
async function replace(id: string, file: File) {
  busy.value = true;
  try {
    const data = await readImage(file);
    const b = clone(board.value);
    b.assets.find((a) => a.id === id)!.data = data;
    if (change(b))
      notify(
        "图片已原位替换；位置、外框和层叠不变。请检查原来的来源与借鉴点。",
      );
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
function link() {
  if (board.value.assets.length >= 100) {
    error.value = "最多保存 100 份素材";
    return;
  }
  fresh.value = true;
  details.value = {
    id: uid(),
    kind: "link",
    title: "",
    source: "",
    note: "",
    data: "",
  };
}
function edit(asset: Asset) {
  fresh.value = false;
  details.value = asset;
}
function saveAsset(asset: Asset) {
  const b = clone(board.value);
  const i = b.assets.findIndex((a) => a.id === asset.id);
  if (i < 0) b.assets.push(asset);
  else b.assets[i] = asset;
  if (!change(b)) return;
  details.value = null;
  notify("说明已更新。");
}
function backup() {
  download(
    backupBlob(board.value),
    fileName(board.value.title) + ".shiye.json",
  );
  notify("完整备份已生成，包含图片、说明和布局。");
}
function exportText() {
  download(
    new Blob([textList(board.value)], { type: "text/plain;charset=utf-8" }),
    fileName(board.value.title) + "-参考清单.txt",
  );
  notify("参考清单已生成。");
}
async function png() {
  busy.value = true;
  try {
    const blob = await renderPng(clone(board.value));
    download(blob, fileName(board.value.title) + ".png");
    notify("PNG 已生成 · 1600 × 1000");
  } catch (e) {
    error.value = "导出失败，当前草稿未受影响。" + (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function imported(e: Event) {
  const el = e.target as HTMLInputElement;
  const file = el.files?.[0];
  el.value = "";
  if (!file) return;
  busy.value = true;
  try {
    propose(await parseBackup(file));
  } catch (e) {
    error.value = "导入失败，原草稿保持不变。" + (e as Error).message;
  } finally {
    busy.value = false;
  }
}
function beforeUnload(e: BeforeUnloadEvent) {
  if (saveState.value === "保存中…" || saveState.value === "保存失败") {
    e.preventDefault();
  }
}
onMounted(async () => {
  window.addEventListener("beforeunload", beforeUnload);
  try {
    const saved = await loadBoard();
    if (saved) {
      board.value = validateBoard(saved);
      hasDraft.value = true;
      saveState.value = "已保存到本机";
    }
  } catch {
    recoveryIssue = true;
    error.value =
      "无法读取本机草稿。原存储尚未改动，可关闭其他页面后刷新重试，或导入备份。";
  } finally {
    busy.value = false;
  }
});
onBeforeUnmount(() => window.removeEventListener("beforeunload", beforeUnload));
</script>
<template>
  <Home
    v-if="page === 'home'"
    :has-draft="hasDraft"
    :busy="busy"
    @start="start"
    @resume="page = 'editor'"
  /><Editor
    v-else
    :board="board"
    :save-state="saveState"
    :can-undo="history.past.length > 0"
    :can-redo="history.future.length > 0"
    :busy="busy"
    @change="change"
    @home="page = 'home'"
    @undo="undo"
    @redo="redo"
    @upload="upload"
    @replace="replace"
    @details="edit"
    @link="link"
    @png="png"
    @text="exportText"
    @backup="backup"
    @import="importInput?.click()"
    @retry="save"
    @start="start"
  />
  <div v-if="notice" class="toast" role="status">
    {{ notice }}<button aria-label="关闭提示" @click="notice = ''">×</button>
  </div>
  <AssetModal
    v-if="details"
    :asset="details"
    :fresh="fresh"
    @save="saveAsset"
    @close="details = null"
  /><Modal v-if="pending" title="替换当前草稿？" @close="pending = null"
    ><p>
      此浏览器只保留一份当前草稿。继续后将使用「{{
        pending.title
      }}」，原草稿的撤销历史也会清空。
    </p>
    <p class="subtle">
      需要保留原方案时，请先导出完整备份。示例原稿始终可以重新打开。
    </p>
    <div class="modal-actions">
      <button @click="backup" :disabled="!hasDraft">先备份当前草稿</button
      ><button @click="pending = null">取消</button
      ><button class="primary" @click="useBoard(pending!)">确认替换</button>
    </div></Modal
  ><Modal v-if="error" title="操作未完成" @close="error = ''"
    ><p class="error-message" role="alert">{{ error }}</p>
    <div class="modal-actions">
      <button v-if="hasDraft" @click="backup">导出当前备份</button
      ><button class="primary" @click="error = ''">知道了</button>
    </div></Modal
  ><input
    ref="importInput"
    type="file"
    accept=".json,.shiye.json,application/json"
    hidden
    @change="imported"
  />
</template>
