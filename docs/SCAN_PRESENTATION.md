# WORLDAWN スキャン演出（Scan Presentation）

## 目的
スキャン成立から結果表示までを「何が出るんだろう」とドキドキしながら待てる体験にする。
サーバー応答待ちを「待たされ」ではなく「解析演出」として吸収する。
コンセプト：**日常のコードから、未知の発見が目覚める**（発見・記録・証明・夜明け・光）。

## 演出フロー（5フェーズ）
`ScanPresentationPhase = idle | scan_locked | analyzing | pre_reveal | revealing | result | error`

| Phase | 役割 | 主な表現 |
| --- | --- | --- |
| 1 scan_locked | 読み取り確定 | ロックオン枠が閉じる・中央ドット・「読み取り確定」・軽い振動・SE `scan_read` |
| 2 analyzing | 解析（**API待ちを吸収**） | 二重回転リング・中心へ収束する粒子・「解析中…/照合中…/生成中…」巡回。API 解決まで＆最小時間まで継続 |
| 3 pre_reveal | 出現前のため | 暗転＋光球の鼓動が高まる・「なにかが目覚める…！」・中振動・SE `scan_success` |
| 4 revealing | 公開 | `AwakeningReveal`（集光→チャージ→フラッシュ→放射光＋きらめき粒子＋キャラ登場）・強振動・SE `discovery_*` |
| 5 result | 発見証明 | 結果画面 `SummonResult`（公式番号・難度・番号価値・称号・証明カード） |

- 実装: [ScanPresentation.tsx](../src/components/discovery/ScanPresentation.tsx)（Phase1–4）→ 完了で `SummonResult` へ（`presented:true` で結果画面は reveal を再生しない）。
- 純粋ロジック: [scanPresentation.core.ts](../src/services/scanPresentation.core.ts)（ティア判定・特別演出判定・フェーズ時間・結果分類）。
- Phase4 の公開演出: [AwakeningReveal.tsx](../src/components/discovery/AwakeningReveal.tsx)（ティア差分対応）。

## サーバー待機の吸収
Phase2 で `run()`（`POST /api/scan`）を投げ、**解析演出をループ**しながら結果を待つ。
`analyzingMin`（ティア別の最小滞在時間）を満たしつつ、API が遅ければ解決まで自然に延長するため
「固まった/待たされた」感を出さない。オフライン時はそもそもスキャン画面側で新規スキャンを止める（§WORLDAWN-3）。

## レアリティ差分（ティア）
`resolveTier(rarity)` → normal / rare / secret / friend。色・粒子数・鼓動回数・間・二段フラッシュを段階的に強める。

| ティア | 体感時間の目安 | 色調 | 表現 |
| --- | --- | --- | --- |
| normal | 約1.5–2.5秒 | 白／淡青／薄金 | 爽快・過剰にしない |
| rare | 約2.5–3.5秒 | 青／金 | 光量↑・粒子↑・間を長く・専用フラッシュ |
| secret | 約3.0–4.5秒 | 深青／紫／夜明け金 | 別格・鼓動最多・粒子最多・紫系フラッシュ |
| friend（将来） | rare相当 | 桃／縁の光 | 暖かさ・つながり感 |

## 特別番号・高難度の追加演出（§WORLDAWN-7）
`isBigCelebration({ numberValueRank, difficultyRank, strongestProof })` が true のとき
（No.777 等 premium/legend 番号、発見難度 SS/SSS、最強の証）、公開演出に**粒子増＋特別バッジ「この発見は特別です」**を付与する。

## 音・振動
- 音（[soundService](../src/services/soundService.ts)・[SOUND_SPEC.md](SOUND_SPEC.md)）: 確定`scan_read`→解析`scan_start`→解析完了`scan_success`→公開`discovery_normal`/`discovery_rare`。素材未配置でも無音で成立。
- 振動（[hapticsService](../src/services/hapticsService.ts)・`expo-haptics`）: 確定=軽 / ため=中 / 公開=軽（rare・secretは強＋成功通知）。設定 `hapticsEnabled` でOFF可。非対応端末は無視。

## スキップ・簡易・アクセシビリティ
- **タップで演出短縮**（`skipRef` により各待機を即時化。ただし公開には結果が必要なので API は待つ）。
- 設定「演出: 簡易」（`simpleScanFx`）で全ティア短縮。
- **Reduce Motion**（端末の「視差効果を減らす」）を `AccessibilityInfo` で検知し自動で簡易化。過度な点滅を避け、音OFF・振動OFFでも成立。

## エラー・重複時
- API 失敗 → `error`：スキャン画面に「発見処理に失敗しました…」＋エラー振動。
- 全て同日同コード → `duplicate`：公開せず「今日は発見済み」表示。
- 多重スキャン防止：`processingRef` と演出中はカメラの `onBarcodeScanned` 無効（`scanState==="processing"`）。

## 状態・API連携の考慮
- スキャン画面は演出を `ScanPresentation` に委譲。`run()` が `processDetectedCodes` を呼び、結果（重複含む）を `DiscoveryResultRef[]` で返す。
- 公開対象は `pickPrimaryRef`（最初の新規/再発見）。画像・レアリティは store（`getMonsterById`）、特別演出判定は発見証明（`getDiscoveryRecordById`）から。
- 完了時 `onFinished(outcome)`：discovered → `SummonResult({ results, presented:true })`、duplicate/error → スキャン画面に戻す。

## テスト
- 単体: [scanPresentation.test.ts](../tests/scanPresentation.test.ts)（ティア判定／特別演出判定／フェーズ時間の大小・Reduce縮小／結果分類・公開対象）。
- 手動確認: normalのテンポ／rareの特別感／secretの別格感／タップ短縮／連続操作の安定／低スペック端末で破綻しないこと。

## 低負荷方針
追加ライブラリなし（RN `Animated`）。アニメは transform/opacity のみ＝native driver で駆動、色はティアで固定。粒子数は上限（normal12/rare18/secret22＋特別6）。Reduce Motion/簡易で描画を大幅削減。
