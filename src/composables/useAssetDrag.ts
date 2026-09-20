import { ref } from "vue";
import { WIDTH, HEIGHT, type Asset } from "../types";

export function useAssetDrag(
  isMobile: () => boolean,
  add: (id: string, x: number, y: number) => void,
  open: (asset: Asset) => void,
) {
  const ghost = ref<{ title: string; x: number; y: number } | null>(null);
  let drag: { asset: Asset; x: number; y: number } | null = null;
  let suppressClick = false;
  function start(event: PointerEvent, asset: Asset) {
    suppressClick = false;
    if (isMobile() || event.button !== 0) return;
    drag = { asset, x: event.clientX, y: event.clientY };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent) {
    if (!drag || Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6)
      return;
    event.preventDefault();
    ghost.value = {
      title: drag.asset.title,
      x: event.clientX,
      y: event.clientY,
    };
  }
  function end(event: PointerEvent, cancel = false) {
    if (drag && ghost.value && !cancel) {
      const rect = document.querySelector(".board")?.getBoundingClientRect();
      if (
        rect &&
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      )
        add(
          drag.asset.id,
          ((event.clientX - rect.left) / rect.width) * WIDTH,
          ((event.clientY - rect.top) / rect.height) * HEIGHT,
        );
      suppressClick = true;
    }
    drag = null;
    ghost.value = null;
  }
  function click(asset: Asset) {
    if (!suppressClick) open(asset);
    suppressClick = false;
  }
  return { ghost, start, move, end, click };
}
