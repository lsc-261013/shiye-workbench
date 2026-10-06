<script setup lang="ts">
import Modal from "./Modal.vue";
import Icon from "./Icon.vue";
defineProps<{
  busy: boolean;
  busyLabel: string;
  result: string;
  title: string;
}>();
defineEmits<{ close: []; png: []; text: []; backup: [] }>();
</script>
<template>
  <Modal title="把这一页带走" kind="export" @close="$emit('close')">
    <p class="export-intro">
      {{ title }}<span>按用途选择。完整备份可以导入后继续编辑。</span>
    </p>
    <div class="export-options">
      <button class="export-option" :disabled="busy" @click="$emit('png')">
        <span class="export-format">PNG</span
        ><span><b>作品图</b><small>1600 × 1000 · 用于展示视觉方案</small></span
        ><Icon name="download" />
      </button>
      <button class="export-option" :disabled="busy" @click="$emit('text')">
        <span class="export-format">TXT</span
        ><span
          ><b>来源与笔记清单</b
          ><small>全部素材 · 保留完整来源和笔记</small></span
        ><Icon name="download" />
      </button>
      <button class="export-option" :disabled="busy" @click="$emit('backup')">
        <span class="export-format">JSON</span
        ><span
          ><b>完整可恢复备份</b
          ><small>图片 + 说明 + 布局 · 换设备继续</small></span
        ><Icon name="download" />
      </button>
    </div>
    <p class="export-result" role="status">
      <span v-if="busy" class="spinner"></span
      ><Icon
        v-else-if="result && !result.includes('失败')"
        name="check"
        :size="16"
      />{{ busy ? busyLabel : result || "文件将在当前浏览器中发起下载。" }}
    </p>
    <p class="export-foot">
      本地处理。备份文件含你的图片与笔记，请自行妥善保存。
    </p>
  </Modal>
</template>
