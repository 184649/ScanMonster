/**
 * 図鑑プロフィール（科学情報）の型。
 *
 * 方針:
 *  - 未確認項目は null または省略（＝未調査）。**推測で埋めない。**
 *  - `reviewStatus === "confirmed"` かつ `sources.length > 0` の場合だけ図鑑へ公開する。
 *  - 実在生物（NORMAL/RARE/LEGEND）と空想生物（SECRET）で説明を混同しない。
 *    SECRET は `fictionDisclaimer` を必須とし、科学的事実として断定しない。
 */
import type { DexClass } from "../data/characterCatalog.generated";

/** 事実確認の状態。confirmed 以外は図鑑へ公開しない。 */
export type ReviewStatus = "unresearched" | "researching" | "needsReview" | "confirmed";

/** 出典。実在生物を公開するには最低1件必要。 */
export type ProfileSource = {
  title: string;
  url: string;
  /** 最終確認日（YYYY-MM-DD）。情報は変化しうるため保持する。 */
  checkedAt: string;
};

/** 全分類で共通の項目。 */
type CommonProfile = {
  speciesJa?: string | null;
  speciesEn?: string | null;
  /** 学名。分類単位が種でない場合は明示する。 */
  scientificName?: string | null;
  /** 綱・目・科など。 */
  taxonomy?: string | null;
  reviewStatus: ReviewStatus;
  sources: ProfileSource[];
  lastCheckedAt?: string | null;
};

/** 現生生物（NORMAL / RARE）と絶滅生物（LEGEND）で使う実在情報。 */
type ExtantFields = {
  distribution?: string | null;
  habitat?: string | null;
  size?: string | null;
  diet?: string | null;
  /** 似た種との違いを含む識別特徴。イラスト生成にも使う。 */
  diagnosticFeatures?: string | null;
  behavior?: string | null;
  ecosystemRole?: string | null;
  /** 保全状況。レアリティとは無関係の別情報として扱う。 */
  conservationStatus?: string | null;
  trivia?: string | null;
};

/** RARE（実在する希少形態）専用。必ず通常種へ関連付ける。 */
type RareVariantFields = {
  /** 元となる通常種の id。RARE では必須。 */
  baseSpeciesId?: string | null;
  /** アルビノ / 白変種（リューシズム）/ 黒化（メラニズム）/ 斑 など。 */
  variantType?: string | null;
  /** 発生機序。アルビノと白変種を混同しない。 */
  variantMechanism?: string | null;
  /** 確認されている外見上の差だけを書く。 */
  verifiedAppearance?: string | null;
};

/** LEGEND（絶滅生物）専用。復元の不確実性を保持する。 */
type ExtinctFields = {
  geologicalPeriod?: string | null;
  fossilLocations?: string | null;
  estimatedSize?: string | null;
  /** 化石証拠から確実性が高い特徴。 */
  wellSupportedFeatures?: string | null;
  /** 復元に議論がある特徴。復元画の注記に使う。 */
  uncertainFeatures?: string | null;
  extinctionHypotheses?: string | null;
};

/** SECRET（空想生物）専用。科学情報と混同させない。 */
type FictionalFields = {
  fictionalOrigin?: string | null;
  mythologyOrWorldLore?: string | null;
  fictionalEcology?: string | null;
  /** 「実在を示す科学的証拠はない」旨の表示。SECRET では必須。 */
  fictionDisclaimer?: string | null;
};

export type SpeciesProfile = CommonProfile &
  ExtantFields &
  RareVariantFields &
  ExtinctFields &
  FictionalFields;

export type SpeciesProfileMap = Record<string, SpeciesProfile>;

/** SECRET の既定の但し書き。個別指定が無い場合に使う。 */
export const DEFAULT_FICTION_DISCLAIMER =
  "この生きものは神話・伝承・空想上の存在です。実在を示す科学的証拠はありません。";

/**
 * 図鑑へ公開してよいか。
 *  - 実在生物（NORMAL/RARE/LEGEND）は confirmed かつ出典1件以上が必須。
 *  - 空想生物（SECRET）は科学的出典を要求しないが、但し書きが必須。
 */
export const isPublishable = (profile: SpeciesProfile | undefined, dexClass: DexClass): boolean => {
  if (!profile) return false;
  if (profile.reviewStatus !== "confirmed") return false;
  if (dexClass === "SECRET") return Boolean(profile.fictionDisclaimer ?? DEFAULT_FICTION_DISCLAIMER);
  return profile.sources.length > 0;
};

/** 空想生物の但し書き（未指定なら既定文）。 */
export const fictionDisclaimerOf = (profile: SpeciesProfile | undefined): string =>
  profile?.fictionDisclaimer ?? DEFAULT_FICTION_DISCLAIMER;
