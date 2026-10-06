<script setup lang="ts">
import { ref } from "vue";
import Modal from "./Modal.vue";
import Icon from "./Icon.vue";
import { type Asset, clone, safeUrl } from "../types";
import { readImage } from "../lib/data";
const props = defineProps<{ asset: Asset; fresh?: boolean }>();
const emit = defineEmits<{ close: []; save: [asset: Asset] }>();
const draft = ref(clone(props.asset));
const error = ref("");
const busy = ref(false);
const expanded = ref(false);
const composing = ref(false);
async function screenshot(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  busy.value = true;
  try {
    draft.value.data = await readImage(f);
    error.value = "";
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
function submit() {
  if (busy.value || composing.value) return;
  if (!draft.value.title.trim()) {
    error.value = "请填写素材名称";
    return;
  }
  if (draft.value.source && !safeUrl(draft.value.source)) {
    error.value = "请输入完整的 http:// 或 https:// 网址";
    return;
  }
  if (draft.value.kind === "link" && !draft.value.source) {
    error.value = "请填写参考网址";
    return;
  }
  draft.value.title = draft.value.title.trim();
  emit("save", draft.value);
}
</script>
<template>
  <Modal
    :title="fresh ? '添加参考链接' : '素材与借鉴点'"
    kind="asset"
    @close="emit('close')"
    ><form
      @submit.prevent="submit"
      @compositionstart="composing = true"
      @compositionend="composing = false"
    >
      <button
        type="button"
        class="asset-detail-image"
        :class="{ expanded }"
        v-if="draft.data"
        @click="expanded = !expanded"
        :aria-label="expanded ? '收起大图' : '展开大图'"
      >
        <img :src="draft.data" :alt="draft.title" />
        <span class="detail-image-label"
          ><Icon name="expand" :size="15" />
          {{ expanded ? "收起大图" : "展开大图" }}</span
        >
      </button>
      <p v-if="!fresh" class="subtle">
        修改说明会同步到画板中的这份素材，可撤销。
      </p>
      <label
        >素材名称<input
          v-model="draft.title"
          maxlength="120"
          required
          autofocus
          placeholder="给这份参考起个名字" /></label
      ><label
        >来源网址 <span>仅 HTTP / HTTPS</span
        ><input
          v-model="draft.source"
          maxlength="2048"
          type="url"
          placeholder="https://" /></label
      ><a
        v-if="safeUrl(draft.source)"
        class="source-link"
        :href="safeUrl(draft.source)"
        target="_blank"
        rel="noopener noreferrer"
        >主动打开来源 ↗</a
      ><label
        >借鉴点 <span>画板显示摘要，导出清单保留全文</span
        ><textarea
          v-model="draft.note"
          maxlength="5000"
          rows="4"
          placeholder="具体想借鉴什么？例如：标题层级、图片留白或色彩关系。"
        ></textarea></label
      ><label v-if="draft.kind === 'link'"
        >附上截图（可选）<input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          @change="screenshot"
      /></label>
      <p class="error" v-if="error" role="alert">{{ error }}</p>
      <div class="modal-actions">
        <button type="button" @click="emit('close')">取消</button
        ><button class="primary" :disabled="busy">
          {{ busy ? "读取图片中…" : "保存说明" }}
        </button>
      </div>
    </form></Modal
  >
</template>
