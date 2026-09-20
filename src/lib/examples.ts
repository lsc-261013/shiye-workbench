import { type Board, type Asset, uid } from "../types";
import { imageLoaded } from "./data";
const sources: Record<string, string> = {
  architecture: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2",
  interior: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0",
  coast: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1",
  chair: "https://images.unsplash.com/photo-1490312278390-ab64016e0aa9",
  forest: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e",
};
async function embedded(name: string) {
  const isSvg = ["type", "palette", "web"].includes(name);
  const r = await fetch(`/assets/${name}.${isSvg ? "svg" : "jpg"}`);
  if (!r.ok) throw Error("示例素材加载失败，请重试");
  const blob = await r.blob();
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  if (!isSvg) return data;
  const im = await imageLoaded(data);
  const canvas = document.createElement("canvas");
  canvas.width = im.width;
  canvas.height = im.height;
  canvas.getContext("2d")!.drawImage(im, 0, 0);
  return canvas.toDataURL("image/png");
}
export async function example(which: "product" | "life"): Promise<Board> {
  const specs =
    which === "product"
      ? [
          [
            "web",
            "STILL / NOTES · 首屏研究",
            "自制独立产品网站概念稿。借鉴左文右图、单一主入口与大面积留白；不是线上客户项目。",
            40,
            135,
            720,
            475,
          ],
          [
            "type",
            "字与留白",
            "自制版式样张。用一个大字建立视觉焦点，朱红圆形只作少量强调。",
            790,
            135,
            290,
            455,
          ],
          [
            "architecture",
            "建筑的秩序",
            "观察重复线条和对称关系，将这种秩序用于网站内容分区，避免所有模块同等突出。",
            1110,
            135,
            450,
            350,
          ],
          [
            "palette",
            "克制的色彩",
            "自制色彩样张。暖白作为底色，深海蓝、苔绿用于图片呼应，朱红用于主动作。",
            40,
            650,
            720,
            260,
          ],
          [
            "chair",
            "给内容呼吸空间",
            "观察花枝与背景之间的留白，应用于产品介绍区；细节丰富，背景保持安静。",
            790,
            625,
            480,
            285,
          ],
        ]
      : [
          [
            "interior",
            "光落在日常里",
            "暖色空间和侧面光，让物体有安静的层次。可以借鉴光影与天然材质的搭配。",
            40,
            135,
            475,
            570,
          ],
          [
            "type",
            "在间隙中，看见",
            "自制排版样张。文字与圆形错开，保留足够的空白，不让说明压过画面。",
            545,
            135,
            330,
            450,
          ],
          [
            "coast",
            "缓慢的远方",
            "前景木船形成引导线，冷色湖水与暖色木材相互平衡。适合生活方式专题的开场。",
            905,
            135,
            655,
            435,
          ],
          [
            "forest",
            "深浅之间",
            "借鉴森林的纵向节奏和不同层次的绿色，给较密的拼贴一个安静的收尾。",
            40,
            735,
            475,
            220,
          ],
          [
            "palette",
            "把颜色留住",
            "自制配色样张。少量土红与大面积中性色相配，让摄影成为主角。",
            545,
            625,
            510,
            275,
          ],
          [
            "chair",
            "一枝春天",
            "借鉴小尺度物件、柔光和负空间。在细节区域使用，不抢走主体画面的注意力。",
            1085,
            605,
            475,
            315,
          ],
        ];
  const board: Board = {
    version: 1,
    title:
      which === "product" ? "留白之间 · 独立产品网站" : "光与日常 · 生活方式",
    assets: [],
    items: [],
  };
  for (const row of specs) {
    const [name, title, note, x, y, w, h] = row as [
      string,
      string,
      string,
      number,
      number,
      number,
      number,
    ];
    const a: Asset = {
      id: uid(),
      kind: "image",
      title,
      note,
      source: sources[name] || "",
      data: await embedded(name),
    };
    board.assets.push(a);
    board.items.push({ id: uid(), assetId: a.id, x, y, w, h });
  }
  if (which === "product")
    board.assets.push({
      id: uid(),
      kind: "link",
      title: "Vue · 官方文档信息层级",
      source: "https://vuejs.org/",
      note: "参考文档入口、清晰标题与可读正文的关系。链接由用户主动打开，不抓取网页。",
      data: "",
    });
  return board;
}
