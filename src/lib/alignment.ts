import { clone, type Board, type Placement } from "../types";
export type Alignment =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom"
  | "horizontal"
  | "vertical";
export function alignItems(
  board: Board,
  ids: string[],
  action: Alignment,
): Board {
  const b = clone(board),
    chosen = b.items.filter((p) => ids.includes(p.id)),
    distribution = action === "horizontal" || action === "vertical";
  if (chosen.length < (distribution ? 3 : 2))
    throw Error(
      distribution ? "均分需要至少3个对象。" : "对齐需要至少2个对象。",
    );
  const left = Math.min(...chosen.map((p) => p.x)),
    right = Math.max(...chosen.map((p) => p.x + p.w)),
    top = Math.min(...chosen.map((p) => p.y)),
    bottom = Math.max(...chosen.map((p) => p.y + p.h));
  if (distribution) {
    const axis = action === "horizontal" ? "x" : "y",
      dim = axis === "x" ? "w" : "h",
      sorted = chosen
        .slice()
        .sort(
          (a, b) =>
            a[axis] - b[axis] ||
            board.items.indexOf(a) - board.items.indexOf(b),
        );
    const span = axis === "x" ? right - left : bottom - top,
      sum = chosen.reduce((s, p) => s + p[dim], 0),
      gap = (span - sum) / (chosen.length - 1);
    if (gap < 0)
      throw Error(
        "选区空间不足，无法均分出不重叠的间距。请先拉开两端对象。原布局保持不变。",
      );
    let cursor = axis === "x" ? left : top;
    for (const p of sorted) {
      p[axis] = cursor;
      cursor += p[dim] + gap;
    }
  } else
    for (const p of chosen) {
      if (action === "left") p.x = left;
      if (action === "center") p.x = (left + right - p.w) / 2;
      if (action === "right") p.x = right - p.w;
      if (action === "top") p.y = top;
      if (action === "middle") p.y = (top + bottom - p.h) / 2;
      if (action === "bottom") p.y = bottom - p.h;
    }
  if (
    chosen.some(
      (p) =>
        p.x < 0 || p.y < 100 || p.x + p.w > 1600.001 || p.y + p.h > 975.001,
    )
  )
    throw Error("结果超出画板，原布局保持不变。");
  return b;
}
export function moveSelection(items: Placement[], dx: number, dy: number) {
  const x = Math.max(
    -Math.min(...items.map((p) => p.x)),
    Math.min(dx, 1600 - Math.max(...items.map((p) => p.x + p.w))),
  );
  const y = Math.max(
    100 - Math.min(...items.map((p) => p.y)),
    Math.min(dy, 975 - Math.max(...items.map((p) => p.y + p.h))),
  );
  return items.map((p) => ({ ...p, x: p.x + x, y: p.y + y }));
}
