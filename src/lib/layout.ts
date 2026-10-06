import { WIDTH, HEIGHT, type Asset, type Placement } from "../types";
import { textLayout } from "./text";

export const MAX_AUTO_ITEMS = 12;
export const LAYOUT_GAP = 24;
export const LAYOUT_BOUNDS = {
  left: 40,
  top: 130,
  right: WIDTH - 40,
  bottom: HEIGHT - 25,
};
type Size = { w: number; h: number };
type Rect = Size & { x: number; y: number };
export type AspectRatios = Record<string, number>;

function aspect(asset: Asset, ratio = 1.3) {
  return asset.data && Number.isFinite(ratio) && ratio > 0 ? ratio : 1.4;
}
export function preferredSize(asset: Asset, ratio?: number): Size {
  if (!asset.data) return { w: 360, h: 250 };
  const r = Math.max(0.55, Math.min(2.2, aspect(asset, ratio)));
  const w = r < 0.85 ? 290 : r > 1.4 ? 420 : 340;
  return { w, h: Math.round(Math.min(500, Math.max(230, (w - 16) / r + 78))) };
}
export function separated(a: Rect, b: Rect, gap = LAYOUT_GAP) {
  return (
    a.x + a.w + gap <= b.x ||
    b.x + b.w + gap <= a.x ||
    a.y + a.h + gap <= b.y ||
    b.y + b.h + gap <= a.y
  );
}
export function findRectSpace(items: Placement[], size: Size): Rect | null {
  if (items.length >= 150) return null;
  const xs = new Set([40]),
    ys = new Set([130]);
  for (const p of items) {
    xs.add(p.x + p.w + 24);
    xs.add(p.x - size.w - 24);
    ys.add(p.y + p.h + 24);
    ys.add(p.y - size.h - 24);
  }
  for (let x = 40; x + size.w <= 1560; x += 32) xs.add(x);
  for (let y = 130; y + size.h <= 975; y += 32) ys.add(y);
  for (const y of [...ys].sort((a, b) => a - b))
    for (const x of [...xs].sort((a, b) => a - b)) {
      const rect = { x, y, w: size.w, h: size.h };
      if (
        x >= 40 &&
        y >= 130 &&
        x + size.w <= 1560 &&
        y + size.h <= 975 &&
        items.every((p) => separated(rect, p))
      )
        return rect;
    }
  return null;
}

// Add only the new card; never move existing placements to create a gap.
export function findFreeSpace(
  items: Placement[],
  asset: Asset,
  ratio?: number,
): Rect | null {
  if (items.length >= 150) return null;
  const size = preferredSize(asset, ratio);
  for (const factor of [1, 0.85]) {
    const w = Math.max(240, Math.round(size.w * factor));
    const h = Math.max(200, Math.round(size.h * factor));
    const xs = new Set([LAYOUT_BOUNDS.left]);
    const ys = new Set([LAYOUT_BOUNDS.top]);
    for (const p of items) {
      xs.add(Math.max(LAYOUT_BOUNDS.left, p.x));
      xs.add(p.x + p.w + LAYOUT_GAP);
      xs.add(p.x - w - LAYOUT_GAP);
      ys.add(Math.max(LAYOUT_BOUNDS.top, p.y));
      ys.add(p.y + p.h + LAYOUT_GAP);
      ys.add(p.y - h - LAYOUT_GAP);
    }
    // A small scan also finds gaps between irregular, manually placed cards.
    for (let x = LAYOUT_BOUNDS.left; x + w <= LAYOUT_BOUNDS.right; x += 40)
      xs.add(x);
    for (let y = LAYOUT_BOUNDS.top; y + h <= LAYOUT_BOUNDS.bottom; y += 40)
      ys.add(y);
    for (const y of [...ys].sort((a, b) => a - b)) {
      for (const x of [...xs].sort((a, b) => a - b)) {
        const rect = { x, y, w, h };
        if (
          x >= LAYOUT_BOUNDS.left &&
          y >= LAYOUT_BOUNDS.top &&
          x + w <= LAYOUT_BOUNDS.right &&
          y + h <= LAYOUT_BOUNDS.bottom &&
          items.every((p) => separated(rect, p))
        )
          return rect;
      }
    }
  }
  return null;
}

// One bounded strategy: ordered rows, equal row heights, aspect-weighted widths.
export function arrangePlacements(
  items: Placement[],
  assets: Asset[],
  ratios: AspectRatios = {},
): Placement[] {
  if (items.length > MAX_AUTO_ITEMS)
    throw Error(
      `整理排版适合一页最多 ${MAX_AUTO_ITEMS} 个元素。当前 ${items.length} 个，原布局保持不变；请先移除部分画板元素。`,
    );
  if (!items.length) return [];
  const byId = new Map(assets.map((a) => [a.id, a]));
  const getAsset = (p: Placement) => {
    const a = byId.get(p.assetId || "");
    if (!a) throw Error("画板参考缺失，原布局保持不变。");
    return a;
  };
  const displayedRatio = (p: Placement) =>
    (ratios[p.assetId || ""] || 1.3) * (p.crop ? p.crop.w / p.crop.h : 1);
  if (items.some((p) => p.kind === "text")) {
    for (const factor of [1, 0.85, 0.7]) {
      let x = 40,
        y = 130,
        rowHeight = 0,
        fits = true;
      const result = items.map((p) => {
        const preferred =
          p.kind === "text"
            ? { w: p.w, h: textLayout(p.text!, p.w).height }
            : preferredSize(getAsset(p), displayedRatio(p));
        const size =
          p.kind === "text"
            ? preferred
            : {
                w: Math.max(240, Math.round(preferred.w * factor)),
                h: Math.max(200, Math.round(preferred.h * factor)),
              };
        if (x + size.w > 1560) {
          x = 40;
          y += rowHeight + 24;
          rowHeight = 0;
        }
        if (size.w > 1520 || y + size.h > 975) fits = false;
        const next = { ...p, ...size, x, y };
        x += size.w + 24;
        rowHeight = Math.max(rowHeight, size.h);
        return next;
      });
      if (fits) return result;
    }
    throw Error(
      "这组内容按当前文字字号无法完整整理进一页。原布局保持不变；可缩短文字、减少元素或手动编排。",
    );
  }
  if (items.length === 1) {
    const p = items[0]!;
    return [
      {
        ...p,
        ...preferredSize(getAsset(p), displayedRatio(p)),
        x: LAYOUT_BOUNDS.left,
        y: LAYOUT_BOUNDS.top,
      },
    ];
  }
  const columns =
    items.length <= 3
      ? items.length
      : items.length <= 4
        ? 2
        : items.length <= 9
          ? 3
          : 4;
  const rows = Math.ceil(items.length / columns);
  const availableWidth =
    LAYOUT_BOUNDS.right - LAYOUT_BOUNDS.left - (columns - 1) * LAYOUT_GAP;
  const h = Math.min(
    540,
    Math.floor(
      (LAYOUT_BOUNDS.bottom - LAYOUT_BOUNDS.top - (rows - 1) * LAYOUT_GAP) /
        rows,
    ),
  );
  const result: Placement[] = [];
  for (let row = 0; row < rows; row++) {
    const slice = items.slice(row * columns, (row + 1) * columns);
    const weights = Array.from({ length: columns }, (_, column) => {
      const p = slice[column];
      return p
        ? Math.max(0.8, Math.min(1.7, aspect(getAsset(p), displayedRatio(p))))
        : 1.2;
    });
    const totalWeight = weights.reduce((sum, r) => sum + r, 0);
    let x = LAYOUT_BOUNDS.left;
    for (let column = 0; column < slice.length; column++) {
      const p = slice[column]!;
      const w = Math.floor(
        240 +
          ((availableWidth - 240 * columns) * weights[column]!) / totalWeight,
      );
      result.push({
        ...p,
        x,
        y: LAYOUT_BOUNDS.top + row * (h + LAYOUT_GAP),
        w,
        h,
      });
      x += w + LAYOUT_GAP;
    }
  }
  return result;
}
