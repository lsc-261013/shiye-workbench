import { ref } from "vue";
import { clone, uid, WIDTH, HEIGHT, type Board } from "../types";
import {
  arrangePlacements,
  findFreeSpace,
  preferredSize,
  MAX_AUTO_ITEMS,
} from "../lib/layout";
import { readAspectRatios } from "../lib/imageMetrics";

export function useLayoutActions(
  board: () => Board,
  change: (b: Board) => void,
  choose: (id: string, assetId: string) => void,
  notify: (message: string) => void,
  closeLibrary: () => void,
) {
  const working = ref(false),
    noSpace = ref("");
  async function add(assetId: string, x?: number, y?: number) {
    if (working.value) return;
    if (board().items.length >= 150) {
      notify("画板已有150个元素，先移除一个再加入。");
      return;
    }
    const a = board().assets.find((a) => a.id === assetId);
    if (!a) return;
    working.value = true;
    try {
      const ratios = await readAspectRatios([a]),
        size = preferredSize(a, ratios[a.id]);
      const rect =
        x !== undefined && y !== undefined
          ? {
              ...size,
              x: Math.max(0, Math.min(WIDTH - size.w, x)),
              y: Math.max(130, Math.min(HEIGHT - 25 - size.h, y)),
            }
          : findFreeSpace(board().items, a, ratios[a.id]);
      closeLibrary();
      if (!rect) {
        noSpace.value = assetId;
        choose("", assetId);
        return;
      }
      const b = clone(board()),
        p = { id: uid(), assetId, ...rect };
      b.items.push(p);
      change(b);
      choose(p.id, assetId);
      notify(
        x === undefined
          ? "已放入空位，原来的排版保持不变。"
          : "已放入指定位置，可撤销。",
      );
    } catch (e) {
      notify((e as Error).message);
    } finally {
      working.value = false;
    }
  }
  async function arrange(extraAssetId?: string) {
    if (working.value) return;
    const b = clone(board());
    const count = b.items.length + (extraAssetId ? 1 : 0);
    if (count > MAX_AUTO_ITEMS) {
      notify(
        `整理排版适合一页最多 ${MAX_AUTO_ITEMS} 个元素。当前 ${count} 个，原布局保持不变；请先移除部分画板元素。`,
      );
      return;
    }
    if (!b.items.length && !extraAssetId) {
      notify("先放入参考，再整理排版。");
      return;
    }
    working.value = true;
    try {
      const extra = extraAssetId
        ? { id: uid(), assetId: extraAssetId, x: 40, y: 130, w: 360, h: 300 }
        : undefined;
      if (extra) b.items.push(extra);
      const needed = new Set(b.items.map((p) => p.assetId));
      b.items = arrangePlacements(
        b.items,
        b.assets,
        await readAspectRatios(b.assets.filter((a) => needed.has(a.id))),
      );
      if (JSON.stringify(b) === JSON.stringify(board())) {
        notify("排版已经整齐，无需改动。");
        return;
      }
      change(b);
      if (extra) choose(extra.id, extra.assetId);
      noSpace.value = "";
      closeLibrary();
      notify("已整理排版，点撤销可完整恢复。");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      working.value = false;
    }
  }
  return { working, noSpace, add, arrange };
}
