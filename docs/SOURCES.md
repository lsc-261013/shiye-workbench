# 素材、字体与依赖来源

## 摄影

以下图片从 Unsplash 图片服务下载，作为应用示例与首页拼贴，随站点本地提供。下载日：2026-09-17。没有购买素材、调用付费 API 或上传用户文件。许可依据：[Unsplash License](https://unsplash.com/license)，允许免费下载、复制、修改及商业/非商业使用；本项目将其用于具体示例，不是建立素材转售服务。未核实摄影师姓名，不作虚构署名。

| 本地文件 | 内容 | 原始来源 |
| --- | --- | --- |
| architecture.jpg | 玻璃建筑与天空 | https://images.unsplash.com/photo-1511818966892-d7d671e672a2 |
| interior.jpg | 暖色室内空间 | https://images.unsplash.com/photo-1600210492486-724fe5c67fb0 |
| coast.jpg | 山湖与木船（文件名沿用资源标识，并非海景） | https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1 |
| chair.jpg | 花枝、白瓶与浅色椅子 | https://images.unsplash.com/photo-1490312278390-ab64016e0aa9 |
| forest.jpg | 森林 | https://images.unsplash.com/photo-1441974231531-c6227db76b6e |

## 自制图形与示例

`type.svg`、`palette.svg`、`web.svg` 和 `favicon.svg` 为本项目以代码制作的样张与图标。STILL / NOTES 是虚构的独立产品网站概念样张，不是现有客户网站，也不声称真实业务。示例说明里已标注自制；没有为自制素材编造来源网址。Vue 官网链接是公开参考入口，应用不抓取其内容，也未复制官网截图。

## 字体

不打包或分发商业字体。首页优先使用设备上的宋体 / Songti；控件与画板用设备上的 Microsoft YaHei / PingFang SC / Arial / sans-serif。SVG 在使用示例时于本机栅格化成 PNG；PNG 导出等待 `document.fonts.ready`。不同系统的字体形态可能不同，已在限制中说明。

## 代码依赖

生产依赖为 Vue 3（MIT）。开发依赖为 Vite、@vitejs/plugin-vue、TypeScript、vue-tsc、Vitest、fake-indexeddb 和 Prettier。精确版本由 `package-lock.json` 固定，许可文本随对应 npm 包提供；没有收费服务依赖。

## 参考材料

`references/` 中的执行简报及第一轮 A 图片由本任务交接提供，仅作开发和视觉复核依据，不作为生产 UI 图片。参考图内的椅子、器物等未被裁切复用。原文“尚未授权开发”已由本次明确启动授权更新，其余 v2 范围和完成标准保留。
