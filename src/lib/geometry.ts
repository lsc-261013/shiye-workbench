import { WIDTH, HEIGHT, type Placement } from "../types";
export function move(p: Placement, dx: number, dy: number) {
  let x = Math.max(0, Math.min(WIDTH - p.w, p.x + dx));
  let y = Math.max(100, Math.min(HEIGHT - 25 - p.h, p.y + dy));
  const guides: { x?: number; y?: number } = {};
  for (const edge of [40, WIDTH / 2 - p.w / 2, WIDTH - p.w - 40])
    if (Math.abs(x - edge) < 8) {
      x = edge;
      guides.x =
        edge === 40 ? 40 : edge === WIDTH - p.w - 40 ? WIDTH - 40 : WIDTH / 2;
    }
  for (const edge of [130, HEIGHT / 2 - p.h / 2])
    if (Math.abs(y - edge) < 8) {
      y = edge;
      guides.y = edge === 130 ? 130 : HEIGHT / 2;
    }
  return { x, y, guides };
}
export function resize(p: Placement, dx: number, dy: number) {
  const ratio = p.w / p.h;
  const desired = Math.abs(dx) > Math.abs(dy) ? p.w + dx : (p.h + dy) * ratio;
  const min = Math.max(100, 100 * ratio);
  const w = Math.min(
    WIDTH - p.x,
    (HEIGHT - 25 - p.y) * ratio,
    Math.max(min, desired),
  );
  return { w: Math.max(100, w), h: Math.max(100, w / ratio) };
}
