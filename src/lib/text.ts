import { clone, type Board, type Placement, type TextBlock } from "../types";
export const TEXT_FONT = '"Microsoft YaHei", sans-serif';
export const TEXT_PADDING = 16;
export const MAX_TEXT_LENGTH = 1200;
export const textDefaults = (
  style: TextBlock["style"] = "note",
): TextBlock => ({
  content:
    style === "heading"
      ? "一组新的方向"
      : style === "subheading"
        ? "局部与细节"
        : "写下这一页的整体想法。",
  style,
  size: style === "heading" ? 44 : style === "subheading" ? 30 : 24,
  bold: style !== "note",
  align: "left",
  color: style === "subheading" ? "#b34830" : "#252723",
});
export function validateText(t: TextBlock) {
  if (
    !t ||
    typeof t.content !== "string" ||
    !t.content.trim() ||
    t.content.length > MAX_TEXT_LENGTH ||
    !["heading", "subheading", "note"].includes(t.style) ||
    !Number.isFinite(t.size) ||
    t.size < 20 ||
    t.size > 72 ||
    typeof t.bold !== "boolean" ||
    !["left", "center", "right"].includes(t.align) ||
    !["#252723", "#b34830", "#555b50"].includes(t.color)
  )
    throw Error("文字或样式无效：最多1200字，字号20–72。");
}
export function fontFor(t: TextBlock) {
  return `${t.bold ? 700 : 400} ${t.size}px ${TEXT_FONT}`;
}
export function textLayout(
  t: TextBlock,
  width: number,
  measure?: (s: string) => number,
) {
  validateText(t);
  if (!Number.isFinite(width) || width < 100 || width > 1520)
    throw Error("文字框宽度须为100–1520。");
  if (!measure) {
    if (typeof document === "undefined")
      measure = (s) => Array.from(s).length * t.size;
    else {
      const c = document.createElement("canvas").getContext("2d");
      if (!c) throw Error("无法测量文字，请重试。");
      c.font = fontFor(t);
      measure = (s) => c.measureText(s).width;
    }
  }
  const lines: string[] = [],
    max = width - TEXT_PADDING * 2;
  for (const paragraph of t.content.replace(/\r\n?/g, "\n").split("\n")) {
    let line = "";
    const tokens = paragraph.match(/[A-Za-z0-9_@./#-]+|./gu) || [];
    for (const token of tokens) {
      const parts = measure(token) > max ? Array.from(token) : [token];
      for (const part of parts) {
        if (measure(part) > max) throw Error("文字框太窄，请加宽或减小字号。");
        if (line && measure(line + part) > max) {
          const letters = Array.from(line),
            last = letters.at(-1)!;
          if (
            (/^[，。！？；：、）》」』】]/u.test(part) ||
              /[（《「『【]$/u.test(line)) &&
            letters.length > 1
          ) {
            letters.pop();
            lines.push(letters.join(""));
            line = last;
            if (measure(line + part) > max)
              throw Error("文字框太窄，无法完整放下标点，请加宽或减小字号。");
          } else {
            lines.push(line);
            line = "";
          }
        }
        line += part;
      }
    }
    lines.push(line);
  }
  const lineHeight = t.size * 1.45;
  return {
    lines,
    lineHeight,
    height: Math.ceil(lines.length * lineHeight + TEXT_PADDING * 2),
  };
}
export function fitText(p: Placement, t = p.text!, width = p.w) {
  const h = textLayout(t, width).height;
  if (p.y + h > 975 || p.x + width > 1600)
    throw Error(
      "完整文字放不下：请缩短内容、减小字号、加宽或先向上移动文字框。原稿保持不变。",
    );
  return { ...p, text: clone(t), w: width, h };
}
export function applyText(
  board: Board,
  id: string,
  text: TextBlock,
  width: number,
) {
  const b = clone(board),
    p = b.items.find((p) => p.id === id && p.kind === "text");
  if (!p) throw Error("文字对象已不在当前画板。");
  Object.assign(p, fitText(p, text, width));
  if (b.version === 1) b.version = 2;
  return b;
}
