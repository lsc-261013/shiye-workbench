import { describe, it, expect, vi, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { blank, validateBoard, textList } from "../src/lib/data";
import { textDefaults, textLayout, fitText, applyText } from "../src/lib/text";
import {
  applyCrop,
  cropSource,
  ratioCrop,
  replaceImage,
} from "../src/lib/crop";
import { alignItems, moveSelection } from "../src/lib/alignment";
import { arrangePlacements, findRectSpace, separated } from "../src/lib/layout";
import { saveBoard, loadBoard, loadOriginal } from "../src/lib/storage";
import { History } from "../src/lib/history";
import { clone, type Board, type Placement } from "../src/types";
const pixel = "data:image/png;base64,YQ==";
function fixture(): Board {
  return {
    version: 1,
    title: "旧方案",
    assets: [
      {
        id: "a",
        kind: "image",
        title: "标记图",
        source: "https://example.com/中文",
        note: "完整\n来源笔记",
        data: pixel,
      },
    ],
    items: [
      { id: "p", assetId: "a", x: 40, y: 130, w: 240, h: 200 },
      { id: "q", assetId: "a", x: 440, y: 330, w: 240, h: 200 },
      { id: "r", assetId: "a", x: 1040, y: 630, w: 240, h: 200 },
    ],
  };
}
const textItem = (): Placement => {
  const text = textDefaults("subheading");
  text.content = "中文分组\n标题";
  return {
    id: "text",
    kind: "text",
    text,
    x: 40,
    y: 600,
    w: 480,
    h: textLayout(text, 480).height,
  };
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("versioned creative data", () => {
  it("keeps short Latin words intact and closing Chinese punctuation with preceding text", () => {
    const t = { ...textDefaults(), content: "这是一个项目。 hello world" };
    const layout = textLayout(t, 152, (s) => Array.from(s).length * 20);
    expect(layout.lines.some((s) => s.startsWith("。"))).toBe(false);
    expect(layout.lines.some((s) => s.includes("hello"))).toBe(true);
    expect(layout.lines.some((s) => s.includes("world"))).toBe(true);
  });
  it("reads v1 unchanged and roundtrips v2 text/crop without invented assets", () => {
    const old = fixture();
    expect(validateBoard(old)).toEqual(old);
    const next = applyCrop(old, "p", { x: 0.25, y: 0.1, w: 0.5, h: 0.8 });
    next.items.push(textItem());
    expect(validateBoard(JSON.parse(JSON.stringify(next)))).toEqual(next);
    expect(next.assets).toEqual(old.assets);
    expect(next.items[3]!.assetId).toBeUndefined();
    expect(textList(next)).toContain("中文分组\n标题");
    expect(textList(next)).toContain(old.assets[0]!.note);
  });
  it("rejects unknown versions/kinds, hidden v2 data in v1, invalid crop or truncated text without mutation", () => {
    const old = fixture();
    for (const change of [
      (b: Board) => (b.version = 7 as 2),
      (b: Board) => (b.items[0]!.kind = "unknown" as "text"),
      (b: Board) => (b.items[0]!.crop = { x: 0, y: 0, w: 0.5, h: 0.5 }),
      (b: Board) => {
        b.version = 2;
        b.items[0]!.crop = { x: 0.9, y: 0, w: 0.2, h: 0.5 };
      },
      (b: Board) => {
        b.version = 2;
        const p = textItem();
        p.h = 48;
        b.items.push(p);
      },
      (b: Board) => {
        b.version = 2;
        const p = textItem();
        p.assetId = "a";
        b.items.push(p);
      },
    ]) {
      const b = clone(old);
      change(b);
      expect(() => validateBoard(b)).toThrow();
    }
    expect(old).toEqual(fixture());
  });
  it("keeps Unicode/newlines safe and refuses overlong or overflowing edits in one transaction", () => {
    const b = blank();
    b.items.push(textItem());
    const original = clone(b);
    const t = {
      ...b.items[0]!.text!,
      content: "<img onerror=alert(1)>\n中文🙂第二段",
    };
    const next = applyText(b, "text", t, 480);
    expect(next.items[0]!.text?.content).toBe(t.content);
    expect(() =>
      applyText(b, "text", { ...t, content: "字".repeat(1201) }, 480),
    ).toThrow();
    expect(() => fitText({ ...textItem(), y: 950 }, t, 100)).toThrow(
      /完整文字/,
    );
    expect(b).toEqual(original);
    expect(
      textLayout(
        { ...t, content: "中文\n\n第二行" },
        100,
        (s) => Array.from(s).length * 20,
      ).lines,
    ).toEqual(["中文", "", "第二行"]);
  });
  it("atomically keeps raw v1 snapshot before first v2 write and retains it through edits", async () => {
    const before = fixture();
    await saveBoard(before);
    const after = applyCrop(before, "p", { x: 0, y: 0, w: 0.5, h: 1 });
    await saveBoard(after);
    expect(await loadOriginal()).toEqual(before);
    expect(await loadBoard()).toEqual(after);
    after.title = "后续";
    await saveBoard(after);
    expect(await loadOriginal()).toEqual(before);
  });
  it("aborted v2 write retains both the old current draft and previous upgrade snapshot", async () => {
    const before = fixture();
    await saveBoard(before);
    const original = await loadOriginal();
    const write = IDBObjectStore.prototype.put;
    const spy = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementation(function (this: IDBObjectStore, value, key) {
        if (key === "current")
          throw new DOMException("Full", "QuotaExceededError");
        return write.call(this, value, key);
      });
    await expect(
      saveBoard(applyCrop(before, "p", { x: 0, y: 0, w: 0.5, h: 1 })),
    ).rejects.toThrow();
    spy.mockRestore();
    expect(await loadBoard()).toEqual(before);
    expect(await loadOriginal()).toEqual(original);
  });
});
describe("instance crop and geometry", () => {
  it("uses original pixels at exact edges and preserves independent instances", () => {
    const old = fixture(),
      b = applyCrop(old, "p", { x: 0.5, y: 0, w: 0.5, h: 1 });
    expect(cropSource(b.items[0]!.crop, 800, 400)).toEqual({
      x: 400,
      y: 0,
      w: 400,
      h: 400,
    });
    expect(b.items[1]!.crop).toBeUndefined();
    expect(b.assets).toEqual(old.assets);
    expect(old).toEqual(fixture());
    for (const r of [0.05, 1, 20]) {
      const c = ratioCrop(16 / 9, r, { x: 0.2, y: 0.2, w: 0.6, h: 0.6 });
      expect((c.w * r) / c.h).toBeCloseTo(16 / 9);
      expect(c.x + c.w).toBeLessThanOrEqual(1.00001);
      expect(c.y + c.h).toBeLessThanOrEqual(1.00001);
    }
  });
  it("replacement resets all shared crops, keeps geometry/layers, and one undo restores bytes/crops", () => {
    let before = applyCrop(fixture(), "p", { x: 0.1, y: 0.2, w: 0.6, h: 0.7 });
    before = applyCrop(before, "q", { x: 0.5, y: 0, w: 0.5, h: 1 });
    const after = replaceImage(before, "a", "data:image/png;base64,Yg==");
    expect(after.items.map((p) => p.crop)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    expect(after.items.map(({ crop, ...p }) => p)).toEqual(
      before.items.map(({ crop, ...p }) => p),
    );
    const h = new History<Board>();
    h.push(before);
    expect(h.undo(after)).toEqual(before);
    expect(h.redo(before)).toEqual(after);
    expect(applyCrop(before, "p").items[1]!.crop).toEqual(
      before.items[1]!.crop,
    );
  });
  it("aligns only selection to bounds and distributes equal gaps with exact history", () => {
    const before = fixture();
    before.items[0]!.crop = { x: 0, y: 0, w: 0.5, h: 1 };
    before.version = 2;
    const result = alignItems(before, ["p", "q"], "right");
    expect(result.items[0]!.x).toBe(440);
    expect(result.items[2]).toEqual(before.items[2]);
    const spaced = alignItems(before, ["p", "q", "r"], "horizontal");
    expect(spaced.items.map((p) => p.x)).toEqual([40, 540, 1040]);
    const history = new History<Board>();
    history.push(before);
    expect(history.undo(spaced)).toEqual(before);
    expect(history.redo(before)).toEqual(spaced);
    expect(before.items[0]!.x).toBe(40);
    expect(result.items[0]!.crop).toEqual(before.items[0]!.crop);
  });
  it("rejects insufficient counts/negative spacing and moves a set without distorting internal offsets", () => {
    const b = fixture();
    expect(() => alignItems(b, ["p"], "left")).toThrow();
    expect(() => alignItems(b, ["p", "q"], "horizontal")).toThrow();
    b.items[2]!.x = 50;
    expect(() => alignItems(b, ["p", "q", "r"], "horizontal")).toThrow(
      /空间不足/,
    );
    const moved = moveSelection(b.items, 9999, -9999);
    expect(Math.min(...moved.map((p) => p.y))).toBe(100);
    expect(Math.max(...moved.map((p) => p.x + p.w))).toBe(1600);
    expect(moved[1]!.x - moved[0]!.x).toBe(400);
  });
  it("copies into a true free gap, and mixed arrangement preserves text size/crop and refuses overflow/13", () => {
    const b = fixture();
    b.items = [b.items[0]!];
    const rect = findRectSpace(b.items, b.items[0]!);
    expect(rect).not.toBeNull();
    expect(separated(rect!, b.items[0]!)).toBe(true);
    b.items.push(textItem());
    b.items[0]!.crop = { x: 0.5, y: 0, w: 0.5, h: 1 };
    const result = arrangePlacements(b.items, b.assets, { a: 2 });
    expect(result[0]!.crop).toEqual(b.items[0]!.crop);
    expect(result[1]!.text).toEqual(b.items[1]!.text);
    expect(result[1]!.w).toBe(480);
    expect(result[1]!.h).toBe(textLayout(result[1]!.text!, 480).height);
    const items = Array.from({ length: 12 }, (_, i) => ({
      ...textItem(),
      id: String(i),
      text: { ...textDefaults(), content: "一行中文" },
      w: 300,
      h: 100,
    }));
    expect(arrangePlacements(items, [])).toHaveLength(12);
    expect(() => arrangePlacements([...items, textItem()], [])).toThrow(/12/);
    const tooTall = {
      ...textItem(),
      text: { ...textDefaults(), content: "字\n".repeat(50) },
      w: 400,
    };
    expect(() => arrangePlacements([tooTall], [])).toThrow(/无法完整/);
  });
});
