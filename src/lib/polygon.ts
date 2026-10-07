import type { Crop, CropPoint } from "../types";
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const cross = (a: CropPoint, b: CropPoint, c: CropPoint) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
function intersects(a: CropPoint, b: CropPoint, c: CropPoint, d: CropPoint) {
  return (
    cross(a, b, c) * cross(a, b, d) <= 0 && cross(c, d, a) * cross(c, d, b) <= 0
  );
}
export function polygonCrop(points: CropPoint[]): Crop {
  if (
    points.length !== 4 ||
    points.some(
      (p) =>
        !p ||
        ![p.x, p.y].every(Number.isFinite) ||
        p.x < 0 ||
        p.x > 1 ||
        p.y < 0 ||
        p.y > 1,
    )
  )
    throw Error("四个裁切点须在原图内。");
  const [a, b, c, d] = points as [CropPoint, CropPoint, CropPoint, CropPoint];
  if (intersects(a, b, c, d) || intersects(b, c, d, a))
    throw Error("裁切边不能交叉，保留最后合法形状。");
  const area =
    points.reduce((s, p, i) => {
      const next = points[(i + 1) % 4]!;
      return s + p.x * next.y - next.x * p.y;
    }, 0) / 2;
  if (
    area < 0.0001 ||
    points.some((p, i) => {
      const q = points[(i + 1) % 4]!;
      return Math.hypot(q.x - p.x, q.y - p.y) < 0.001;
    })
  )
    throw Error("裁切区域太小或角点重合，保留最后合法形状。");
  const x = Math.min(...points.map((p) => p.x)),
    y = Math.min(...points.map((p) => p.y));
  return {
    x,
    y,
    w: Math.max(...points.map((p) => p.x)) - x,
    h: Math.max(...points.map((p) => p.y)) - y,
    points: points.map((p) => ({ ...p })) as Crop["points"],
  };
}
export function cropPoints(
  c: Crop,
): [CropPoint, CropPoint, CropPoint, CropPoint] {
  return (
    (c.points?.map((p) => ({ ...p })) as Crop["points"]) || [
      { x: c.x, y: c.y },
      { x: c.x + c.w, y: c.y },
      { x: c.x + c.w, y: c.y + c.h },
      { x: c.x, y: c.y + c.h },
    ]
  );
}
export function translateCrop(c: Crop, dx: number, dy: number): Crop {
  dx = Math.max(-c.x, Math.min(1 - c.x - c.w, dx));
  dy = Math.max(-c.y, Math.min(1 - c.y - c.h, dy));
  return c.points
    ? polygonCrop(c.points.map((p) => ({ x: p.x + dx, y: p.y + dy })))
    : { ...c, x: c.x + dx, y: c.y + dy };
}
export function resizeCrop(
  c: Crop,
  corner: number,
  at: CropPoint,
  imageRatio: number,
): Crop {
  const points = cropPoints(c),
    anchor = points[(corner + 2) % 4]!;
  const sx = corner === 0 || corner === 3 ? -1 : 1,
    sy = corner < 2 ? -1 : 1;
  // Project the pointer onto the existing diagonal in original image pixels.
  const aw = c.w * imageRatio,
    ah = c.h;
  let factor =
    ((at.x - anchor.x) * sx * imageRatio * aw + (at.y - anchor.y) * sy * ah) /
    (aw * aw + ah * ah);
  factor = Math.min(
    (sx > 0 ? 1 - anchor.x : anchor.x) / c.w,
    (sy > 0 ? 1 - anchor.y : anchor.y) / c.h,
    Math.max(0.02, 0.001 / c.w, 0.001 / c.h, factor),
  );
  const w = c.w * factor,
    h = c.h * factor;
  return {
    x: sx > 0 ? anchor.x : anchor.x - w,
    y: sy > 0 ? anchor.y : anchor.y - h,
    w,
    h,
  };
}
