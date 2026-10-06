import { computed, ref, watch } from "vue";
import type { Asset, Board } from "../types";
import { applyNotes, notesDraft, type NotesDraft } from "../lib/notes";

export function useNotesDraft(
  current: () => Asset | undefined,
  board: () => Board,
  change: (b: Board) => void,
) {
  const draft = ref<NotesDraft>(),
    base = ref<NotesDraft>();
  const error = ref(""),
    composing = ref(false);
  const dirty = computed(
    () => JSON.stringify(draft.value) !== JSON.stringify(base.value),
  );
  function reset() {
    const a = current();
    draft.value = a ? notesDraft(a) : undefined;
    base.value = a ? notesDraft(a) : undefined;
    error.value = "";
  }
  watch(
    current,
    (a) => {
      if (a?.id !== draft.value?.id || !dirty.value) reset();
    },
    { immediate: true },
  );
  function save() {
    if (composing.value) return false;
    if (!draft.value || draft.value.id !== current()?.id) return false;
    try {
      const next = applyNotes(board(), draft.value);
      const committed = notesDraft(
        next.assets.find((a) => a.id === draft.value!.id)!,
      );
      change(next);
      draft.value = { ...committed };
      base.value = { ...committed };
      error.value = "";
      return true;
    } catch (e) {
      error.value = (e as Error).message;
      return false;
    }
  }
  return { draft, dirty, error, composing, reset, save };
}
