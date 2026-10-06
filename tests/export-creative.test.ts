import { it, expect, vi, afterEach } from "vitest";
import { renderPng } from "../src/lib/export";
import { blank } from "../src/lib/data";
import { textDefaults, textLayout } from "../src/lib/text";
vi.mock("../src/lib/data", async (original) => ({
  ...(await original<typeof import("../src/lib/data")>()),
  imageLoaded: async () => ({
    naturalWidth: 800,
    naturalHeight: 400,
    width: 800,
    height: 400,
  }),
}));
afterEach(() => vi.unstubAllGlobals());
it("PNG draws cropped source pixels and complete safe text lines in layer order at real board coordinates", async () => {
  const calls: unknown[][] = [];
  const c = {
    font: "",
    fillStyle: "",
    textAlign: "left",
    measureText: (s: string) => ({ width: s.length * 12 }),
    save: () => calls.push(["save"]),
    restore: () => calls.push(["restore"]),
    beginPath: () => {},
    rect: () => {},
    clip: () => {},
    fillRect: (...a: unknown[]) => calls.push(["rect", ...a]),
    fillText: (...a: unknown[]) => calls.push(["text", ...a]),
    drawImage: (...a: unknown[]) => calls.push(["image", ...a]),
  };
  vi.stubGlobal("document", {
    fonts: { ready: Promise.resolve() },
    createElement: () => ({
      getContext: () => c,
      toBlob: (cb: (b: Blob) => void) =>
        cb(new Blob(["PNG"], { type: "image/png" })),
    }),
  });
  const b = blank();
  b.assets = [
    {
      id: "a",
      kind: "image",
      title: "图",
      source: "",
      note: "",
      data: "data:image/png;base64,YQ==",
    },
  ];
  b.items = [
    {
      id: "p",
      assetId: "a",
      crop: { x: 0.5, y: 0, w: 0.5, h: 1 },
      x: 40,
      y: 130,
      w: 416,
      h: 478,
    },
  ];
  const text = {
    ...textDefaults(),
    content: "中文第一行\n第二段 <script>",
    align: "center" as const,
  };
  const h = textLayout(text, 480).height;
  b.items.push({ id: "t", kind: "text", text, x: 500, y: 600, w: 480, h });
  await renderPng(b);
  const draw = calls.find((x) => x[0] === "image")!;
  expect(draw.slice(2)).toEqual([400, 0, 400, 400, 48, 138, 400, 400]);
  expect(calls).toContainEqual(["text", "中文第一行", 740, 640]);
  expect(calls).toContainEqual(["text", "第二段 <script>", 740, 674.8]);
  expect(calls.findIndex((x) => x[0] === "image")).toBeLessThan(
    calls.findIndex((x) => x[1] === "中文第一行"),
  );
  expect(calls.some((x) => String(x[1]).includes("选中"))).toBe(false);
});
