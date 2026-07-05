import type { IndividualVariantCategory, IndividualVariantKey, Season, TimeSlot } from "../types/monster";

export type IndividualVariant = {
  key: IndividualVariantKey;
  nameJa: string;
  category: IndividualVariantCategory;
  frameColor: string;
  softColor: string;
  imageDirection: string;
};

export const INDIVIDUAL_VARIANT_KEYS = [
  "asatsuyu",
  "youkou",
  "tasogare",
  "tsukikage",
  "harukaze",
  "natsuhikari",
  "momiji",
  "yukitomoshi",
  "common",
  "uncommon",
  "rare",
  "legend"
] as const satisfies readonly IndividualVariantKey[];

export const individualVariants: IndividualVariant[] = [
  {
    key: "asatsuyu",
    nameJa: "朝露型",
    category: "time",
    frameColor: "#EC4899",
    softColor: "#FCE7F3",
    imageDirection: "夜明け直後のやわらかい光、朝露、水滴、淡いピンクまたは淡い水色、清潔感"
  },
  {
    key: "youkou",
    nameJa: "陽光型",
    category: "time",
    frameColor: "#F97316",
    softColor: "#FFEDD5",
    imageDirection: "明るい太陽光、黄色、橙色、前向きで元気、日中の発見者らしい軽快さ"
  },
  {
    key: "tasogare",
    nameJa: "黄昏型",
    category: "time",
    frameColor: "#DC2626",
    softColor: "#FEE2E2",
    imageDirection: "夕焼け、橙、赤茶、落ち着き、少し大人びた雰囲気、日の終わりの温かさ"
  },
  {
    key: "tsukikage",
    nameJa: "月影型",
    category: "time",
    frameColor: "#7C3AED",
    softColor: "#EDE9FE",
    imageDirection: "夜、月光、紺、紫、銀、静かで神秘的、影の中で光る装飾"
  },
  {
    key: "harukaze",
    nameJa: "春風型",
    category: "season",
    frameColor: "#22C55E",
    softColor: "#DCFCE7",
    imageDirection: "春、若葉、花、淡い緑、やわらかい風、生命感、軽やかで優しい雰囲気"
  },
  {
    key: "natsuhikari",
    nameJa: "夏光型",
    category: "season",
    frameColor: "#0EA5E9",
    softColor: "#E0F2FE",
    imageDirection: "夏、青空、水、強い光、鮮やかな青やシアン、活発、エネルギッシュ"
  },
  {
    key: "momiji",
    nameJa: "紅葉型",
    category: "season",
    frameColor: "#EA580C",
    softColor: "#FFEDD5",
    imageDirection: "秋、紅葉、橙、赤、金、落ち葉、少し落ち着いた旅人感、温かみ"
  },
  {
    key: "yukitomoshi",
    nameJa: "雪灯型",
    category: "season",
    frameColor: "#38BDF8",
    softColor: "#F0F9FF",
    imageDirection: "冬、雪、氷、水色、白、銀、寒さの中の小さな灯り、透明感、静かな強さ"
  },
  {
    key: "common",
    nameJa: "コモン",
    category: "rarity",
    frameColor: "#64748B",
    softColor: "#F1F5F9",
    imageDirection: "ベース画像に近い自然な個体。装飾や光は控えめ、親しみやすい標準的な雰囲気"
  },
  {
    key: "uncommon",
    nameJa: "アンコモン",
    category: "rarity",
    frameColor: "#60A5FA",
    softColor: "#DBEAFE",
    imageDirection: "少しだけ装飾が強化され、差し色や光が増える。ベースより少し特別感がある"
  },
  {
    key: "rare",
    nameJa: "レア",
    category: "rarity",
    frameColor: "#A855F7",
    softColor: "#F3E8FF",
    imageDirection: "紫、青、銀などの発光、少し豪華な装飾、希少感。ただし派手すぎずキャラの可愛さを残す"
  },
  {
    key: "legend",
    nameJa: "レジェンド",
    category: "rarity",
    frameColor: "#F59E0B",
    softColor: "#FEF3C7",
    imageDirection: "金色、強い光、特別な装飾、堂々としたポーズ、最高レアらしい存在感"
  }
];

export const individualVariantByKey = Object.fromEntries(
  individualVariants.map((variant) => [variant.key, variant])
) as Record<IndividualVariantKey, IndividualVariant>;

export const getTimeVariantKey = (timeSlot: TimeSlot): IndividualVariantKey => {
  const map: Record<TimeSlot, IndividualVariantKey> = {
    morning: "asatsuyu",
    day: "youkou",
    evening: "tasogare",
    night: "tsukikage"
  };

  return map[timeSlot];
};

export const getSeasonVariantKey = (season: Season): IndividualVariantKey => {
  const map: Record<Season, IndividualVariantKey> = {
    spring: "harukaze",
    summer: "natsuhikari",
    autumn: "momiji",
    winter: "yukitomoshi"
  };

  return map[season];
};

export const getIndividualVariant = (key?: IndividualVariantKey): IndividualVariant =>
  individualVariantByKey[key ?? "common"];
