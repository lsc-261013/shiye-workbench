import { clone, uid, type Board, type Placement, type Asset } from "../types";
export function clientToBoard(
  x: number,
  y: number,
  box: { left: number; top: number; width: number; height: number },
) {
  if (
    !box.width ||
    !box.height ||
    x < box.left ||
    x > box.left + box.width ||
    y < box.top ||
    y > box.top + box.height
  )
    return null;
  return {
    x: ((x - box.left) * 1600) / box.width,
    y: ((y - box.top) * 1000) / box.height,
  };
}
export function placeAt(size: { w: number; h: number }, x = 800, y = 500) {
  return {
    ...size,
    x: Math.max(0, Math.min(1600 - size.w, x - size.w / 2)),
    y: Math.max(100, Math.min(975 - size.h, y - size.h / 2)),
  };
}
export interface ObjectClipboard {
  items: Placement[];
  assets: Asset[];
}
export function copyObjects(board: Board, ids: string[]): ObjectClipboard {
  const items = board.items.filter((p) => ids.includes(p.id));
  return clone({
    items,
    assets: board.assets.filter((a) => items.some((p) => p.assetId === a.id)),
  });
}
export function pasteObjects(
  board: Board,
  snapshot: ObjectClipboard,
  iteration = 0,
) {
  if (!snapshot.items.length) throw Error("本次编辑会话尚未复制对象。");
  if (board.items.length + snapshot.items.length > 150)
    throw Error("粘贴后超过150个对象，整批未添加。");
  const b = clone(board),
    mapped = new Map<string, string>();
  const content = ({ id, ...a }: Asset) => JSON.stringify(a);
  for (const a of snapshot.assets) {
    let existing = b.assets.find((x) => content(x) === content(a));
    if (!existing) {
      existing = { ...clone(a), id: uid() };
      b.assets.push(existing);
    }
    mapped.set(a.id, existing.id);
  }
  if (b.assets.length > 100)
    throw Error("粘贴需要的素材超过100份，整批未添加。");
  if (b.assets.reduce((n, a) => n + a.data.length, 0) > 90 * 1024 * 1024)
    throw Error("粘贴后图片总量超过90MB，整批未添加。");
  const items = snapshot.items,
    left = Math.min(...items.map((p) => p.x)),
    right = Math.max(...items.map((p) => p.x + p.w)),
    top = Math.min(...items.map((p) => p.y)),
    bottom = Math.max(...items.map((p) => p.y + p.h));
  const width = right - left;
  let dx = width + 24 + iteration * 24,
    dy = iteration * 24;
  if (right + dx > 1600) dx = -width - 24 - iteration * 24;
  if (left + dx < 0) {
    dx = (iteration + 1) * 24;
    dy = (iteration + 1) * 24;
  }
  dx = Math.max(-left, Math.min(1600 - right, dx));
  dy = Math.max(100 - top, Math.min(975 - bottom, dy));
  const copies = items.map((p) => ({
    ...clone(p),
    id: uid(),
    ...(p.assetId ? { assetId: mapped.get(p.assetId)! } : {}),
    x: p.x + dx,
    y: p.y + dy,
  }));
  b.items.push(...copies);
  if (copies.some((p) => p.crop?.points)) b.version = 3;
  else if (copies.some((p) => p.kind === "text" || p.crop) && b.version === 1)
    b.version = 2;
  return { board: b, ids: copies.map((p) => p.id) };
}
export function removeObjects(board: Board, ids: string[]) {
  const b = clone(board);
  b.items = b.items.filter((p) => !ids.includes(p.id));
  return b;
}
