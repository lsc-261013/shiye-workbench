import { ref } from "vue";
import { clone, uid, type Board } from "../types";
import {
  arrangePlacements,
  preferredSize,
  MAX_AUTO_ITEMS,
} from "../lib/layout";
import { placeAt } from "../lib/objects";
import { readAspectRatios } from "../lib/imageMetrics";
export function useLayoutActions(
  board: () => Board,
  change: (b: Board) => void,
  choose: (id: string, assetId: string) => void,
  notify: (message: string) => void,
  closeLibrary: () => void,
) {
  const working = ref(false),
    label = ref("");
  async function add(assetId: string, x?: number, y?: number) {
    if (working.value) return;
    if (board().items.length >= 150) {
      notify("画板已有150个对象，本次未添加。");
      return;
    }
    const asset = board().assets.find((a) => a.id === assetId);
    if (!asset) return;
    label.value = "正在加入画板…";
    working.value = true;
    try {
      const ratios = await readAspectRatios([asset]);
      const b = clone(board());
      if (b.items.length >= 150) throw Error("画板已有150个对象，本次未添加。");
      const p = {
        id: uid(),
        assetId,
        ...placeAt(preferredSize(asset, ratios[assetId]), x, y),
      };
      b.items.push(p);
      change(b);
      choose(p.id, assetId);
      closeLibrary();
      notify("已添加到画板，允许重叠，已有排版保持。可撤销。");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      working.value = false;
    }
  }
  async function arrange() {
    if (working.value) return;
    const b = clone(board());
    if (b.items.length > MAX_AUTO_ITEMS) {
      notify(
        `整理排版适合一页最多12个元素。当前${b.items.length}个，原布局保持。`,
      );
      return;
    }
    if (!b.items.length) return;
    label.value = "正在整理排版…";
    working.value = true;
    try {
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
      notify("已整理排版，点撤销可完整恢复。");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      working.value = false;
    }
  }
  return { working, label, add, arrange };
}
