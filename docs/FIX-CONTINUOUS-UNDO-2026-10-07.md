# Ctrl+Z连续撤销修复 · 2026-10-07

用户反馈Ctrl+Z只能撤销一步，要求与右上角撤销按钮一致。已在第四轮基础上修复，仅本地提交和更新4186预览，未推送或部署。

原因是焦点丢失：选中新添加对象后撤销，对象从DOM移除，浏览器焦点落到body。历史栈仍有前面的记录，但后续Ctrl+Z被编辑器作用域保护忽略。隔离稿实际复现为11→10→10，首步后焦点为BODY。

Editor.vue新增统一historyAction入口供Ctrl+Z、Ctrl+Shift+Z、Ctrl+Y和右上角按钮调用。历史更新后，只在焦点落到body时恢复画板焦点；输入框的文字撤销和未提交保护保持。历史仍为30步内存记录，刷新后清空，与原按钮相同。

实际输入验收没有在按键之间点击或用locator重新聚焦：连续Ctrl+Z得到11→10→9→8，逐步对象ID与原历史快照一致，焦点持续在画板；连续Ctrl+Shift+Z得到8→9→10→11。右上角按钮三次撤销与快捷键逐步结果相同。笔记输入时Ctrl+Z保持TEXTAREA焦点，保存稿不变。

类型检查、75模块构建、6文件45/45测试通过；本次UI回归记录见[results.json](evidence/continuous-undo/results.json)，[截图](evidence/continuous-undo/after.png)。此前单步快捷键验收每次重新聚焦画板，未覆盖这个焦点丢失场景；本次专门使用pressKey(null)连续发送真实按键。

4186已更新`index-B8j0E01h.js`，刷新前后当前稿对象ID和几何核对一致。当前分支`experience/round-four-2026-10-07`，修复提交`1da0bdc`，最新提交用`git log -1 --oneline`核对。启动方式沿用README，本修复已整合进[第四轮完整交接](HANDOFF-ROUND-FOUR-2026-10-07.md)；第四轮原截图与审计保留`77d2547`当时版本身份。
