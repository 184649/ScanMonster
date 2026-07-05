import type { ExpeditionArea } from "../types/expedition";

export const EXPEDITION_AREAS: ExpeditionArea[] = [
  {
    id: "neighborhood-grass",
    name: "近所の草むら探索",
    description: "短時間で戻れる基本の探索。ネイチャー属性の個体が得意です。",
    requiredLevel: 1,
    durationMinutes: 1,
    recommendedElements: ["nature", "wind"],
    rewardPreview: ["EXP", "研究ポイント", "未発見ヒント"]
  },
  {
    id: "shirakawa-path",
    name: "白河の小道探索",
    description: "地域メダルと白河系の発見ヒントを探す探索です。",
    requiredLevel: 1,
    durationMinutes: 3,
    recommendedElements: ["nature", "earth", "light"],
    rewardPreview: ["EXP", "白河メダル", "地域ヒント"],
    unlockCondition: "白河または現在地域の個体を1体以上所持"
  },
  {
    id: "riverbank",
    name: "川辺探索",
    description: "水辺に残ったコードの揺らぎを追います。アクア属性が有利です。",
    requiredLevel: 2,
    durationMinutes: 4,
    recommendedElements: ["aqua", "ice", "wind"],
    rewardPreview: ["EXP", "しずく素材", "水辺ヒント"]
  },
  {
    id: "night-forest",
    name: "夜の森探索",
    description: "夜型やレア変異の手がかりを探す、少し難しい探索です。",
    requiredLevel: 3,
    durationMinutes: 5,
    recommendedElements: ["shadow", "nature", "light"],
    rewardPreview: ["EXP", "レア変異の手がかり", "夜型ヒント"]
  },
  {
    id: "old-arcade",
    name: "古い商店街探索",
    description: "古いお店の周りに残った気配を集める探索です。落ち着いた性格の個体が得意です。",
    requiredLevel: 4,
    durationMinutes: 6,
    recommendedElements: ["normal", "earth", "shadow"],
    rewardPreview: ["EXP", "研究ポイント", "商店街メダル"]
  },
  {
    id: "underground",
    name: "地中探索",
    description: "土の中を掘り進む探索です。モグラ種のように地面が得意な個体が活躍します。",
    requiredLevel: 4,
    durationMinutes: 6,
    recommendedElements: ["earth", "normal"],
    rewardPreview: ["EXP", "発掘素材", "地中ヒント"]
  },
  {
    id: "seaside",
    name: "海辺探索",
    description: "波打ち際を歩く探索です。クジラ種・イルカ種など水辺が得意な個体が活躍します。",
    requiredLevel: 5,
    durationMinutes: 8,
    recommendedElements: ["aqua", "ice", "wind"],
    rewardPreview: ["EXP", "海辺メダル", "海辺ヒント", "レア変異の手がかり"]
  }
];

export const getExpeditionAreaById = (areaId: string): ExpeditionArea | undefined => {
  return EXPEDITION_AREAS.find((area) => area.id === areaId);
};
