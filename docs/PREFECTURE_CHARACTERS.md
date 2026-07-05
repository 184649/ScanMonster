# WORLDAWN 都道府県キャラ（prefecture）

## 概要
市町村コラボではなく、**都道府県そのものをキャラ化**して出現させる。rare よりレア。

## 出現条件
- GPSで現在地の**都道府県**を判定できた場合のみ prefecture 抽選が有効。
- その都道府県のキャラのみ（`character_masters.prefecture_code = 現在地`）。県外のキャラは出さない。
- GPS未許可・判定失敗時は prefecture 0%（分は normal に戻す）。

## プライバシー
- GPSは都道府県判定のためだけに使う。正確な住所・移動履歴は保存しない。
- 保存は `prefectureCode` / `prefectureName` / `discoveredAt` / `discoveryRecordId` 程度。

## UI方針
- 「福島県ワールド 発見数2/10 出現条件…」のような**説明カードは出さない**。
- 発見時に自然に表示：例「地域発見！ 福島県のキャラと出会いました」。
- 発見証明：「地域限定」「都道府県名」「公式発見番号」「発見日」。

## DB/API
- `character_masters` に `prefecture_code` / `prefecture_name`。
- `discovery_records` に `prefecture_code` / `prefecture_name` / `discovery_source='prefecture_scan'`。
- `POST /api/scan` は `prefectureCode` / `prefectureName` を受け取り prefecture 抽選を有効化。
  無ければ prefecture 0%（`rarityDistribution({ prefectureAvailable:false })`）。

## 実装状況
- **サーバー**：prefecture 抽選・県ゲート・記録・DTO返却（実装済み）。
- **アプリ**：GPS→都道府県 resolver（[prefectures.ts](../src/data/prefectures.ts)／[prefectureService.ts](../src/services/prefectureService.ts)、47都道府県 JIS コード、日本語/ローマ字対応）、
  現在地キャッシュ（[locationStore.ts](../src/stores/locationStore.ts)、スキャン画面フォーカスでスロットリング取得）、
  スキャン時に `prefectureCode`/`prefectureName` を送信、prefecture 発見で「地域発見！○○県のキャラと出会いました」表示、
  発見証明カードに県名タグ＋「地域限定」。テスト [prefectures.test.ts](../tests/prefectures.test.ts)。
- **今後**：都道府県キャラのマスタ投入（`rarity='prefecture'`、`prefecture_code`）と画像。
