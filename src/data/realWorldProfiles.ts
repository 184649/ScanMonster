/**
 * 実在モチーフ参考値（仕様 §22）。図鑑の読み物であり、能力値ではない。
 * Character.xlsx に列が追加されるまでの手動シード。speciesEn(小文字) で引く。
 * データが無いキャラは undefined（UIは非表示）。
 */
export type RealWorldProfile = {
  motifName?: string;
  sizeLabel?: "体高" | "全長" | "体長";
  sizeText?: string;
  weightText?: string;
  wingspanText?: string;
  lifespanLabel?: "平均寿命" | "寿命" | "成虫寿命";
  lifespanText?: string;
  profileNote?: string;
};

// 一般的な成体サイズ・寿命の目安（読み物用の概算）。順次拡充する。
const PROFILES: Record<string, RealWorldProfile> = {
  alpaca: { motifName: "アルパカ", sizeLabel: "体高", sizeText: "81〜99cm", weightText: "48〜84kg", lifespanLabel: "平均寿命", lifespanText: "15〜20年" },
  cheetah: { motifName: "チーター", sizeLabel: "体長", sizeText: "112〜135cm", weightText: "21〜72kg", lifespanLabel: "平均寿命", lifespanText: "10〜12年" },
  elephant: { motifName: "ゾウ", sizeLabel: "体高", sizeText: "2.5〜4m", weightText: "2.7〜6t", lifespanLabel: "平均寿命", lifespanText: "60〜70年" },
  giraffe: { motifName: "キリン", sizeLabel: "体高", sizeText: "4.3〜5.7m", weightText: "0.8〜1.9t", lifespanLabel: "平均寿命", lifespanText: "20〜25年" },
  fox: { motifName: "キツネ", sizeLabel: "体長", sizeText: "45〜90cm", weightText: "3〜11kg", lifespanLabel: "平均寿命", lifespanText: "2〜5年" },
  koala: { motifName: "コアラ", sizeLabel: "体長", sizeText: "60〜85cm", weightText: "4〜15kg", lifespanLabel: "平均寿命", lifespanText: "13〜18年" }
};

export const getRealWorldProfileForSpecies = (speciesEn?: string): RealWorldProfile | undefined => {
  if (!speciesEn) return undefined;
  return PROFILES[speciesEn.trim().toLowerCase()];
};
