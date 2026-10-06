export interface Asset {
  id: string;
  kind: "image" | "link";
  title: string;
  source: string;
  note: string;
  data: string;
}
export interface Placement {
  id: string;
  assetId?: string;
  kind?: "reference" | "text";
  text?: TextBlock;
  crop?: Crop;
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Board {
  version: 1 | 2;
  title: string;
  assets: Asset[];
  items: Placement[];
}
export interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface TextBlock {
  content: string;
  style: "heading" | "subheading" | "note";
  size: number;
  bold: boolean;
  align: "left" | "center" | "right";
  color: "#252723" | "#b34830" | "#555b50";
}
export const WIDTH = 1600,
  HEIGHT = 1000;
export const uid = () => crypto.randomUUID();
// Image strings are immutable; keep them shared across undo snapshots.
export function clone<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clone) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, clone(child)]),
    ) as T;
  return value;
}
export const safeUrl = (value: string) => {
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
};
