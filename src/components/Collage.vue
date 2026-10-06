<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import Icon from "./Icon.vue";
const arranged = ref(false);
let timer: ReturnType<typeof setTimeout>;
function replay() {
  clearTimeout(timer);
  arranged.value = false;
  timer = setTimeout(() => (arranged.value = true), 800);
}
onMounted(replay);
onBeforeUnmount(() => clearTimeout(timer));
</script>
<template>
  <div class="collage-demo" :class="{ 'is-arranged': arranged }">
    <div class="demo-topline">
      <span>一页的形成 / THE MAKING OF A BOARD</span
      ><span class="demo-badge">示例演示</span>
    </div>
    <div class="collage-stage" aria-label="示例摄影、排版与色彩样张归拢成一页">
      <div class="demo-board">
        <span>光、形与间隙</span><small>VISUAL NOTES / 视觉参考方案</small>
      </div>
      <figure class="demo-piece piece-architecture">
        <img src="/assets/architecture.jpg" alt="建筑的秩序" />
        <figcaption>01 / 观察秩序</figcaption>
      </figure>
      <figure class="demo-piece piece-warm">
        <img src="/assets/interior.jpg" alt="暖色室内光影" />
        <figcaption>02 / 留住光线</figcaption>
      </figure>
      <figure class="demo-piece piece-type">
        <img src="/assets/type.svg" alt="间：自制排版样张" />
      </figure>
      <figure class="demo-piece piece-coast">
        <img src="/assets/coast.jpg" alt="山湖与木船" />
        <figcaption>03 / 找到呼吸</figcaption>
      </figure>
      <figure class="demo-piece piece-palette">
        <img src="/assets/palette.svg" alt="自制暖白与朱红配色样张" />
      </figure>
      <span class="demo-annotation">喜欢的片刻，<br />慢慢成为方向。</span>
    </div>
    <div class="demo-bottomline">
      <span class="demo-phase"
        ><i :class="{ complete: arranged }"></i
        >{{
          arranged ? "图片 + 来源 + 笔记 → 一页视觉方案" : "收集散落的喜欢"
        }}</span
      >
      <button class="replay-button" @click="replay" aria-label="重播示例编排">
        <Icon name="replay" :size="14" /> 再看一次
      </button>
    </div>
  </div>
</template>
