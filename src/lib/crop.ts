import { clone, type Board, type Crop } from "../types";
import { polygonCrop } from "./polygon";
export const fullCrop = (): Crop => ({ x: 0, y: 0, w: 1, h: 1 });
export function validateCrop(c: Crop) {
  if (
    !c ||
    ![c.x, c.y, c.w, c.h].every(Number.isFinite) ||
    c.x < 0 ||
    c.y < 0 ||
    c.w < 0.001 ||
    c.h < 0.001 ||
    c.x + c.w > 1.000001 ||
    c.y + c.h > 1.000001
  )
    throw Error("裁切区域无效，原稿保持不变。");
  if (c.points !== undefined) {
    if (!Array.isArray(c.points)) throw Error("四点裁切结构无效。");
    const bounds = polygonCrop(c.points);
    if (
      ["x", "y", "w", "h"].some(
        (k) =>
          Math.abs(
            c[k as keyof Pick<Crop, "x" | "y" | "w" | "h">] -
              bounds[k as keyof Pick<Crop, "x" | "y" | "w" | "h">],
          ) > 0.000001,
      )
    )
      throw Error("四点裁切边界不一致。");
  }
}
export function cropSource(c: Crop | undefined, width: number, height: number) {
  const r = c || fullCrop();
  validateCrop(r);
  return { x: r.x * width, y: r.y * height, w: r.w * width, h: r.h * height };
}
export function ratioCrop(
  ratio: number,
  imageRatio: number,
  current: Crop,
): Crop {
  let w = current.w,
    h = (w * imageRatio) / ratio;
  if (h > 1) {
    h = 1;
    w = ratio / imageRatio;
  }
  const x = Math.max(0, Math.min(1 - w, current.x + current.w / 2 - w / 2));
  const y = Math.max(0, Math.min(1 - h, current.y + current.h / 2 - h / 2));
  return { x, y, w, h };
}
export function applyCrop(board: Board, id: string, crop?: Crop) {
  const b = clone(board),
    p = b.items.find((p) => p.id === id && p.kind !== "text");
  if (!p || !b.assets.find((a) => a.id === p.assetId)?.data)
    throw Error("请选择带图片的画板对象。");
  if (crop) {
    validateCrop(crop);
    p.crop = { ...crop };
  } else delete p.crop;
  b.version = crop?.points ? 3 : board.version === 1 ? 2 : board.version;
  return b;
}
export function replaceImage(board: Board, id: string, data: string) {
  const b = clone(board),
    a = b.assets.find((a) => a.id === id);
  if (!a) throw Error("素材已不在当前方案。");
  a.data = data;
  for (const p of b.items) if (p.assetId === id) delete p.crop;
  return b;
}
