import { describe, it, expect, vi, afterEach } from "vitest";
import "fake-indexeddb/auto";
import {
  blank,
  validateBoard,
  textList,
  parseBackup,
  readImage,
  MAX_IMAGE,
} from "../src/lib/data";
import { saveBoard, loadBoard } from "../src/lib/storage";
import { History } from "../src/lib/history";
import { move, resize } from "../src/lib/geometry";
import { clone, safeUrl, type Board } from "../src/types";
const pixel =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=";
const fixture = (): Board => ({
  version: 1,
  title: "测试方案",
  assets: [
    {
      id: "a",
      kind: "image",
      title: "参考",
      source: "https://example.com/",
      note: "完整说明\n第二行",
      data: pixel,
    },
  ],
  items: [{ id: "p", assetId: "a", x: 40, y: 135, w: 400, h: 300 }],
});
afterEach(() => vi.restoreAllMocks());
describe("backup boundary", () => {
  it("round trips image bytes, complete notes and coordinates", () => {
    const b = fixture();
    expect(validateBoard(JSON.parse(JSON.stringify(b)))).toEqual(b);
  });
  it("rejects unsupported version, missing image/reference, dangerous protocols and off-board geometry", () => {
    for (const mutate of [
      (b: Board) => {
        b.version = 3 as 1;
      },
      (b: Board) => (b.assets[0]!.data = ""),
      (b: Board) => (b.items[0]!.assetId = "missing"),
      (b: Board) => (b.assets[0]!.source = "javascript:alert(1)"),
      (b: Board) => (b.items[0]!.x = -10),
      (b: Board) => (b.items[0]!.w = Infinity),
    ]) {
      const b = fixture();
      mutate(b);
      expect(() => validateBoard(b)).toThrow();
    }
  });
  it("rejects duplicate identifiers and oversized fields", () => {
    const b = fixture();
    b.assets.push(clone(b.assets[0]!));
    expect(() => validateBoard(b)).toThrow();
    b.assets.pop();
    b.assets[0]!.note = "x".repeat(5001);
    expect(() => validateBoard(b)).toThrow();
  });
  it("invalid JSON fails without mutating the current board", async () => {
    const b = fixture();
    await expect(parseBackup(new File(["{bad"], "bad.json"))).rejects.toThrow(
      "损坏",
    );
    expect(b).toEqual(fixture());
  });
  it("only accepts raster file types and bounded size before decoding", async () => {
    await expect(
      readImage(new File(["<svg>"], "x.svg", { type: "image/svg+xml" })),
    ).rejects.toThrow("仅支持");
    await expect(
      readImage(
        new File([new Uint8Array(MAX_IMAGE + 1)], "big.png", {
          type: "image/png",
        }),
      ),
    ).rejects.toThrow("12 MB");
  });
  it("keeps full notes and explicitly missing sources in text export", () => {
    const b = fixture();
    b.assets[0]!.source = "";
    const text = textList(b);
    expect(text).toContain("未填写");
    expect(text).toContain("完整说明\n第二行");
    expect(text).toContain("已加入画板");
  });
  it("rejects data/file/javascript links but permits HTTPS", () => {
    for (const u of [
      "javascript:alert(1)",
      "data:text/html,hi",
      "file:///tmp/a",
    ])
      expect(safeUrl(u)).toBe("");
    expect(safeUrl("https://vuejs.org/")).toBe("https://vuejs.org/");
  });
});
describe("history and coordinates", () => {
  it("one gesture is one history entry, redo restores it and new change clears redo", () => {
    const h = new History<Board>(),
      a = fixture(),
      b = clone(a);
    b.items[0]!.x = 300;
    h.push(a);
    const undone = h.undo(b)!;
    expect(undone).toEqual(a);
    expect(h.redo(undone)).toEqual(b);
    h.undo(b);
    h.push(a);
    expect(h.future).toHaveLength(0);
  });
  it("snap and clamp never escape the board", () => {
    const p = fixture().items[0]!;
    expect(move(p, 4, 0).x).toBe(40);
    expect(move(p, 99999, 99999)).toMatchObject({ x: 1200, y: 675 });
    expect(move(p, -999, -999)).toMatchObject({ x: 0, y: 100 });
  });
  it("maintains aspect ratio while clamping resize to bounds", () => {
    const p = fixture().items[0]!;
    for (const dx of [-1000, 100, 9999]) {
      const r = resize(p, dx, 0);
      expect(r.w / r.h).toBeCloseTo(p.w / p.h);
      expect(p.x + r.w).toBeLessThanOrEqual(1600);
      expect(p.y + r.h).toBeLessThanOrEqual(975);
      expect(r.h).toBeGreaterThanOrEqual(100);
    }
  });
});
describe("real IndexedDB transaction API via fake-indexeddb", () => {
  it("writes and recovers the full draft after database close", async () => {
    await saveBoard(fixture());
    expect(await loadBoard()).toEqual(fixture());
    await saveBoard(blank());
    expect(await loadBoard()).toEqual(blank());
  });
  it("propagates storage failure without changing existing data", async () => {
    await saveBoard(fixture());
    const spy = vi.spyOn(indexedDB, "open").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    await expect(saveBoard(blank())).rejects.toThrow();
    spy.mockRestore();
    expect(await loadBoard()).toEqual(fixture());
  });
});
