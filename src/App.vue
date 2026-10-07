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
import { loadBoard, saveBoard, loadOriginal } from "./lib/storage";
import { example } from "./lib/examples";
import { History } from "./lib/history";
import { renderPng } from "./lib/export";
import { DraftSaver } from "./lib/persistence";
import { replaceImage } from "./lib/crop";
const board = ref<Board>(blank()),
  hasDraft = ref(false),
  page = ref<"home" | "editor">("home"),
  busy = ref(true),
  saveState = ref("尚未保存"),
  notice = ref(""),
  error = ref(""),
  details = ref<Asset | null>(null),
  pending = ref<Board | null>(null),
  importInput = ref<HTMLInputElement>();
const busyLabel = ref("正在读取本机草稿…");
const exportResult = ref("");
const history = reactive(new History<Board>());
let timer: ReturnType<typeof setTimeout>;
let noticeTimer: ReturnType<typeof setTimeout>;
let recoveryIssue = false;
const saver = new DraftSaver(
  saveBoard,
  (state) => (saveState.value = state),
  () => notify("本机保存失败，当前编辑仍在。可点击重试，或导出完整备份。"),
  () => (hasDraft.value = true),
);
function notify(message: string) {
  notice.value = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => (notice.value = ""), 6500);
}
function schedule() {
  saver.changed();
  clearTimeout(timer);
  timer = setTimeout(save, 350);
}
async function save() {
  clearTimeout(timer);
  await saver.save(board.value);
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
    notify("已撤销上一步。");
  }
}
function redo() {
  const b = history.redo(board.value);
  if (b) {
    board.value = b;
    schedule();
    notify("已重做。");
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
async function start(kind: "blank" | "product" | "life" | "creative") {
  if (busy.value) return;
  busy.value = true;
  busyLabel.value = "正在准备示例素材…";
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
  busyLabel.value = "正在读取图片…";
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
  try {
    if (added.length) await collect(added);
    if (failures.length) error.value = failures.join("\n");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function collect(assets: Asset[]) {
  const b = clone(board.value);
  b.assets.push(...assets);
  if (!change(b)) return false;
  notify(
    `已收集${assets.length}份到素材区。拖入画板或点「添加到画板」，已有排版保持。`,
  );
  return true;
}
async function replace(id: string, file: File) {
  if (busy.value) return;
  busy.value = true;
  busyLabel.value = "正在替换图片…";
  try {
    const data = await readImage(file);
    const b = replaceImage(board.value, id, data);
    if (change(b))
      notify(
        "图片已原位替换，共享实例的裁切已恢复完整图；位置、外框和层叠不变，可撤销。请检查来源与笔记。",
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
  details.value = {
    id: uid(),
    kind: "link",
    title: "",
    source: "",
    note: "",
    data: "",
  };
}
async function saveAsset(asset: Asset) {
  if (busy.value) return;
  busy.value = true;
  busyLabel.value = "正在添加链接…";
  try {
    if (board.value.assets.length >= 100) throw Error("最多保存100份参考。");
    if (await collect([asset])) details.value = null;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
function backup() {
  try {
    download(
      backupBlob(board.value),
      fileName(board.value.title) + ".shiye.json",
    );
    exportResult.value = "完整备份已生成，已向浏览器发起 JSON 下载。";
    notify(exportResult.value);
  } catch (e) {
    exportResult.value = "备份生成失败，当前草稿仍在。";
    error.value = exportResult.value + (e as Error).message;
  }
}
async function backupOriginal() {
  try {
    const b = await loadOriginal();
    if (!b) {
      notify(
        "尚无升级前快照。现有旧稿保持原格式，首次保存新结构时会保留一份。",
      );
      return;
    }
    download(
      backupBlob(b),
      fileName(b.title) + `-升级前-v${b.version}.shiye.json`,
    );
    notify("已生成升级前原始备份，请连同当前完整备份保存。");
  } catch (e) {
    error.value = "读取升级前备份失败。" + (e as Error).message;
  }
}
function exportText() {
  try {
    download(
      new Blob([textList(board.value)], { type: "text/plain;charset=utf-8" }),
      fileName(board.value.title) + "-参考清单.txt",
    );
    exportResult.value = "来源与笔记清单已生成，已向浏览器发起 TXT 下载。";
    notify(exportResult.value);
  } catch (e) {
    exportResult.value = "清单生成失败，当前草稿仍在。";
    error.value = exportResult.value + (e as Error).message;
  }
}
async function png() {
  if (busy.value) return;
  busy.value = true;
  busyLabel.value = "正在生成作品图…";
  exportResult.value = "";
  try {
    const blob = await renderPng(clone(board.value));
    download(blob, fileName(board.value.title) + ".png");
    exportResult.value =
      "作品图已生成 · 1600 × 1000，已向浏览器发起 PNG 下载。";
    notify(exportResult.value);
  } catch (e) {
    error.value = "导出失败，当前草稿未受影响。" + (e as Error).message;
    exportResult.value = error.value;
  } finally {
    busy.value = false;
  }
}
async function imported(e: Event) {
  const el = e.target as HTMLInputElement;
  const file = el.files?.[0];
  el.value = "";
  if (!file) return;
  if (busy.value) return;
  busy.value = true;
  busyLabel.value = "正在校验完整备份…";
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
onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", beforeUnload);
  clearTimeout(timer);
  clearTimeout(noticeTimer);
});
</script>
<template>
  <Home
    v-if="page === 'home'"
    :has-draft="hasDraft"
    :busy="busy"
    :board="board"
    @start="start"
    @resume="page = 'editor'"
    @import="importInput?.click()"
  /><Editor
    v-else
    :board="board"
    :save-state="saveState"
    :can-undo="history.past.length > 0"
    :can-redo="history.future.length > 0"
    :busy="busy"
    :busy-label="busyLabel"
    :export-result="exportResult"
    @change="change"
    @home="page = 'home'"
    @undo="undo"
    @redo="redo"
    @upload="upload"
    @replace="replace"
    @link="link"
    @png="png"
    @text="exportText"
    @backup="backup"
    @original="backupOriginal"
    @import="importInput?.click()"
    @retry="save"
    @prepare-export="exportResult = ''"
    @notify="notify"
    @start="start"
  />
  <div v-if="notice" class="toast" role="status">
    {{ notice }}<button aria-label="关闭提示" @click="notice = ''">×</button>
  </div>
  <AssetModal
    v-if="details"
    :asset="details"
    :saving="busy"
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
