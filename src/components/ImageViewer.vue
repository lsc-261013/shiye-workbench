<script setup lang="ts">
import Modal from "./Modal.vue";
import type { Asset } from "../types";
defineProps<{ asset: Asset }>();
defineEmits<{ close: [] }>();
</script>
<template>
  <Modal :title="asset.title" kind="image-viewer" @close="$emit('close')">
    <figure class="image-viewer">
      <img class="image-viewer-image" :src="asset.data" :alt="asset.title" />
      <figcaption class="image-viewer-note">
        看完关闭，即可回到原参考。
      </figcaption>
    </figure>
  </Modal>
</template>
