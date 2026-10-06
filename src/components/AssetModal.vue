<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import Modal from "./Modal.vue";
import { type Asset, clone, safeUrl } from "../types";
import { readImage } from "../lib/data";
const props = defineProps<{ asset: Asset; saving: boolean }>();
const emit = defineEmits<{ close: []; save: [asset: Asset] }>();
const draft = ref(clone(props.asset));
const error = ref("");
const reading = ref(false),
  composing = ref(false),
  discarding = ref(false);
const busy = computed(() => reading.value || props.saving);
const dirty = computed(
  () => JSON.stringify(draft.value) !== JSON.stringify(props.asset),
);
function close() {
  if (busy.value) return;
  if (dirty.value) discarding.value = true;
  else emit("close");
}
function beforeUnload(e: BeforeUnloadEvent) {
  if (dirty.value || busy.value) e.preventDefault();
}
onMounted(() => window.addEventListener("beforeunload", beforeUnload));
onBeforeUnmount(() => window.removeEventListener("beforeunload", beforeUnload));
async function screenshot(e: Event) {
  const input = e.target as HTMLInputElement,
    file = input.files?.[0];
  input.value = "";
  if (!file || busy.value) return;
  reading.value = true;
  try {
    draft.value.data = await readImage(file);
    error.value = "";
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    reading.value = false;
  }
}
function submit() {
  if (busy.value || composing.value) return;
  if (!draft.value.title.trim()) {
    error.value = "请填写素材名称";
    return;
  }
  if (!safeUrl(draft.value.source)) {
    error.value = "请填写完整的 http:// 或 https:// 参考网址";
    return;
  }
  draft.value.title = draft.value.title.trim();
  emit("save", clone(draft.value));
}
</script>
<template>
  <Modal title="添加参考链接" kind="asset" @close="close">
    <form
      @submit.prevent="submit"
      @compositionstart="composing = true"
      @compositionend="composing = false"
    >
      <label
        >素材名称<input
          v-model="draft.title"
          maxlength="120"
          required
          autofocus
          :disabled="busy"
          placeholder="给这份参考起个名字"
      /></label>
      <label
        >来源网址<input
          v-model="draft.source"
          maxlength="2048"
          type="url"
          required
          :disabled="busy"
          placeholder="https://"
      /></label>
      <a
        v-if="safeUrl(draft.source)"
        class="source-link"
        :href="safeUrl(draft.source)"
        target="_blank"
        rel="noopener noreferrer"
        >打开来源 ↗</a
      >
      <label
        >想法与笔记<textarea
          v-model="draft.note"
          maxlength="5000"
          rows="4"
          :disabled="busy"
          placeholder="写下想借鉴什么，稍后也可以修改。"
        ></textarea>
      </label>
      <label
        >附上截图（可选）<input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          :disabled="busy"
          @change="screenshot"
      /></label>
      <img
        v-if="draft.data"
        class="link-screenshot"
        :src="draft.data"
        alt="已附上的截图"
      />
      <p class="error" v-if="error" role="alert">{{ error }}</p>
      <div v-if="discarding" class="link-discard" role="alert">
        <p>放弃这次填写？参考尚未加入，当前草稿不会改变。</p>
        <div>
          <button type="button" @click="discarding = false">继续填写</button
          ><button type="button" @click="emit('close')">放弃填写</button>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" :disabled="busy" @click="close">取消</button
        ><button class="primary" :disabled="busy || composing">
          {{ reading ? "读取图片中…" : saving ? "添加中…" : "添加链接" }}
        </button>
      </div>
    </form>
  </Modal>
</template>
