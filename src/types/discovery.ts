import type { DPRewardLine } from "./economy";
import type { ScanSource, UserMonster } from "./monster";

/**
 * カメラ／写真ライブラリで検出した1件のコード。
 * normalizedValue は生成処理のためにメモリ上で扱うだけで、永続保存しない。
 */
export type DetectedCode = {
  id: string;
  scanSource: ScanSource;
  /** 読み取り種別（EAN-13 / QR など）の正規化ラベル。 */
  codeType: string;
  /** 正規化済みのコード値（保存しない）。 */
  normalizedValue: string;
};

/** 1件のコードから得た発見結果。生値は含めない。 */
export type DiscoveryResult =
  | {
      id: string;
      kind: "first" | "rediscovery";
      scanSource: ScanSource;
      monster: UserMonster;
      dpEarned: number;
      dpBalanceAfter: number;
      dpBreakdown: DPRewardLine[];
      /** 発行された発見証明ID。 */
      discoveryRecordId?: string;
    }
  | {
      id: string;
      kind: "duplicate";
      scanSource: ScanSource;
      familyId: string;
      researchPoints: number;
      dpEarned: number;
      dpBalanceAfter: number;
      dpBreakdown: DPRewardLine[];
    };

/** ナビゲーションで発見結果画面へ渡す軽量な記述（モンスター本体はストアから取得）。 */
export type DiscoveryResultRef = {
  id: string;
  kind: "first" | "rediscovery" | "duplicate";
  scanSource: ScanSource;
  monsterId?: string;
  duplicateFamilyId?: string;
  researchPoints?: number;
  dpEarned: number;
  dpBalanceAfter: number;
  dpBreakdown: DPRewardLine[];
  /** 発行された発見証明ID（結果画面が store から証明を引く）。 */
  discoveryRecordId?: string;
};
