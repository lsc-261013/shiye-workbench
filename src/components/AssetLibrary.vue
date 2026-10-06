<script setup lang="ts">
import Icon from "./Icon.vue";
import type { Board, Asset } from "../types";
defineProps<{
  board: Board;
  selectedAssetId: string;
  busy: boolean;
  busyLabel: string;
}>();
defineEmits<{ choose: [a: Asset]; add: [id: string]; upload: []; link: [] }>();
</script>
<template>
  <section class="reference-library" :aria-busy="busy">
    <div class="reference-add">
      <button class="primary" :disabled="busy" @click="$emit('upload')">
        <Icon name="upload" />上传图片</button
      ><button :disabled="busy" @click="$emit('link')">
        <Icon name="link" />添加链接
      </button>
    </div>
    <p class="reference-result" role="status">
      {{
        busy
          ? busyLabel
          : "新参考会尝试放入空位；暂放在这里的，也可随时加入画板。"
      }}
    </p>
    <div class="reference-list">
      <article
        v-for="a in board.assets"
        :key="a.id"
        class="reference-card"
        :class="{ active: selectedAssetId === a.id }"
      >
        <button
          class="reference-thumbnail"
          :aria-label="'选择参考：' + a.title"
          :disabled="busy"
          @click="$emit('choose', a)"
        >
          <img v-if="a.data" :src="a.data" :alt="a.title" loading="lazy" /><Icon
            v-else
            name="link"
            :size="25"
          />
        </button>
        <div class="reference-info">
          <button
            class="reference-title"
            :disabled="busy"
            @click="$emit('choose', a)"
          >
            {{ a.title }}</button
          ><span>{{
            board.items.some((p) => p.assetId === a.id)
              ? "已在画板"
              : "暂在素材区"
          }}</span>
          <div class="reference-card-actions">
            <button
              v-if="board.items.some((p) => p.assetId === a.id)"
              :disabled="busy"
              @click="$emit('choose', a)"
            >
              定位到画板</button
            ><button v-else :disabled="busy" @click="$emit('add', a.id)">
              加入画板
            </button>
            <details v-if="board.items.some((p) => p.assetId === a.id)">
              <summary :aria-label="'更多参考操作：' + a.title">
                <Icon name="more" :size="18" />
              </summary>
              <button
                :disabled="busy"
                @click="
                  $emit('add', a.id);
                  ($event.currentTarget as HTMLElement)
                    .closest('details')
                    ?.removeAttribute('open');
                "
              >
                再添加一份
              </button>
            </details>
          </div>
        </div>
      </article>
    </div>
    <p v-if="!board.assets.length" class="reference-empty">
      先上传一张喜欢的图，或添加一个来源链接。
    </p>
    <p class="reference-limit">PNG / JPEG / WebP · 单张≤12MB · 最多100份参考</p>
  </section>
</template>
