<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Icon from "./Icon.vue";
import { safeUrl, type Asset } from "../types";
const props = defineProps<{
  asset?: Asset;
  onBoard: boolean;
  references: number;
  canBack: boolean;
  canForward: boolean;
  mobile: boolean;
  busy: boolean;
}>();
const emit = defineEmits<{
  details: [asset: Asset];
  replace: [];
  remove: [];
  layer: [direction: number];
  add: [id: string];
  close: [];
}>();
const noteExpanded = ref(false);
const needsExpansion = computed(
  () =>
    (props.asset?.note.length || 0) > 110 ||
    (props.asset?.note.split("\n").length || 0) > 3,
);
watch(
  () => props.asset?.id,
  () => (noteExpanded.value = false),
);
function sourceHost(source: string) {
  try {
    return new URL(source).hostname;
  } catch {
    return source;
  }
}
</script>
<template>
  <section class="selection-inspector" aria-label="当前素材详情">
    <template v-if="asset">
      <header class="inspector-heading">
        <span class="eyebrow">{{ onBoard ? "当前画板对象" : "素材详情" }}</span
        ><span class="inspector-kind">{{
          asset.kind === "link" ? "参考链接" : "图片"
        }}</span
        ><button
          v-if="!mobile"
          class="icon-button"
          aria-label="取消选择"
          @click="emit('close')"
        >
          <Icon name="close" :size="15" />
        </button>
      </header>
      <div class="inspector-content" :key="asset.id">
        <button
          v-if="asset.data"
          class="inspector-image"
          @click="emit('details', asset)"
          aria-label="查看大图与完整说明"
        >
          <img :src="asset.data" :alt="asset.title" /><span
            ><Icon name="expand" :size="14" /> 查看大图</span
          >
        </button>
        <div v-else class="inspector-link-art">
          <Icon name="link" :size="30" /><span>{{
            sourceHost(asset.source)
          }}</span>
        </div>
        <h3>{{ asset.title }}</h3>
        <a
          v-if="safeUrl(asset.source)"
          class="inspector-source"
          :href="safeUrl(asset.source)"
          target="_blank"
          rel="noopener noreferrer"
          ><Icon name="link" :size="14" /><span>{{
            sourceHost(asset.source)
          }}</span
          ><Icon name="arrow" :size="14"
        /></a>
        <p v-else class="source-missing">尚未填写来源，可在说明中补充</p>
        <div class="inspector-note">
          <div class="note-heading">
            <span>借鉴点</span
            ><button @click="emit('details', asset)">
              <Icon name="edit" :size="13" /> 编辑
            </button>
          </div>
          <p :class="{ clamped: needsExpansion && !noteExpanded }">
            {{ asset.note || "写下具体想借鉴什么，让喜欢有据可循。" }}
          </p>
          <button
            v-if="needsExpansion"
            class="note-expand"
            @click="noteExpanded = !noteExpanded"
            :aria-expanded="noteExpanded"
          >
            {{ noteExpanded ? "收起完整笔记" : "展开完整笔记" }}
          </button>
        </div>
        <button class="inspector-edit" @click="emit('details', asset)">
          <Icon name="edit" :size="16" /> 编辑名称、来源与笔记
        </button>
        <div class="inspector-operations">
          <button @click="emit('replace')" :disabled="busy">
            <Icon name="replace" :size="16" />
            {{ asset.data ? "替换图片" : "附上图片" }}
          </button>
          <button
            v-if="!onBoard"
            @click="emit('add', asset.id)"
            :disabled="busy"
          >
            <Icon name="plus" :size="16" /> 加入画板
          </button>
          <template v-if="onBoard">
            <div v-if="!mobile" class="layer-actions">
              <button @click="emit('layer', -1)" :disabled="!canBack || busy">
                <Icon name="layers" :size="14" /> 后移一层</button
              ><button
                @click="emit('layer', 1)"
                :disabled="!canForward || busy"
              >
                <Icon name="layers" :size="14" /> 前移一层
              </button>
            </div>
            <button
              class="danger-text"
              @click="emit('remove')"
              :disabled="busy"
            >
              <Icon name="remove" :size="15" /> 从画板移除
            </button>
          </template>
        </div>
        <p class="reference-note">
          {{
            onBoard
              ? "移除只影响当前画板对象，素材仍在。"
              : "素材已收集，加入画板后可编排。"
          }}<span v-if="references > 1"
            >这份素材有
            {{ references }} 个画板引用，修改说明或替换图片会同步到它们。</span
          >
        </p>
      </div>
    </template>
    <div v-else class="inspector-empty">
      <div class="empty-focus"><Icon name="image" :size="28" /></div>
      <span class="eyebrow">MAKE IT YOURS</span>
      <h3>给喜欢，一个理由。</h3>
      <p>
        点选画板或左侧素材，<br />在这里看来源、读笔记，<br />再留下你的借鉴点。
      </p>
      <span class="empty-key">选择 → 看清 → 编排</span>
    </div>
  </section>
</template>
