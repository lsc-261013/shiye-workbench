import { describe, it, expect } from "vitest";
import {
  arrangePlacements,
  findFreeSpace,
  separated,
  LAYOUT_BOUNDS,
} from "../src/lib/layout";
import { applyNotes } from "../src/lib/notes";
import { History } from "../src/lib/history";
import { blank, validateBoard } from "../src/lib/data";
import { clone, type Asset, type Board } from "../src/types";

const asset = (id: string, picture = true): Asset => ({
  id,
  kind: picture ? "image" : "link",
  title: id,
  source: "https://example.com/参考",
  note: "完整中文\n多行笔记",
  data: picture ? "data:image/png;base64,YQ==" : "",
});
function board(count: number): Board {
  const b = blank();
  for (let i = 0; i < count; i++) {
    const a = asset("a" + i, i % 3 !== 2);
    b.assets.push(a);
    b.items.push({
      id: "p" + i,
      assetId: a.id,
      x: 50 + i * 10,
      y: 150,
      w: 380,
      h: 300,
    });
  }
  return b;
}
describe("bounded arrangement", () => {
  it("keeps mixed references, ids, order and source data intact inside readable bounds", () => {
    const b = board(12),
      original = clone(b),
      ratios = Object.fromEntries(
        b.assets.map((a, i) => [a.id, i % 2 ? 0.6 : 1.9]),
      );
    const result = arrangePlacements(b.items, b.assets, ratios);
    expect(b).toEqual(original);
    expect(result.map((p) => [p.id, p.assetId])).toEqual(
      b.items.map((p) => [p.id, p.assetId]),
    );
    for (const [i, p] of result.entries()) {
      expect(p.x).toBeGreaterThanOrEqual(LAYOUT_BOUNDS.left);
      expect(p.y).toBeGreaterThanOrEqual(LAYOUT_BOUNDS.top);
      expect(p.x + p.w).toBeLessThanOrEqual(LAYOUT_BOUNDS.right);
      expect(p.y + p.h).toBeLessThanOrEqual(LAYOUT_BOUNDS.bottom);
      expect(p.w).toBeGreaterThanOrEqual(240);
      expect(p.h).toBeGreaterThanOrEqual(260);
      for (const other of result.slice(i + 1))
        expect(separated(p, other)).toBe(true);
    }
    expect(arrangePlacements(b.items, b.assets, ratios)).toEqual(result);
    expect(validateBoard({ ...b, items: result }).assets).toEqual(b.assets);
  });
  it("handles empty and single portrait/link boards without filling the whole sheet", () => {
    expect(arrangePlacements([], [])).toEqual([]);
    for (const picture of [true, false]) {
      const b = board(1);
      b.assets[0] = asset("a0", picture);
      const p = arrangePlacements(b.items, b.assets, { a0: 0.6 })[0]!;
      expect(p.w).toBeLessThan(500);
      expect(p.h).toBeLessThanOrEqual(500);
      expect(p.y).toBe(130);
    }
  });
  it("rejects excessive or broken input without modifying the old layout", () => {
    const b = board(13),
      original = clone(b);
    expect(() => arrangePlacements(b.items, b.assets)).toThrow(/12/);
    expect(b).toEqual(original);
    expect(() => arrangePlacements(board(1).items, [])).toThrow(/缺失/);
  });
  it("adds in a free gap without touching carefully placed cards; reports no space", () => {
    const b = board(2);
    b.items[0]!.x = 40;
    b.items[1]!.x = 444;
    const original = clone(b.items),
      rect = findFreeSpace(b.items, asset("new"), 0.6);
    expect(rect).not.toBeNull();
    expect(b.items).toEqual(original);
    for (const p of b.items) expect(separated(rect!, p)).toBe(true);
    expect(
      findFreeSpace(
        [{ id: "full", assetId: "x", x: 0, y: 100, w: 1600, h: 875 }],
        asset("new"),
      ),
    ).toBeNull();
  });
  it("restores exact hand layout in one undo and consistent redo including shared references", () => {
    const before = board(5);
    before.items[4]!.assetId = before.items[0]!.assetId;
    const after = {
      ...clone(before),
      items: arrangePlacements(before.items, before.assets),
    };
    const history = new History<Board>();
    history.push(before);
    expect(history.undo(after)).toEqual(before);
    expect(history.redo(before)).toEqual(after);
    expect(JSON.parse(JSON.stringify(after))).toEqual(after);
  });
});
describe("notes ownership and content protection", () => {
  it("updates only the chosen fields and retains replacement data and every placement", () => {
    const b = board(2),
      original = clone(b);
    b.assets[0]!.data = "data:image/png;base64,Yg==";
    const next = applyNotes(b, {
      id: "a0",
      title: "新名称",
      source: "https://example.com/中文?x=1",
      note: "粘贴\n长笔记",
    });
    expect(next.items).toEqual(original.items);
    expect(next.assets[0]!.data).toBe(b.assets[0]!.data);
    expect(next.assets[1]).toEqual(b.assets[1]);
    expect(b.assets[0]!.title).toBe("a0");
  });
  it("rejects a stale target, invalid source or missing title without changing any asset", () => {
    const b = board(2),
      original = clone(b);
    const draft = {
      id: "missing",
      title: "标题",
      source: "https://example.com",
      note: "未提交",
    };
    expect(() => applyNotes(b, draft)).toThrow();
    expect(() =>
      applyNotes(b, { ...draft, id: "a0", source: "javascript:alert(1)" }),
    ).toThrow();
    expect(() => applyNotes(b, { ...draft, id: "a0", title: "  " })).toThrow();
    expect(b).toEqual(original);
  });
});
