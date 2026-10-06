import { ref, computed, watch } from "vue";
import { type Board, type Placement, clone } from "../types";
import { applyText } from "../lib/text";
export function useTextDraft(
  current: () => Placement | undefined,
  board: () => Board,
  change: (b: Board) => void,
) {
  const draft = ref<Placement>(),
    base = ref<Placement>(),
    error = ref(""),
    composing = ref(false);
  const dirty = computed(
    () => JSON.stringify(draft.value) !== JSON.stringify(base.value),
  );
  function reset() {
    const p = current();
    draft.value = p?.kind === "text" ? clone(p) : undefined;
    base.value = clone(draft.value);
    error.value = "";
  }
  watch(
    current,
    (p) => {
      if (p?.id !== draft.value?.id || !dirty.value) reset();
    },
    { immediate: true },
  );
  function save() {
    if (
      composing.value ||
      !draft.value?.text ||
      current()?.id !== draft.value.id
    )
      return false;
    try {
      const b = applyText(
        board(),
        draft.value.id,
        draft.value.text,
        draft.value.w,
      );
      change(b);
      draft.value = clone(b.items.find((p) => p.id === draft.value!.id));
      base.value = clone(draft.value);
      error.value = "";
      return true;
    } catch (e) {
      error.value = (e as Error).message;
      return false;
    }
  }
  return { draft, dirty, error, composing, reset, save };
}
