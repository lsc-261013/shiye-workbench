<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import Icon from "./Icon.vue";
defineProps<{
  title: string;
  saveState: string;
  canUndo: boolean;
  canRedo: boolean;
  busy: boolean;
  preview: boolean;
}>();
const emit = defineEmits<{
  home: [];
  rename: [e: Event];
  undo: [];
  redo: [];
  preview: [];
  export: [];
  import: [];
  backup: [];
  original: [];
  retry: [];
  shortcuts: [];
  start: [kind: "blank" | "product" | "life" | "creative"];
}>();
const more = ref<HTMLDetailsElement>();
function action(fn: () => void) {
  if (more.value) more.value.open = false;
  fn();
}
function outside(e: MouseEvent) {
  if (more.value && !more.value.contains(e.target as Node))
    more.value.open = false;
}
onMounted(() => window.addEventListener("click", outside));
onBeforeUnmount(() => window.removeEventListener("click", outside));
</script>
<template>
  <header class="editor-top">
    <button
      class="editor-home"
      aria-label="返回首页"
      :disabled="busy"
      @click="emit('home')"
    >
      <Icon name="back" /><span class="mini-brand">拾页</span>
    </button>
    <div class="project-meta">
      <input
        aria-label="方案名称"
        :value="title"
        maxlength="100"
        :readonly="preview || busy"
        @change="emit('rename', $event)"
        @blur="emit('rename', $event)"
      />
      <button
        v-if="saveState.includes('失败')"
        class="save-error"
        @click="emit('retry')"
      >
        保存失败 · 点击重试
      </button>
      <span v-else class="save-state" role="status"
        ><span v-if="saveState.includes('中')" class="spinner"></span
        ><Icon v-else name="check" :size="12" />{{ saveState }}</span
      >
    </div>
    <div class="editor-actions">
      <div class="history-actions" v-if="!preview">
        <button
          aria-label="撤销"
          title="撤销 Ctrl+Z"
          :disabled="!canUndo || busy"
          @click="emit('undo')"
        >
          <Icon name="undo" /></button
        ><button
          aria-label="重做"
          title="重做 Ctrl+Shift+Z"
          :disabled="!canRedo || busy"
          @click="emit('redo')"
        >
          <Icon name="redo" />
        </button>
      </div>
      <button
        class="preview-toggle"
        :disabled="busy"
        :aria-pressed="preview"
        @click="emit('preview')"
      >
        <Icon :name="preview ? 'edit' : 'eye'" />{{
          preview ? "返回编辑" : "预览作品"
        }}
      </button>
      <button
        class="primary export-trigger"
        :disabled="busy"
        @click="emit('export')"
      >
        <Icon name="download" :size="16" />导出
      </button>
      <details ref="more" class="more-menu">
        <summary aria-label="更多方案操作">
          <Icon name="more" :size="22" />
        </summary>
        <div class="menu-panel">
          <button :disabled="busy" @click="action(() => emit('import'))">
            导入完整备份</button
          ><button :disabled="busy" @click="action(() => emit('backup'))">
            保存完整备份 JSON
          </button>
          <button :disabled="busy" @click="action(() => emit('shortcuts'))">
            常用快捷键
          </button>
          <hr />
          <button :disabled="busy" @click="action(() => emit('original'))">
            导出升级前备份
          </button>
          <span class="menu-label">开始另一页 · 将确认替换草稿</span>
          <button
            :disabled="busy"
            @click="action(() => emit('start', 'blank'))"
          >
            新建空白方案</button
          ><button
            :disabled="busy"
            @click="action(() => emit('start', 'product'))"
          >
            使用「留白之间」示例</button
          ><button
            :disabled="busy"
            @click="action(() => emit('start', 'life'))"
          >
            使用「光与日常」示例
          </button>
          <button
            :disabled="busy"
            @click="action(() => emit('start', 'creative'))"
          >
            使用「创作练习」示例
          </button>
        </div>
      </details>
    </div>
  </header>
</template>
