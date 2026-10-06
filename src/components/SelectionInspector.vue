<script setup lang="ts">
import { type Asset, safeUrl } from "../types";
import type { NotesDraft } from "../lib/notes";
import Icon from "./Icon.vue";
defineProps<{
  asset?: Asset;
  draft?: NotesDraft;
  dirty: boolean;
  error: string;
  onBoard: boolean;
  references: number;
  canBack: boolean;
  canForward: boolean;
  busy: boolean;
  composing: boolean;
}>();
defineEmits<{
  view: [];
  save: [];
  cancel: [];
  replace: [];
  remove: [];
  layer: [direction: number];
  add: [id: string];
  close: [];
  composition: [value: boolean];
}>();
</script>
<template>
  <section class="note-panel" aria-label="参考笔记" tabindex="-1">
    <template v-if="asset && draft">
      <header class="note-panel-heading">
        <h2>想法与笔记</h2>
        <button v-if="asset.data" :disabled="busy" @click="$emit('view')">
          <Icon name="expand" :size="16" />看大图</button
        ><button
          class="icon-button"
          aria-label="取消选择"
          :disabled="busy"
          @click="$emit('close')"
        >
          <Icon name="close" :size="17" />
        </button>
      </header>
      <form
        class="notes-form"
        @submit.prevent="$emit('save')"
        @compositionstart="$emit('composition', true)"
        @compositionend="$emit('composition', false)"
      >
        <label
          >素材名称<input
            v-model="draft.title"
            aria-label="素材名称"
            maxlength="120"
            required
            :disabled="busy"
        /></label>
        <div class="note-source-label">
          <label for="reference-source">来源网址</label
          ><a
            v-if="safeUrl(draft.source)"
            :href="safeUrl(draft.source)"
            target="_blank"
            rel="noopener noreferrer"
            >打开来源<Icon name="arrow" :size="14"
          /></a>
        </div>
        <input
          id="reference-source"
          v-model="draft.source"
          aria-label="来源网址"
          type="url"
          maxlength="2048"
          placeholder="https://（可选）"
          :disabled="busy"
        />
        <label class="note-writing"
          >想法与笔记<textarea
            v-model="draft.note"
            aria-label="想法与笔记"
            maxlength="5000"
            rows="6"
            placeholder="写下想借鉴什么，或留下一点自己的想法。"
            :disabled="busy"
          ></textarea>
        </label>
        <p class="note-shared" v-if="references > 1">
          {{ references }}份共用这张图片与笔记。
        </p>
        <p class="error" v-if="error" role="alert">{{ error }}</p>
        <div class="note-submit">
          <span role="status">{{ dirty ? "修改尚未提交" : "修改后保存" }}</span
          ><button
            v-if="dirty"
            type="button"
            :disabled="busy"
            @click="$emit('cancel')"
          >
            取消修改</button
          ><button class="primary" :disabled="busy || !dirty || composing">
            保存修改
          </button>
        </div>
      </form>
      <footer class="note-object-actions">
        <template v-if="!onBoard"
          ><p>这份参考暂在素材区。</p>
          <button :disabled="busy" @click="$emit('add', asset.id)">
            <Icon name="plus" />加入画板
          </button></template
        >
        <button :disabled="busy" @click="$emit('replace')">
          <Icon name="replace" :size="16" />{{
            asset.data ? "替换图片" : "附上图片"
          }}
        </button>
        <details v-if="onBoard" class="object-menu">
          <summary aria-label="图片与图层操作">
            <Icon name="more" :size="18" />更多
          </summary>
          <div>
            <button :disabled="busy || !canBack" @click="$emit('layer', -1)">
              后移一层</button
            ><button :disabled="busy || !canForward" @click="$emit('layer', 1)">
              前移一层</button
            ><button
              class="danger-text"
              :disabled="busy"
              @click="$emit('remove')"
            >
              从画板移除 · 保留素材
            </button>
          </div>
        </details>
      </footer>
    </template>
    <div v-else class="note-panel-idle">
      <h2>想法与笔记</h2>
      <p>点选画板中的参考，<br />在这里阅读与修改。</p>
    </div>
  </section>
</template>
