import { it, expect, vi } from "vitest";
import "fake-indexeddb/auto";
import {
  polygonCrop,
  cropPoints,
  resizeCrop,
  translateCrop,
} from "../src/lib/polygon";
import {
  copyObjects,
  pasteObjects,
  removeObjects,
  placeAt,
  clientToBoard,
} from "../src/lib/objects";
import { applyCrop, validateCrop, replaceImage } from "../src/lib/crop";
import { validateBoard } from "../src/lib/data";
import { applyText, textDefaults, textLayout } from "../src/lib/text";
import { saveBoard, loadBoard, loadOriginal } from "../src/lib/storage";
import { History } from "../src/lib/history";
import { clone, type Board } from "../src/types";
const fixture = (): Board => ({
  version: 2,
  title: "四点测试",
  assets: [
    {
      id: "a",
      kind: "image",
      title: "标记",
      source: "https://example.com",
      note: "完整笔记",
      data: "data:image/png;base64,YQ==",
    },
  ],
  items: [
    { id: "p", assetId: "a", x: 40, y: 130, w: 360, h: 300 },
    { id: "q", assetId: "a", x: 420, y: 300, w: 360, h: 300 },
  ],
});
const points = [
  { x: 0.1, y: 0.1 },
  { x: 0.9, y: 0.2 },
  { x: 0.7, y: 0.9 },
  { x: 0.2, y: 0.7 },
];
it("accepts simple convex/concave quadrilaterals and rejects crossings, coincident points, small or outside regions", () => {
  const crop = polygonCrop(points);
  expect(crop).toMatchObject({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  validateCrop(crop);
  expect(
    polygonCrop([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.2, y: 0.2 },
      { x: 0, y: 1 },
    ]).points,
  ).toHaveLength(4);
  for (const bad of [
    [points[0]!, points[2]!, points[1]!, points[3]!],
    [points[0]!, points[0]!, points[2]!, points[3]!],
    points.map((p) => ({ x: p.x + 1, y: p.y })),
    points.map((p) => ({ x: p.x * 0.001, y: p.y * 0.001 })),
  ])
    expect(() => polygonCrop(bad)).toThrow();
  expect(() => validateCrop({ ...crop, w: 0.7 })).toThrow();
});
it("keeps fixed shape/pixel ratio under corner resizing and translates every vertex together within original bounds", () => {
  const crop = { x: 0.2, y: 0.2, w: 0.6, h: 0.4 };
  for (const i of [0, 1, 2, 3]) {
    const resized = resizeCrop(
      crop,
      i,
      { x: i % 2 ? 2 : -1, y: i < 2 ? -1 : 2 },
      2,
    );
    expect(resized.w / resized.h).toBeCloseTo(1.5);
    validateCrop(resized);
  }
  const quad = polygonCrop(points),
    moved = translateCrop(quad, 2, -2);
  validateCrop(moved);
  expect(moved.x + moved.w).toBeCloseTo(1);
  expect(moved.y).toBeCloseTo(0);
  for (let i = 1; i < 4; i++)
    expect(moved.points![i]!.x - moved.points![0]!.x).toBeCloseTo(
      points[i]!.x - points[0]!.x,
    );
  expect(cropPoints(crop)[2]).toEqual({ x: 0.8, y: 0.6000000000000001 });
});
it("requires v3 only for polygon data and preserves it through text edits, restore, replacement and history", () => {
  const before = fixture(),
    next = applyCrop(before, "p", polygonCrop(points));
  expect(next.version).toBe(3);
  expect(next.items[1]).toEqual(before.items[1]);
  expect(validateBoard(next)).toEqual(next);
  expect(() => validateBoard({ ...next, version: 2 })).toThrow(/版本3/);
  expect(() => validateBoard({ ...next, version: 4 })).toThrow();
  expect(validateBoard(before)).toEqual(before);
  const text = { ...textDefaults(), content: "新文字" };
  next.items.push({
    id: "t",
    kind: "text",
    text,
    x: 900,
    y: 200,
    w: 400,
    h: textLayout(text, 400).height,
  });
  expect(applyText(next, "t", text, 400).version).toBe(3);
  expect(applyCrop(next, "p").version).toBe(3);
  expect(
    replaceImage(next, "a", "data:image/png;base64,Yg==").items[0]!.crop,
  ).toBeUndefined();
  const history = new History<Board>();
  history.push(before);
  expect(history.undo(next)).toEqual(before);
  expect(history.redo(before)).toEqual(next);
});
it("pastes immutable single/multi snapshots in nearby bounds, shares unchanged assets and keeps original layout/layers", () => {
  const original = applyCrop(fixture(), "p", polygonCrop(points)),
    snapshot = copyObjects(original, ["p", "q"]);
  const untouched = clone(snapshot);
  original.items[0]!.x = 100;
  const result = pasteObjects(original, snapshot);
  expect(result.board.assets).toEqual(original.assets);
  expect(result.board.items.slice(0, 2)).toEqual(original.items);
  expect(result.ids).toHaveLength(2);
  expect(new Set(result.board.items.map((p) => p.id)).size).toBe(4);
  const [p, q] = result.board.items.slice(2);
  expect(q!.x - p!.x).toBeCloseTo(380);
  expect(q!.y - p!.y).toBe(170);
  expect(p!.crop).toEqual(snapshot.items[0]!.crop);
  expect(snapshot).toEqual(untouched);
  const more = pasteObjects(result.board, snapshot, 1);
  expect(more.board.items[4]!.x).not.toBe(p!.x);
  const removed = removeObjects(result.board, result.ids);
  expect(removed).toEqual(original);
});
it("allows overlap on a fully covered board and refuses over-capacity batches without changing any original", () => {
  const b = fixture();
  b.items[0] = { ...b.items[0]!, x: 0, y: 100, w: 1600, h: 875 };
  const clip = copyObjects(b, ["p"]);
  expect(pasteObjects(b, clip).board.items).toHaveLength(3);
  expect(placeAt({ w: 480, h: 100 }, 1600, 1000)).toEqual({
    w: 480,
    h: 100,
    x: 1120,
    y: 875,
  });
  b.items = Array.from({ length: 149 }, (_, i) => ({
    ...b.items[1]!,
    id: String(i),
  }));
  const before = clone(b);
  expect(() => pasteObjects(b, copyObjects(fixture(), ["p", "q"]))).toThrow(
    /150/,
  );
  expect(b).toEqual(before);
});
it("maps actual pointer position using board bounds at different scaling/scroll and cancels outside drops", () => {
  expect(
    clientToBoard(300, 500, { left: 100, top: 250, width: 800, height: 500 }),
  ).toEqual({ x: 400, y: 500 });
  expect(
    clientToBoard(200, 250, { left: 100, top: 125, width: 400, height: 250 }),
  ).toEqual({ x: 400, y: 500 });
  expect(
    clientToBoard(99, 250, { left: 100, top: 125, width: 400, height: 250 }),
  ).toBeNull();
});
it("retains the exact v2 snapshot atomically before v3 save and does not overwrite it on later v3 changes", async () => {
  const before = fixture();
  await saveBoard(before);
  const next = applyCrop(before, "p", polygonCrop(points));
  await saveBoard(next);
  expect(await loadOriginal()).toEqual(before);
  expect(await loadBoard()).toEqual(next);
  next.title = "后续修改";
  await saveBoard(next);
  expect(await loadOriginal()).toEqual(before);
});
it("aborts current and pre-v3 snapshot together when the first v3 snapshot cannot be written", async () => {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("shiye-workbench", 1);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("draft", "readwrite");
    tx.objectStore("draft").clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  const before = fixture();
  await saveBoard(before);
  const put = IDBObjectStore.prototype.put;
  const spy = vi
    .spyOn(IDBObjectStore.prototype, "put")
    .mockImplementation(function (this: IDBObjectStore, value, key) {
      if (key === "pre-version-three")
        throw new DOMException("Full", "QuotaExceededError");
      return put.call(this, value, key);
    });
  try {
    await expect(
      saveBoard(applyCrop(before, "p", polygonCrop(points))),
    ).rejects.toThrow();
  } finally {
    spy.mockRestore();
  }
  expect(await loadBoard()).toEqual(before);
  expect(await loadOriginal()).toBeNull();
  await saveBoard(applyCrop(before, "p", polygonCrop(points)));
  expect(await loadOriginal()).toEqual(before);
});
it("recovers copied source bytes after a shared replacement without changing the current source or the snapshot", () => {
  const b = applyCrop(fixture(), "p", polygonCrop(points)),
    snapshot = copyObjects(b, ["p"]);
  const changed = replaceImage(b, "a", "data:image/png;base64,Yg=="),
    result = pasteObjects(changed, snapshot);
  expect(result.board.assets[0]).toEqual(changed.assets[0]);
  expect(result.board.items.slice(0, 2)).toEqual(changed.items);
  expect(result.board.items[2]!.assetId).not.toBe("a");
  expect(result.board.assets[1]!.data).toBe(snapshot.assets[0]!.data);
  expect(result.board.items[2]!.crop).toEqual(snapshot.items[0]!.crop);
  expect(pasteObjects(result.board, snapshot, 1).board.assets).toHaveLength(2);
  const edge = fixture();
  edge.items[0]!.x = 1360;
  edge.items[0]!.w = 240;
  const pasted = pasteObjects(edge, copyObjects(edge, ["p"]));
  expect(pasted.board.items[2]!.x).toBeLessThan(1360);
  validateBoard(pasted.board);
});
