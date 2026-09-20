<script setup lang="ts">
import Collage from "./Collage.vue";
defineProps<{ hasDraft: boolean; busy: boolean }>();
defineEmits<{ start: [kind: "product" | "life" | "blank"]; resume: [] }>();
</script>
<template>
  <div class="home">
    <header class="home-nav">
      <a class="brand" href="#"
        ><span class="brand-icon">拾</span>拾页<span class="brand-sub"
          >视觉灵感工作台</span
        ></a
      >
      <nav>
        <a href="#examples">探索示例</a
        ><button v-if="hasDraft" @click="$emit('resume')">
          继续上次编辑 ↗</button
        ><button v-else @click="$emit('start', 'blank')" :disabled="busy">
          新建方案 ↗
        </button>
      </nav>
    </header>
    <main>
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow">A PLACE FOR YOUR NEXT IDEA</div>
          <h1>把喜欢的画面，<br />变成你的<span>方向。</span></h1>
          <p class="hero-description">
            收集参考，写下借鉴，编排灵感。<br />把零散的喜欢，整理成一页清晰的视觉方案。
          </p>
          <div class="hero-actions">
            <button
              class="primary"
              :disabled="busy"
              @click="$emit('start', 'product')"
            >
              {{ busy ? "准备素材中…" : "体验示例" }}<span>↗</span></button
            ><button
              class="text-button"
              :disabled="busy"
              @click="$emit('start', 'blank')"
            >
              新建空白方案 <span>＋</span>
            </button>
          </div>
          <p class="local-note">
            <span class="status-dot"></span> 无需账号 · 素材保存在当前浏览器
          </p>
          <div class="hero-foot">
            <span>COLLECT. CONNECT. CREATE.</span
            ><span class="handwritten">下一次灵感，从这里开始。</span>
          </div>
        </div>
        <Collage />
      </section>
      <section class="examples" id="examples">
        <div class="section-heading">
          <div>
            <div class="eyebrow">FROM INSPIRATION TO DIRECTION</div>
            <h2>先从一页喜欢的开始。</h2>
          </div>
          <p>示例可以自由修改。<br />换成你的素材，就是新的方向。</p>
        </div>
        <div class="example-grid">
          <button
            class="example-card"
            @click="$emit('start', 'product')"
            :disabled="busy"
          >
            <div class="example-visual product-preview">
              <img
                class="web-preview"
                src="/assets/web.svg"
                alt="独立产品网站示例"
              /><img
                class="type-preview"
                src="/assets/type.svg"
                alt="排版样张"
              /><img
                class="palette-preview"
                src="/assets/palette.svg"
                alt="配色样张"
              /><span class="preview-label">01 / PRODUCT & WEB</span>
            </div>
            <div class="example-caption">
              <div>
                <h3>留白之间</h3>
                <p>独立产品网站 · 结构、排版与借鉴点</p>
              </div>
              <span>打开示例 ↗</span>
            </div></button
          ><button
            class="example-card"
            @click="$emit('start', 'life')"
            :disabled="busy"
          >
            <div class="example-visual life-preview">
              <img
                class="warm-preview"
                src="/assets/interior.jpg"
                alt="生活空间"
              /><img
                class="lake-preview"
                src="/assets/coast.jpg"
                alt="湖畔摄影"
              /><img
                class="flower-preview"
                src="/assets/chair.jpg"
                alt="花枝静物"
              /><span class="preview-label">02 / PHOTO & LIFESTYLE</span>
            </div>
            <div class="example-caption">
              <div>
                <h3>光与日常</h3>
                <p>摄影与生活方式 · 光影、色彩与拼贴</p>
              </div>
              <span>打开示例 ↗</span>
            </div>
          </button>
        </div>
        <div class="steps">
          <div>
            <b>01</b>
            <p>收集喜欢的<span>图片或链接，都可以成为起点。</span></p>
          </div>
          <div>
            <b>02</b>
            <p>找到你的方向<span>写下借鉴点，让喜欢有据可循。</span></p>
          </div>
          <div>
            <b>03</b>
            <p>把想法带走<span>导出图片与清单，备份后继续。</span></p>
          </div>
        </div>
      </section>
    </main>
    <footer>
      <span>拾页 / 让灵感有迹可循</span
      ><span>本机保存，无跨设备同步 · 重要方案请导出备份</span>
    </footer>
  </div>
</template>
