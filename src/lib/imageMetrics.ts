import { imageLoaded } from "./data";
import type { Asset } from "../types";
import type { AspectRatios } from "./layout";

export async function readAspectRatios(assets: Asset[]): Promise<AspectRatios> {
  return Object.fromEntries(
    await Promise.all(
      assets.map(async (a) => {
        if (!a.data) return [a.id, 1.4];
        const image = await imageLoaded(a.data);
        return [a.id, image.naturalWidth / image.naturalHeight];
      }),
    ),
  );
}
