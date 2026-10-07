import { type Board, type Asset, safeUrl, WIDTH, HEIGHT } from "../types";
import { textLayout, validateText } from "./text";
import { validateCrop } from "./crop";
export const MAX_IMAGE = 12 * 1024 * 1024;
export const MAX_BACKUP = 100 * 1024 * 1024;
export const MAX_TOTAL_DATA = 90 * 1024 * 1024;
export const blank = (): Board => ({
  version: 2,
  title: "未命名视觉方案",
  assets: [],
  items: [],
});
export function validateBoard(value: unknown): Board {
  if (!value || typeof value !== "object")
    throw Error("备份不是有效的方案文件");
  const b = value as Board;
  if (b.version !== 1 && b.version !== 2 && b.version !== 3)
    throw Error("不支持此备份版本，原稿保持不变");
  if (
    typeof b.title !== "string" ||
    b.title.length > 100 ||
    !Array.isArray(b.assets) ||
    !Array.isArray(b.items) ||
    b.assets.length > 100 ||
    b.items.length > 150
  )
    throw Error("备份结构或数量超出限制");
  const ids = new Set<string>();
  for (const a of b.assets) {
    if (
      !a ||
      typeof a.id !== "string" ||
      ids.has(a.id) ||
      !["image", "link"].includes(a.kind)
    )
      throw Error("素材标识或类型无效");
    ids.add(a.id);
    for (const [k, max] of [
      ["title", 120],
      ["source", 2048],
      ["note", 5000],
      ["data", MAX_IMAGE * 1.4],
    ] as const)
      if (typeof a[k] !== "string" || a[k].length > max)
        throw Error("素材字段超出限制");
    if (a.source && !safeUrl(a.source))
      throw Error("来源网址仅支持 HTTP / HTTPS");
    if (
      (a.kind === "image" && !a.data) ||
      (a.data &&
        !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(a.data))
    )
      throw Error("图片缺失或图片格式不支持");
  }
  if (b.assets.reduce((n, a) => n + a.data.length, 0) > MAX_TOTAL_DATA)
    throw Error("方案图片总量超过 90 MB，请使用更小的图片");
  const placements = new Set<string>();
  for (const p of b.items) {
    if (
      !p ||
      typeof p.id !== "string" ||
      placements.has(p.id) ||
      (p.kind !== "text" && !ids.has(p.assetId || ""))
    )
      throw Error("画板引用了缺失的素材");
    placements.add(p.id);
    if (p.kind !== undefined && !["reference", "text"].includes(p.kind))
      throw Error("无法解释此画板对象类型");
    if (b.version === 1 && (p.kind === "text" || p.text || p.crop))
      throw Error("含新文字或裁切的备份必须使用版本2");
    if (p.kind === "text") {
      if (p.assetId !== undefined || p.crop || !p.text)
        throw Error("文字结构无效");
      validateText(p.text);
      if (textLayout(p.text, p.w).height > p.h + 1)
        throw Error("文字框不能完整容纳内容");
    } else {
      if (p.text) throw Error("参考对象不能含独立文字");
      if (p.crop) {
        if (p.crop.points !== undefined && b.version !== 3)
          throw Error("四点裁切备份必须使用版本3，原稿保持不变。");
        validateCrop(p.crop);
        if (!b.assets.find((a) => a.id === p.assetId)?.data)
          throw Error("无图片的链接不能裁切");
      }
    }
    if (
      ![p.x, p.y, p.w, p.h].every(Number.isFinite) ||
      p.w < 100 ||
      p.h < (p.kind === "text" ? 48 : 100) ||
      p.x < 0 ||
      p.y < 100 ||
      p.x + p.w > WIDTH + 1 ||
      p.y + p.h > HEIGHT - 25 + 1
    )
      throw Error("画板坐标无效");
  }
  return JSON.parse(JSON.stringify(b));
}
export function imageLoaded(data: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () =>
      im.naturalWidth && im.naturalWidth * im.naturalHeight <= 40000000
        ? resolve(im)
        : reject(Error("图片尺寸过大（最多 4000 万像素）"));
    im.onerror = () => reject(Error("图片无法读取，请重试 PNG、JPEG 或 WebP"));
    im.src = data;
  });
}
export async function readImage(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw Error("仅支持 PNG、JPEG、WebP 图片");
  if (file.size > MAX_IMAGE) throw Error("单张图片不能超过 12 MB");
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(Error("文件读取失败，请重试"));
    r.readAsDataURL(file);
  });
  await imageLoaded(data);
  return data;
}
export async function parseBackup(file: File) {
  if (file.size > MAX_BACKUP) throw Error("备份不能超过 100 MB");
  let value;
  try {
    value = JSON.parse(await file.text());
  } catch {
    throw Error("备份已损坏：无法读取 JSON");
  }
  const board = validateBoard(value);
  await Promise.all(
    board.assets.filter((a) => a.data).map((a) => imageLoaded(a.data)),
  );
  return board;
}
export function textList(board: Board) {
  return (
    `${board.title}\n视觉参考清单\n\n` +
    (board.items.some((p) => p.kind === "text")
      ? "画板独立文字（按叠放顺序）\n" +
        board.items
          .filter((p) => p.kind === "text")
          .map(
            (p, i) =>
              `${i + 1}. ${p.text!.style === "heading" ? "标题" : p.text!.style === "subheading" ? "小标题" : "便签正文"}\n${p.text!.content}\n`,
          )
          .join("\n") +
        "\n参考来源与笔记\n"
      : "") +
    board.assets
      .map(
        (a, i) =>
          `${i + 1}. ${a.title}\n来源：${a.source || "未填写"}\n借鉴点：${a.note || "未填写"}\n${board.items.some((p) => p.assetId === a.id) ? "已加入画板" : "仅在素材栏"}\n`,
      )
      .join("\n")
  );
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.hidden = true;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export const fileName = (title: string) =>
  title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60) || "视觉方案";
export function backupBlob(board: Board) {
  return new Blob([JSON.stringify(board)], { type: "application/json" });
}
export const assetLabel = (a: Asset) =>
  a.kind === "link" ? "参考链接" : "图片素材";
