# 拾页第四轮完整交接 · 2026-10-07

第四轮直接裁切、素材拖入与快捷键已完成，后续Ctrl+Z连续撤销修复已整合进本交接。用户后续明确授权正式发布，现已正常合并到`main`、推送并部署到[正式网站](https://lsc-261013.github.io/shiye-workbench/)。[4186本地预览](http://127.0.0.1:4186/)原稿保留，完整备份已迁移到本对话内置浏览器的正式站点，刷新后重新导出逐字节一致。详见[正式发布与迁移记录](RELEASE-2026-10-07.md)。

## 版本与启动

工程、分支和唯一当前状态见[STATUS](STATUS.md)。基线`8a87825`，第四轮实现`77d2547ed6d73382e558c749406a3ab43160c246`，原交接/证据提交`8bc66f9`，连续撤销修复提交`1da0bdc`，交接更新`4c9c263`；首次正式发布提交`0cf8bd3`。优化分支已快进合并到实际发布分支`main`，本次发布交接更新在其后，最新仓库HEAD与线上`release.json`核对。当前本地构建`index-B8j0E01h.js`，Pages构建`index-DGKqxqDi.js`，CSS均为`index-Bs0hNSWi.css`；发布前类型检查、75模块构建和6文件45项测试全部通过。没有新增依赖。

```powershell
Set-Location 'C:/Users/27835/Documents/Codex/2026-09-17/inspiration-workbench/outputs/inspiration-workbench'
npm run build -- --configLoader native
npm run preview -- --port 4186 --strictPort --configLoader native
```

开发：`npm run dev -- --port 5186 --strictPort --configLoader native`。检查：`npm run check`和`npm test -- --configLoader native`。首次检出先安装Node.js 22.12+并`npm ci`。不要双击index.html，不强停5173或其他项目服务。本地原稿依赖原浏览器和`http://127.0.0.1:4186/`来源；正式站点保存独立草稿，换地址/端口先导出JSON。Pages使用`npm run build:pages`；`main`推送后经45项测试、类型构建、资源路径和公开目录检查，上传`dist`再部署。文档、测试、私稿备份不进入站点资源。

## 正式发布与草稿迁移

核实远端默认分支为`main`，原仓库无托管配置、homepage、Pages或部署记录，因此采用用户指定的免费GitHub Pages。修正示例加载的动态根路径为`import.meta.env.BASE_URL`；静态图片、favicon、JS/CSS均使用`/shiye-workbench/`。首个[部署运行](https://github.com/lsc-261013/shiye-workbench/actions/runs/37615835326)的build和deploy均成功，站点HTML为HTTP 200，JS/CSS与本地Pages构建SHA-256一致；不是只核对推送成功。后续文档提交仍由同流程发布，以[版本清单](https://lsc-261013.github.io/shiye-workbench/release.json)确认最新提交。

线上实际检查：素材从左侧缩略图用真实指针拖入，5→6对象，旧5对象位置和尺寸保持；固定16:9确认后矩形视口正确；切换四点并用真实方向键独立修改角点，确认后多边形轮廓正确；添加文字与已保存状态；当前焦点连续Ctrl+Z三次8→7→6→5。发布前隔离Pages构建另验证连续撤销11→10→9→8及重做8→9→10→11，逐步DOM与原快照一致。实际Ctrl+C/V通过tab与locator两种工具入口尝试，仍被虚拟剪贴板拦截，真实按键验收未完成；此前合成事件结果保留原身份。

线上测试稿7对象、6素材、1独立文字、1四点裁切，实际导出JSON424920字节、PNG497484字节（1600×1000）、TXT1355字节。截图与PNG已亲看，TXT包含全文；下载临时文件实际读取并复制，补足之前只核对Blob的边界。见[结果](evidence/release-2026-10-07/results.json)、[线上截图](evidence/release-2026-10-07/live-verified.png)、[PNG](evidence/release-2026-10-07/live-export.png)。公开证据只含此次自建示例测试稿，私人完整JSON没有入Git或站点资源。

发布前从当前4186页面通过应用导出JSON，实际下载后存于工程外`work/private-release-2026-10-07/shiye-current-before-release.shiye.json`。424337字节、版本1、6素材、5对象；当前稿无独立文字对象或裁切，图片、完整笔记、引用与布局保留，DOM图片指纹/笔记/ID/几何核对一致。首次线上访问没有已有草稿；测试后覆盖前另存`live-before-migration.shiye.json`。通过正式应用文件选择器读入原备份，确认替换，刷新并继续，再导出`shiye-current-after-online-refresh.shiye.json`，与原始备份逐字节一致。原稿、三份仓库外JSON及核对记录均保留。迁移只确认本对话内置浏览器；外部Edge连接不可用，换到其他浏览器需自行先备份该浏览器已有稿，再导入同一原备份并刷新继续。

后续线上代码回退到本次稳定提交`0cf8bd3`的命令见[发布记录](RELEASE-2026-10-07.md)。这是首个正式站点，没有更早的线上部署可供切换；不强推、不reset发布分支。下方第三轮回退仍仅供独立本地旧结构查看。

## 本轮行为与实现

| 范围     | 最终行为                                                                                                         | 主要文件                                                               |
| -------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 直接裁切 | 固定比例框拖角等比、框内平移；四点独立拖动和整组平移，支持合法凹/凸；禁止交叉/重合/零面积/越界，保留最后合法状态 | `CropEditor.vue`、`lib/polygon.ts`                                     |
| 画板/PNG | 原像素按四点剪切，不做透视拉正；同源包围盒和轮廓；之外透出下层/画板，笔记单独完整显示                            | `CroppedImage.vue`、`lib/export.ts`、`editor.css`                      |
| 添加     | 上传/链接只收集；左侧缩略图拖到落点，新实例顶层、允许重叠；边缘约束、拖出取消；辅助添加/文字/复制一致            | `AssetLibrary.vue`、`useLayoutActions.ts`、`App.vue`、`lib/objects.ts` |
| 整理     | 只在点击独立整理时运行，添加不找空位、不重排、不推开旧对象；12整理/150对象真实上限保持                           | `useLayoutActions.ts`                                                  |
| 快捷键   | 编辑器上下文、非输入/非弹窗/非组合；Delete/Backspace、复制快照、附近连续/边缘/多选粘贴、历史与Esc；右上更多说明  | `Editor.vue`、`BoardCanvas.vue`、`lib/keyboard.ts`                     |
| 备份     | 四点需v3，旧v1/v2原样读，矩形字段仍保留；首次v3同事务保存旧稿快照；非法点或伪装版本拒绝                          | `types.ts`、`lib/data.ts`、`lib/crop.ts`、`lib/storage.ts`             |

打开裁切或切换模式不写稿；确认一次历史，取消/Esc保持旧效果；恢复仅当前实例。图片副本共享未变原图/笔记，实例裁切独立；文字副本内容独立。复制快照不写历史，切选择不改快照；原资源之后被替换/改笔记时，粘贴恢复复制时的资源快照为单独素材，等值资源复用，避免偷偷改当前共享资源。每次粘贴/删除一批历史，容量整批拒绝。

共享替换更新所有引用并恢复它们的完整图，保留外框和层序；撤销还原字节与全部裁切。图片像素和笔记均保留在JSON，裁切不减少素材资源计数。未提交输入仍有保存/放弃保护。手机保留概览与轻编辑，不新增自由拖缩或精细四点编辑。

## 连续撤销修复

用户反馈Ctrl+Z只能撤销一步。隔离稿复现为11→10→10：撤销移除了当前聚焦的新增对象，浏览器焦点落到`body`，下一次快捷键被编辑器作用域保护忽略。历史栈本身支持连续撤销。

`Editor.vue`新增`historyAction("undo" | "redo")`，Ctrl+Z、Ctrl+Shift+Z、Ctrl+Y和右上角撤销/重做按钮统一调用。沿用`run()`的未提交保护；发出历史动作后，在`nextTick`时仅当焦点落到`document.body`才恢复到`.board`，不抢输入框焦点。最多30步内存历史，刷新后清空；输入框内Ctrl+Z仍属于文字操作。

修复验收在5186隔离稿进行，按键之间没有点击或用locator重新聚焦：实际连续三次Ctrl+Z为11→10→9→8，逐步对象ID与历史快照一致、焦点持续在画板；连续三次Ctrl+Shift+Z为8→9→10→11。右上角按钮三次撤销结果逐步相同；笔记框Ctrl+Z保持TEXTAREA焦点，已保存稿不变。见[修复记录](FIX-CONTINUOUS-UNDO-2026-10-07.md)、[实操结果](evidence/continuous-undo/results.json)和[修复截图](evidence/continuous-undo/after.png)。

此前单步快捷键验收每次重新聚焦画板，未覆盖焦点丢失；修复验收使用`pressKey(null)`保留当前焦点连续发送真实按键。新增证据单独记录，不计入下方第四轮原59次尝试统计。该次4186刷新后已加载新构建，当前稿对象ID与几何保持，没有再次导入旧备份。临时5186验收服务已停止；后续正式发布验收使用独立Pages构建预览与线上自建测试稿，结果见上节。

## 验收与截图

[对照页](round-four-review.html)有四组改前/改后、左侧面板和直接裁切；改前运行第三轮`8a87825`/`index-CIv07aLn.js`，改后为第四轮`77d2547`当时的4186构建`index-CUGnSyiA.js`。这组截图与审计JSON保留原验收身份，未在连续撤销修复后重拍；新修复证据见上一节。原HTML工具标题曾沿用第二轮快照，已改第四轮；截图里的真实应用代码基线是第三轮，不伪称第二轮。实际iframe CSS视口为1440×900、1280×720、375×812、390×844，桌面/手机是同一稿，控件隐藏后按完整尺寸捕获。

[workflow-results.json](evidence/round-four/workflow-results.json)保留第四轮原59次UI/产物断言，54有效通过、5次复验取代；[evidence-audit.json](evidence/round-four/evidence-audit.json)记录当时的尺寸、字节、SHA-256和PNG像素。主要证据：

- `polygon-direct-editor.png`、`crop-1280.png`：真实指针逐点拖动、整体平移、无效形状反馈，1280×720确认区完整可见。`polygon-crop-dialog.png`是中间阶段合法凹轮廓与错误反馈；`polygon-confirmed.shiye.json`是早期凹四点阶段，最终凸轮廓备份为`polygon-final.shiye.json`，不要混用身份。
- `asset-drag-result-1280.png`：新图覆盖已有参考，原对象保持；实际上传File、两个缩放下拖入、素材列表滚动与外层真实滚动160px、拖出取消、满板新增和容量拒绝逐项核对。
- `polygon-export.png`及TXT/JSON：四点不退化成矩形包围盒，笔记不被裁掉；桌面与`polygon-mobile-export.png`逐字节相同，182888字节。
- `polygon-extremes.png`、同名备份与画板截图：四点透明极长图、EXIF方向彩色标记图，方向和轮廓已亲看。此组几何从隔离JSON输入验证渲染/导出，主标记图四角及固定框是实际鼠标拖动，不混称。
- `mobile-library-375.png`、`shortcuts.png`：去除手机重复标题/关闭入口，可发现说明与Esc关闭。四组同尺寸截图和实际PNG均已打开审查。

Ctrl+C/V被浏览器自动化工具特殊处理，诊断显示未进入应用标准keydown；使用开发harness按钮向真实焦点派发标准KeyboardEvent，再由真实界面/IndexedDB结果核对。Backspace/Delete、Ctrl+Z/Shift+Z是实际按键，鼠标裁切与拖入是实际指针。没有读取OS剪贴板，没有把虚拟文字剪贴板或合成事件称为跨软件复制成功。Ctrl+Y已用实际按键验证；Cmd未做平台实测。诊断工具曾重复记录事件，所以诊断条数不作为操作次数；UI对象数/历史结果是判定依据。

## 发现、修正与证据纠正

第四轮原验收中，添加过程中错误提示“正在计算排版”已改为“正在加入画板”；桌面缩略图在阻止默认指针行为前取得焦点，避免之前输入框焦点吞掉Esc；手机抽屉删除重复的内层标题和关闭按钮。修改后重新类型构建、45测试、截图复验。后续连续撤销问题的根因、修正与新增验收见上方专节。

五次退役断言保持记录：初次固定比例确认未关dialog读旧存储；平移起点落在凹轮廓外；左边缘落点中心180小于新图半宽210，正确约束x=0而非中心严格等于180；容量提示exact定位漏掉关闭按钮×；最终原稿ID核对差异。对应复验全部通过，没有把工具坐标/定位问题虚构为产品几何缺陷。

没有给对象位置加动画；裁切/拖入即时反馈，轻量dialog/控件过渡和已有减少动态规则保留。未新造录像或把前轮GIF算作本轮录屏。

## 原稿、版本与回退

起点完整原稿在工程外`C:/Users/27835/Documents/Codex/2026-09-17/inspiration-workbench/work/shiye-before-round-four.shiye.json`。额度恢复后核对当前同内容示例ID不同；完整内容、几何、层序、引用关系去ID映射一致。先保留`work/shiye-before-round-four-resume.shiye.json`，通过正常导入恢复起点，再从4186只读存储核对423824字符字符串含ID完全一致。未推断暂停期间的操作原因，两份真实备份都不进Git。测试删除、替换、容量和非法导入只在5186/5188隔离稿执行。

v1/v2不会因查看自动升级；四点确认需要v3。首次旧稿→v3时同一事务保存`draft/pre-version-three`原始快照，pre2保留；升级前导出优先pre3，否则pre2。每种只留第一份快照，不是多稿历史。自动测试使首个pre3写入抛错，证明current与快照同事务回滚；不是耗尽真实硬盘。

回退先导出当前v3和升级前v1/v2，另外保留原始外部备份。在另一目录恢复第三轮：

```powershell
Set-Location 'C:/Users/27835/Documents/Codex/2026-09-17/inspiration-workbench/outputs/inspiration-workbench'
git archive 8a87825 -o '../../work/shiye-third-round.zip'
Expand-Archive -LiteralPath '../../work/shiye-third-round.zip' -DestinationPath '../../work/shiye-third-round-rollback'
Set-Location '../../work/shiye-third-round-rollback'
npm ci
npm run build -- --configLoader native
npm run preview -- --port 4187 --strictPort --configLoader native
```

仅导入v1/v2；旧程序不能读v3。不要直接在4186运行旧代码写新稿，不要reset当前分支。导出的PNG/TXT可照常分享，继续编辑需最新版程序与JSON。当前没有必需工程待办。

## 实测限制

手机为实际CSS视口，IME为合成composition，未验证实体手机、软键盘、Mac、Safari、跨平台字体或OS减少动态偏好。第四轮原文件输入采用真实File及change，未证明OS文件窗口或跨窗口拖放；原下载证据只核对Blob与发起。正式发布补充了应用文件选择器导入及JSON/PNG/TXT真实下载文件，但不扩大为实体手机文件选择或跨窗口拖放实测。实际Ctrl+C/V仍受工具限制；浏览器原生操作接口多次超时，改用可响应的DOM接口逐项核对，没有将超时尝试自动计为通过。没有新增性能、用户规模、商业效果或独立掌握结论，无云端、多标签冲突合并或新增后端功能。
