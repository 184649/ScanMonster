/**
 * SNS シェアカードのモデル生成（純粋・テスト可能）。
 *
 * 目的：リアルイラスト単体だと「資料画像」に見えるため、
 * 発見の達成感とコレクション進捗を添えたカードにして投稿したくなる形にする。
 *
 * 見た目の方針：
 *  - **イラストが主役**。カードは余白と枠で整え、イラストの上へ装飾を重ねない。
 *  - 情報量は少なく、SNS で一目で分かる範囲に絞る。
 *  - レアリティに応じてカードの色を変える（配色は dexPresentation.core と同じ体系）。
 *
 * プライバシー：
 *  - 発見日は**日付まで**（秒・分を出さない）。
 *  - 発見条件は都道府県名などの粗い粒度まで。座標・バーコード値・ハッシュは扱わない。
 */
import type { DexClass } from "../data/characterCatalog.generated";

/** カードの種類。 */
export type ShareCardKind =
  | "discovery" // 単体発見カード
  | "rareDiscovery" // レア発見カード
  | "worldComplete" // ワールド完成カード
  | "dexProgress" // 図鑑進捗カード
  | "today" // 今日の発見カード
  | "weekly"; // 今週のコレクションカード

/** カード内に1行で並べる項目。 */
export type ShareCardField = { label: string; value: string };

/** カードに並べる生きもの。 */
export type ShareCardSubject = {
  /** カタログID（画像解決に使う）。 */
  id: string;
  name: string;
  dexClass: DexClass;
};

export type ShareCardModel = {
  kind: ShareCardKind;
  /** カード上部の英字ラベル（"NEW DISCOVERY" 等）。 */
  tag: string;
  /** 見出し（日本語）。 */
  title: string;
  /** 補足（1行）。空文字なら出さない。 */
  subtitle: string;
  /** メインに出す生きもの（複数枚並べる種類もある）。 */
  subjects: ShareCardSubject[];
  /** 情報行。 */
  fields: ShareCardField[];
  /** 進捗バーを出すか。 */
  showsProgressBar: boolean;
  /** 進捗（0..100）。showsProgressBar のときだけ使う。 */
  progressPercent: number;
  /** カードの配色を決める分類。複数体のときは最上位の分類。 */
  paletteClass: DexClass;
};

/** 分類の格。配色の決定と「レア発見カードにするか」の判定に使う。 */
const RANK: Record<DexClass, number> = { NORMAL: 0, RARE: 1, LEGEND: 2, SECRET: 3 };

/** 一番格上の分類を返す（空なら NORMAL）。 */
export const topDexClass = (classes: DexClass[]): DexClass =>
  classes.reduce<DexClass>((best, c) => (RANK[c] > RANK[best] ? c : best), "NORMAL");

/**
 * 発見日（日付まで）。時刻は出さない。
 * ISO文字列が壊れていれば空文字を返す（カードから行ごと消える）。
 */
export const formatDiscoveryDate = (isoString: string | undefined): string => {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

/** 空の値を落として fields を組み立てる。 */
const fieldsOf = (entries: Array<[string, string | undefined]>): ShareCardField[] =>
  entries.filter((e): e is [string, string] => Boolean(e[1] && e[1].length > 0)).map(([label, value]) => ({ label, value }));

// ---- 1. 単体発見カード / 2. レア発見カード ----

export type DiscoveryCardInput = {
  subject: ShareCardSubject;
  /** 和名・学名など。無ければ省略。 */
  speciesLabel?: string;
  /** 公式発見番号。 */
  officialNo?: string;
  /** 発見日時（ISO）。日付までに丸めて表示する。 */
  discoveredAt?: string;
  /** 発見地域または条件（都道府県名など）。 */
  conditionLabel?: string;
  /** 分類の日本語ラベル（希少形態 等）。 */
  rarityLabel: string;
};

/**
 * 単体発見カード。
 * NORMAL は "NEW DISCOVERY"、RARE 以上は専用コピーのレア発見カードになる。
 */
export const buildDiscoveryCard = (input: DiscoveryCardInput): ShareCardModel => {
  const cls = input.subject.dexClass;
  const isRare = RANK[cls] >= 1;

  return {
    kind: isRare ? "rareDiscovery" : "discovery",
    tag: isRare ? "I FOUND A RARE SPECIES" : "NEW DISCOVERY",
    title: input.subject.name,
    subtitle: input.speciesLabel ?? "",
    subjects: [input.subject],
    fields: fieldsOf([
      ["レアリティ", input.rarityLabel],
      ["図鑑番号", input.officialNo ? `No.${input.officialNo}` : undefined],
      ["発見日", formatDiscoveryDate(input.discoveredAt)],
      // レア発見カードは「発見条件の一部」を出して物語性を足す。
      [isRare ? "発見条件" : "発見地域", input.conditionLabel]
    ]),
    showsProgressBar: false,
    progressPercent: 0,
    paletteClass: cls
  };
};

// ---- 3. ワールド完成カード ----

export type WorldCompleteCardInput = {
  worldLabel: string;
  /** 代表的な数体（4体程度まで並べる）。 */
  representatives: ShareCardSubject[];
  totalDiscovered: number;
  /** 完成日（ISO）。 */
  completedAt?: string;
};

export const buildWorldCompleteCard = (input: WorldCompleteCardInput): ShareCardModel => ({
  kind: "worldComplete",
  tag: "WORLD COMPLETE",
  title: `${input.worldLabel} 図鑑完成`,
  subtitle: "このワールドの生きものをすべて発見しました",
  subjects: input.representatives.slice(0, 4),
  fields: fieldsOf([
    ["完成率", "100%"],
    ["発見総数", `${input.totalDiscovered}種`],
    ["完成日", formatDiscoveryDate(input.completedAt)]
  ]),
  showsProgressBar: true,
  progressPercent: 100,
  // 完成カードは特定の生きものではなくワールドの達成なので、常に LEGEND 系の重厚な配色にする。
  paletteClass: "LEGEND"
});

// ---- 4. 図鑑進捗カード ----

export type DexProgressCardInput = {
  discovered: number;
  total: number;
  percent: number;
  /** 直近の新発見（1〜3体）。 */
  recent: ShareCardSubject[];
};

export const buildDexProgressCard = (input: DexProgressCardInput): ShareCardModel => ({
  kind: "dexProgress",
  tag: "My Collection Progress",
  title: `${input.discovered} / ${input.total} 種`,
  subtitle: `完成率 ${input.percent}%`,
  subjects: input.recent.slice(0, 3),
  fields: fieldsOf([
    ["総発見数", `${input.discovered}種`],
    ["完成率", `${input.percent}%`],
    ["直近の発見", input.recent.length > 0 ? input.recent.slice(0, 3).map((s) => s.name).join("、") : undefined]
  ]),
  showsProgressBar: true,
  progressPercent: input.percent,
  paletteClass: topDexClass(input.recent.map((s) => s.dexClass))
});

// ---- 5. 今日の発見カード ----

export type TodayCardInput = {
  /** 今日発見したもの（1〜4体を並べる）。 */
  discoveries: ShareCardSubject[];
  /** 今日の新規登録数。 */
  newCount: number;
  /** 今日の完成率変化（ポイント）。0 なら出さない。 */
  percentDelta: number;
  percent: number;
};

/** 今日の発見が0件なら undefined（カードを出さない）。 */
export const buildTodayCard = (input: TodayCardInput): ShareCardModel | undefined => {
  if (input.discoveries.length === 0) return undefined;
  return {
    kind: "today",
    tag: "Today's Discoveries",
    title: `今日は${input.discoveries.length}種を発見`,
    subtitle: input.discoveries
      .slice(0, 4)
      .map((s) => s.name)
      .join("、"),
    subjects: input.discoveries.slice(0, 4),
    fields: fieldsOf([
      ["新規登録", input.newCount > 0 ? `${input.newCount}種` : undefined],
      ["完成率", input.percentDelta > 0 ? `${input.percent}%（+${input.percentDelta}）` : `${input.percent}%`]
    ]),
    showsProgressBar: true,
    progressPercent: input.percent,
    paletteClass: topDexClass(input.discoveries.map((s) => s.dexClass))
  };
};

// ---- 6. 今週のコレクションカード ----

export type WeeklyCardInput = {
  weeklyCount: number;
  streakDays: number;
  percent: number;
  highlights: ShareCardSubject[];
};

/** 今週0種なら undefined（カードを出さない）。 */
export const buildWeeklyCard = (input: WeeklyCardInput): ShareCardModel | undefined => {
  if (input.weeklyCount <= 0) return undefined;
  return {
    kind: "weekly",
    tag: "This Week",
    title: `今週は${input.weeklyCount}種を発見`,
    subtitle: input.streakDays >= 2 ? `${input.streakDays}日連続で発見中` : "",
    subjects: input.highlights.slice(0, 4),
    fields: fieldsOf([
      ["今週の発見", `${input.weeklyCount}種`],
      ["連続発見", input.streakDays >= 2 ? `${input.streakDays}日` : undefined],
      ["完成率", `${input.percent}%`]
    ]),
    showsProgressBar: true,
    progressPercent: input.percent,
    paletteClass: topDexClass(input.highlights.map((s) => s.dexClass))
  };
};

// ---- 投稿文テンプレ ----

/**
 * カードに添える投稿文の1行目。
 * 詳しい本文は shareText.core が組み立てる。ここは「掴み」だけ。
 */
export const shareHeadlineFor = (model: ShareCardModel): string => {
  switch (model.kind) {
    case "rareDiscovery":
      return model.paletteClass === "SECRET"
        ? "SECRETを解放しました。"
        : model.paletteClass === "LEGEND"
          ? "絶滅した生きものを見つけた！"
          : "レア生物を見つけた！";
    case "worldComplete":
      return `ついに${model.title.replace(" 図鑑完成", "")}ワールド完成！`;
    case "dexProgress":
      return "図鑑の進捗を記録しました。";
    case "today":
      return "今日の発見を図鑑に登録しました。";
    case "weekly":
      return "今週のコレクションです。";
    case "discovery":
    default:
      return "新しい生きものを発見！";
  }
};
