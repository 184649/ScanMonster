import type { ElementType } from "../types/monster";

export type ElementMeta = {
  key: ElementType;
  label: string;
  color: string;
  softColor: string;
};

export const ELEMENTS: ElementMeta[] = [
  { key: "normal", label: "ノーマル", color: "#94A3B8", softColor: "#F1F5F9" },
  { key: "nature", label: "ネイチャー", color: "#22C55E", softColor: "#DCFCE7" },
  { key: "aqua", label: "アクア", color: "#38BDF8", softColor: "#E0F2FE" },
  { key: "flame", label: "フレイム", color: "#F97316", softColor: "#FFEDD5" },
  { key: "bolt", label: "ボルト", color: "#EAB308", softColor: "#FEF9C3" },
  { key: "ice", label: "アイス", color: "#06B6D4", softColor: "#CFFAFE" },
  { key: "earth", label: "アース", color: "#A16207", softColor: "#FEF3C7" },
  { key: "wind", label: "ウィンド", color: "#34D399", softColor: "#D1FAE5" },
  { key: "light", label: "ライト", color: "#F59E0B", softColor: "#FEF3C7" },
  { key: "shadow", label: "シャドウ", color: "#7C3AED", softColor: "#EDE9FE" },
  { key: "digital", label: "デジタル", color: "#06B6D4", softColor: "#E0F2FE" },
  { key: "special", label: "スペシャル", color: "#F472B6", softColor: "#FCE7F3" }
];

export const getElementMeta = (element: ElementType): ElementMeta => {
  return ELEMENTS.find((item) => item.key === element) ?? ELEMENTS[0]!;
};

export const TIME_SLOT_LABELS = {
  morning: "朝",
  day: "昼",
  evening: "夕方",
  night: "夜"
} as const;

export const SEASON_LABELS = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬"
} as const;
