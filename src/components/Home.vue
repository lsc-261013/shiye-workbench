<script setup lang="ts">
import Collage from "./Collage.vue";
import Icon from "./Icon.vue";
import type { Board } from "../types";
defineProps<{ hasDraft: boolean; busy: boolean; board: Board }>();
defineEmits<{
  start: [kind: "product" | "life" | "blank"];
  resume: [];
  import: [];
}>();
</script>
<template>
  <div class="home">
    <header class="home-nav">
      <a class="brand" href="#" aria-label="拾页首页"
        ><span class="brand-icon">拾</span>拾页<span class="brand-sub"
          >视觉灵感工作台</span
        ></a
      >
      <nav>
        <a href="#examples">看看示例</a
        ><button
          class="nav-action"
          :disabled="busy"
          @click="hasDraft ? $emit('resume') : $emit('start', 'blank')"
        >
          {{ hasDraft ? "继续创作" : "打开工作台" }}
          <Icon name="arrow" :size="16" />
        </button>
      </nav>
    </header>
    <main>
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow">
            <span class="red-rule"></span> 给下一次灵感，一处落脚
          </div>
          <h1>把零散的喜欢，<br />整理成<span>一页。</span></h1>
          <p class="hero-description">
            收集图片、留下来源、写下笔记。<br />把喜欢的画面，编排成你的视觉方向。
          </p>
          <div class="hero-actions">
            <button
              class="primary"
              :disabled="busy"
              @click="hasDraft ? $emit('resume') : $emit('start', 'product')"
            >
              {{
                busy ? "准备素材中…" : hasDraft ? "继续上次编辑" : "从示例开始"
              }}<Icon name="arrow" />
            </button>
            <button
              class="text-button"
              :disabled="busy"
              @click="$emit('start', 'blank')"
            >
              新建空白方案 <Icon name="plus" :size="16" />
            </button>
          </div>
          <button
            v-if="hasDraft"
            class="draft-resume"
            @click="$emit('resume')"
            :disabled="busy"
          >
            <span class="draft-images"
              ><img
                v-for="a in board.assets.filter((a) => a.data).slice(0, 3)"
                :key="a.id"
                :src="a.data"
                alt=""
            /></span>
            <span
              ><small>当前浏览器的草稿</small><b>{{ board.title }}</b
              ><small
                >{{ board.items.length }} 个画板元素 · 随时回来继续</small
              ></span
            ><Icon name="chevron" />
          </button>
          <div class="local-note">
            <span class="status-dot"></span>无需账号 · 保存在当前浏览器<button
              @click="$emit('import')"
              :disabled="busy"
            >
              导入备份 <Icon name="upload" :size="13" />
            </button>
          </div>
          <div class="hero-foot">
            <span>COLLECT / ARRANGE / KEEP</span
            ><span class="handwritten">让灵感有迹可循。</span>
          </div>
        </div>
        <Collage />
      </section>
      <section class="examples" id="examples">
        <div class="section-heading">
          <div>
            <div class="eyebrow">START WITH A LITTLE INSPIRATION</div>
            <h2>借一页，开始你的方向。</h2>
          </div>
          <p>两份可编辑的示例。<br />换成自己的素材，留下自己的理解。</p>
        </div>
        <div class="example-grid">
          <button
            class="example-card"
            :disabled="busy"
            @click="$emit('start', 'product')"
          >
            <div class="example-visual product-preview">
              <img
                class="web-preview"
                src="/assets/web.svg"
                alt="自制独立产品网站样张"
              /><img
                class="type-preview"
                src="/assets/type.svg"
                alt="排版样张"
              /><img
                class="palette-preview"
                src="/assets/palette.svg"
                alt="配色样张"
              /><span class="preview-label">01 / PRODUCT & WEB</span
              ><span class="example-open"><Icon name="arrow" /></span>
            </div>
            <div class="example-caption">
              <div>
                <h3>留白之间</h3>
                <p>独立产品网站 · 结构、排版与借鉴点</p>
              </div>
              <span>打开示例 <Icon name="arrow" :size="16" /></span>
            </div>
          </button>
          <button
            class="example-card"
            :disabled="busy"
            @click="$emit('start', 'life')"
          >
            <div class="example-visual life-preview">
              <img
                class="warm-preview"
                src="/assets/interior.jpg"
                alt="生活空间"
              /><img
                class="lake-preview"
                src="/assets/coast.jpg"
                alt="山湖摄影"
              /><img
                class="flower-preview"
                src="/assets/chair.jpg"
                alt="花枝静物"
              /><span class="preview-label">02 / PHOTO & LIFESTYLE</span
              ><span class="example-open"><Icon name="arrow" /></span>
            </div>
            <div class="example-caption">
              <div>
                <h3>光与日常</h3>
                <p>摄影与生活方式 · 光影、色彩与拼贴</p>
              </div>
              <span>打开示例 <Icon name="arrow" :size="16" /></span>
            </div>
          </button>
        </div>
        <div class="steps">
          <div>
            <b>01</b>
            <p>收集喜欢的<span>图片、来源与笔记，都有自己的位置。</span></p>
          </div>
          <div>
            <b>02</b>
            <p>编排你的方向<span>拖动、缩放，让关系慢慢浮现。</span></p>
          </div>
          <div>
            <b>03</b>
            <p>把想法带走<span>作品图用来展示，完整备份留给下次。</span></p>
          </div>
        </div>
      </section>
    </main>
    <footer>
      <span>拾页 / 一页参考，一种方向</span
      ><span>本地保存 · 重要方案请导出完整备份</span>
    </footer>
  </div>
</template>
