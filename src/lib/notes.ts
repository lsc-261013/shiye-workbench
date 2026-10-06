import { clone, safeUrl, type Asset, type Board } from "../types";
export type NotesDraft = Pick<Asset, "id" | "title" | "source" | "note">;
export function notesDraft(a: Asset): NotesDraft {
  return { id: a.id, title: a.title, source: a.source, note: a.note };
}
export function applyNotes(board: Board, draft: NotesDraft): Board {
  const next = clone(board),
    asset = next.assets.find((a) => a.id === draft.id);
  if (!asset) throw Error("这份参考已不在画板中，文字未提交。");
  const title = draft.title.trim();
  if (!title || title.length > 120)
    throw Error("请填写素材名称（最多120字）。");
  if (draft.source.length > 2048 || (draft.source && !safeUrl(draft.source)))
    throw Error("来源请填写完整的 http:// 或 https:// 网址。");
  if (asset.kind === "link" && !draft.source)
    throw Error("链接参考需要来源网址。");
  if (draft.note.length > 5000) throw Error("笔记最多5000字，文字尚未提交。");
  Object.assign(asset, { title, source: draft.source, note: draft.note });
  return next;
}
