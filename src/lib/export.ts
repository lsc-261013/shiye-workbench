import { HEIGHT, WIDTH, type Board } from "../types";
import { imageLoaded } from "./data";
function ellipsis(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const normalized = text.replace(/\s+/g, " ");
  if (ctx.measureText(normalized).width <= width) return normalized;
  const letters = Array.from(normalized);
  while (
    letters.length &&
    ctx.measureText(letters.join("") + "…").width > width
  )
    letters.pop();
  return letters.join("") + "…";
}
export async function renderPng(board: Board): Promise<Blob> {
  await document.fonts.ready;
  const images = new Map(
    await Promise.all(
      board.assets
        .filter((a) => a.data)
        .map(async (a) => [a.id, await imageLoaded(a.data)] as const),
    ),
  );
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const c = canvas.getContext("2d");
  if (!c) throw Error("浏览器无法创建画布");
  c.fillStyle = "#f7f4ed";
  c.fillRect(0, 0, WIDTH, HEIGHT);
  c.fillStyle = "#252723";
  c.font = '34px "Microsoft YaHei", sans-serif';
  c.fillText(ellipsis(c, board.title, 1520), 40, 65);
  c.font = '12px "Microsoft YaHei", sans-serif';
  c.fillStyle = "#77776e";
  c.fillText("VISUAL NOTES / 视觉参考方案", 40, 91);
  for (const p of board.items) {
    const a = board.assets.find((a) => a.id === p.assetId)!;
    c.save();
    c.beginPath();
    c.rect(p.x, p.y, p.w, p.h);
    c.clip();
    c.fillStyle = "#fffdfa";
    c.fillRect(p.x, p.y, p.w, p.h);
    const im = images.get(a.id);
    const iw = p.w - 16,
      ih = p.h - 78;
    if (im) {
      const scale = Math.min(iw / im.width, ih / im.height);
      c.drawImage(
        im,
        p.x + 8 + (iw - im.width * scale) / 2,
        p.y + 8 + (ih - im.height * scale) / 2,
        im.width * scale,
        im.height * scale,
      );
    } else {
      c.fillStyle = "#e9e6dc";
      c.fillRect(p.x + 8, p.y + 8, iw, ih);
      c.fillStyle = "#b34830";
      c.font = "36px sans-serif";
      c.fillText("↗", p.x + 28, p.y + 58);
      c.font = '18px "Microsoft YaHei", sans-serif';
      c.fillStyle = "#555b50";
      c.fillText(
        ellipsis(c, a.source, iw - 40),
        p.x + 28,
        p.y + Math.max(80, ih / 2),
      );
    }
    c.fillStyle = "#252723";
    c.font = '18px "Microsoft YaHei", sans-serif';
    c.fillText(ellipsis(c, a.title, p.w - 28), p.x + 14, p.y + p.h - 41);
    c.fillStyle = "#77776e";
    c.font = '14px "Microsoft YaHei", sans-serif';
    c.fillText(
      ellipsis(c, a.note || "添加你的借鉴点", p.w - 28),
      p.x + 14,
      p.y + p.h - 17,
    );
    c.restore();
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(Error("PNG 生成失败，请重试或导出备份"))),
      "image/png",
    ),
  );
}
