/**
 * 図鑑プロフィールの表示ルール（純粋・JSON非依存・テスト可能）。
 *
 * JSON を読み込む参照層は speciesProfiles.ts。こちらは分類ごとの
 * 「何を・どの順で・どんな見出しで出すか」だけを持つ。
 * 実在生物と空想生物で表示項目を分け、科学情報と創作情報を混同させない。
 */
import type { DexClass } from "./characterCatalog.generated";
import type { SpeciesProfile } from "../types/speciesProfile";

export type ProfileField = { key: keyof SpeciesProfile; label: string };

const COMMON_FIELDS: ProfileField[] = [
  { key: "scientificName", label: "学名" },
  { key: "taxonomy", label: "分類" }
];

const EXTANT_FIELDS: ProfileField[] = [
  { key: "distribution", label: "分布" },
  { key: "habitat", label: "生息環境" },
  { key: "size", label: "大きさ" },
  { key: "diet", label: "食性" },
  { key: "diagnosticFeatures", label: "識別特徴" },
  { key: "behavior", label: "行動" },
  { key: "ecosystemRole", label: "生態系での役割" },
  { key: "conservationStatus", label: "保全状況" },
  { key: "trivia", label: "豆知識" }
];

const RARE_FIELDS: ProfileField[] = [
  { key: "variantType", label: "希少形態" },
  { key: "variantMechanism", label: "発生のしくみ" },
  { key: "verifiedAppearance", label: "外見上の特徴" }
];

const EXTINCT_FIELDS: ProfileField[] = [
  { key: "geologicalPeriod", label: "生息年代" },
  { key: "fossilLocations", label: "化石発見地域" },
  { key: "estimatedSize", label: "推定サイズ" },
  { key: "diet", label: "推定食性" },
  { key: "wellSupportedFeatures", label: "確実性の高い復元" },
  { key: "uncertainFeatures", label: "議論がある復元" },
  { key: "extinctionHypotheses", label: "絶滅の主な説" }
];

const FICTIONAL_FIELDS: ProfileField[] = [
  { key: "fictionalOrigin", label: "由来" },
  { key: "mythologyOrWorldLore", label: "神話・伝承" },
  { key: "fictionalEcology", label: "WORLDAWN内の設定" }
];

/**
 * その分類で表示するフィールドの並び。
 * SECRET には学名・保全状況などの科学フィールドを含めない（創作を科学として出さない）。
 * LEGEND には保全状況を含めない（すでに絶滅しているため）。
 */
export const profileFieldsFor = (dexClass: DexClass): ProfileField[] => {
  switch (dexClass) {
    case "RARE":
      return [...COMMON_FIELDS, ...RARE_FIELDS, ...EXTANT_FIELDS];
    case "LEGEND":
      return [...COMMON_FIELDS, ...EXTINCT_FIELDS];
    case "SECRET":
      return FICTIONAL_FIELDS;
    case "NORMAL":
    default:
      return [...COMMON_FIELDS, ...EXTANT_FIELDS];
  }
};

/** 図鑑分類の表示名。 */
export const dexClassLabel = (dexClass: DexClass): string => {
  switch (dexClass) {
    case "RARE":
      return "希少形態";
    case "LEGEND":
      return "絶滅生物";
    case "SECRET":
      return "空想の生きもの";
    case "NORMAL":
    default:
      return "現生の生きもの";
  }
};

/** 図鑑分類の補足。実在情報と創作情報の区別をここで明示する。 */
export const dexClassNote = (dexClass: DexClass): string => {
  switch (dexClass) {
    case "RARE":
      return "実在が確認されている希少な形態です。";
    case "LEGEND":
      return "すでに絶滅した実在の生きものです。姿は化石証拠にもとづく復元です。";
    case "SECRET":
      return "神話・伝承・空想上の存在です。実在を示す科学的証拠はありません。";
    case "NORMAL":
    default:
      return "現在も生きている生きものです。";
  }
};
