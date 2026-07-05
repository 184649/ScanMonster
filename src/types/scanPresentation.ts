/**
 * スキャン演出の状態・結果型（docs/SCAN_PRESENTATION.md）。
 */
import type { DiscoveryResultRef } from "./discovery";

/** 演出フェーズ（プロンプト §10 の ScanPresentationState）。 */
export type ScanPresentationPhase =
  | "idle"
  | "scan_locked"
  | "analyzing"
  | "pre_reveal"
  | "revealing"
  | "result"
  | "error";

/** 演出完了時にスキャン画面へ返す結果。 */
export type ScanOutcome =
  | { kind: "discovered"; results: DiscoveryResultRef[] }
  | { kind: "duplicate"; results: DiscoveryResultRef[] }
  | { kind: "error"; message: string };
