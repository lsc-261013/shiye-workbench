<script setup lang="ts">
import type { Placement } from "../types";
import { textDefaults } from "../lib/text";
import ObjectActions from "./ObjectActions.vue";
defineProps<{
  draft?: Placement;
  dirty: boolean;
  error: string;
  composing: boolean;
  busy: boolean;
  canBack: boolean;
  canForward: boolean;
}>();
defineEmits<{
  save: [];
  cancel: [];
  close: [];
  duplicate: [];
  remove: [];
  layer: [direction: number];
  composition: [value: boolean];
}>();
</script>
<template>
  <section class="note-panel" aria-label="独立文字编辑">
    <header class="note-panel-heading">
      <h2>文字与标题</h2>
      <button aria-label="取消选择" @click="$emit('close')">×</button>
    </header>
    <form
      v-if="draft?.text"
      class="notes-form text-form"
      @submit.prevent="$emit('save')"
      @compositionstart="$emit('composition', true)"
      @compositionend="$emit('composition', false)"
    >
      <label
        >文字样式<select
          aria-label="文字样式"
          v-model="draft.text.style"
          :disabled="busy"
          @change="
            Object.assign(draft.text, {
              ...textDefaults(draft.text.style),
              content: draft.text.content,
            })
          "
        >
          <option value="heading">标题</option>
          <option value="subheading">小标题</option>
          <option value="note">便签正文</option>
        </select></label
      >
      <label class="note-writing"
        >文字内容<textarea
          aria-label="文字内容"
          v-model="draft.text.content"
          maxlength="1200"
          rows="6"
          :disabled="busy"
        ></textarea>
      </label>
      <div class="text-options">
        <label
          >字号<input
            aria-label="文字字号"
            type="number"
            min="20"
            max="72"
            step="any"
            v-model.number="draft.text.size"
            :disabled="busy" /></label
        ><label
          >框宽<input
            aria-label="文字框宽度"
            type="number"
            min="100"
            max="1520"
            step="any"
            v-model.number="draft.w"
            :disabled="busy"
        /></label>
      </div>
      <div class="text-options">
        <label
          >对齐<select
            aria-label="文字对齐"
            v-model="draft.text.align"
            :disabled="busy"
          >
            <option value="left">左对齐</option>
            <option value="center">居中</option>
            <option value="right">右对齐</option>
          </select></label
        ><label
          >颜色<select
            aria-label="文字颜色"
            v-model="draft.text.color"
            :disabled="busy"
          >
            <option value="#252723">炭黑</option>
            <option value="#b34830">朱红</option>
            <option value="#555b50">苔灰</option>
          </select></label
        >
      </div>
      <label class="text-bold"
        ><input
          type="checkbox"
          aria-label="加粗文字"
          v-model="draft.text.bold"
          :disabled="busy"
        />加粗</label
      >
      <p class="note-shared">
        字号保持不变；框高随完整文字自动计算。最多1200字，放不下会保留原稿。
      </p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div class="note-submit">
        <span>{{ dirty ? "修改尚未提交" : "修改后保存" }}</span
        ><button v-if="dirty" type="button" @click="$emit('cancel')">
          取消修改</button
        ><button class="primary" :disabled="busy || !dirty || composing">
          保存文字
        </button>
      </div>
    </form>
    <footer class="note-object-actions">
      <ObjectActions
        :busy="busy"
        :can-back="canBack"
        :can-forward="canForward"
        is-text
        @duplicate="$emit('duplicate')"
        @remove="$emit('remove')"
        @layer="$emit('layer', $event)"
      />
    </footer>
  </section>
</template>
