# WORLDAWN 発見記録システム（フェーズ1）

日常のバーコード/QRスキャンから発見証明を積み重ね、キャラクターごとの発見記録を育てる。
キャラを捨てる・厳選する・ボックス管理するゲームではない（§3/§39）。

## 設計思想（確定事項・§36.2）

- 発見番号は **キャラクターごとに1から採番**（全体通番は主番号にしない）。
- 発見番号は **全ユーザー共通**を目指す（下記「採番の現状」参照）。
- 早く発見処理が確定した順に若い番号を付与する（端末時刻は順序に使わない）。
- 採番は **専用サービス（NumberingService）** に分離し、発見処理に直書きしない。
- 発見番号は **BIGINT 相当**。保存・API・UI ともに **string** で扱い、`Number()` に変換しない。
  表示は `formatDiscoveryNo()`（ゼロ埋め）。
- キャラクター詳細では **取得済み発見証明をすべて表示**（代表を上部に大きく、通常再発見は折りたたみ可、特別な証明は常に表示）。
- **最強の証はキャラクター記録の称号**（個体ではない）。画像差分なし。**「完全共鳴」は不使用**。
- 同じキャラを複数個体で所持しない（1種1 CharacterRecord）。ボックス・逃がす・個体値・親密度育成は実装しない。
- secret / friend は初回リリースでは **画像アップロード・マスタ登録枠のみ**。出現ロジックは未実装。
- レア率・最強の証率・DP・ワールド解放コストは **設定値（discoveryConfig.ts）で変更可能**。

## 採番（方針変更・確定）

**WORLDAWN は初回リリースからサーバー連携型**。公式発見番号 characterDiscoveryNo は**必ずサーバーが採番**する
（ローカル先行採番は撤回）。サーバー実装は `server/`（Node+TypeScript+Express+PostgreSQL、ConoHa VPS）。

- 公式採番: `discovery_counters` を発見トランザクション内で `+1 RETURNING`（DBは BIGINT、APIは string）。
- 一意制約: `discovery_records (character_id, character_discovery_no)`。全ユーザー共通・キャラごとに1から連番。
- アプリは `POST /api/scan` に sourceHash を送るだけ。**アプリ側で採番しない**。
- **オフラインでは新規スキャン不可**（§3）。図鑑・過去の発見証明・カレンダー・ログはローカルキャッシュで閲覧可。
- ローカルの `localNumberingService` / AsyncStorage `discoveryCounters` は**暫定（非公式）**専用に降格。
  `DiscoveryRecord.numberSource="local"` は UI で「暫定番号」と明示し、公式番号として表示しない。
  サーバー結果は `numberSource="server"`。

サーバー/アプリ/デプロイの手順は
[LOCAL_DEV_AND_TEST.md](LOCAL_DEV_AND_TEST.md) / [DEPLOY_CONOHA_VPS.md](DEPLOY_CONOHA_VPS.md) / [APP_RELEASE.md](APP_RELEASE.md)。

### サーバー構成（server/）
| 層 | ファイル |
| --- | --- |
| ドメイン（アプリと同一仕様） | server/src/domain.ts |
| 発見トランザクション（§4.2） | server/src/scanService.ts |
| API ルート（§9） | server/src/routes.ts |
| DB プール/トランザクション | server/src/db.ts |
| マイグレーション | server/db/migrations/0001_init.sql ＋ server/src/migrate.ts |
| シード | server/src/seed.ts |
| 実行環境 | server/Dockerfile ／ docker-compose.yml ／ nginx.conf.example |

### 検証（実SQL）
`cd server && npm test` = **17 pass**（ドメイン7 ＋ 結合7 ＋ HTTP3）。DATABASE_URL 未設定なら **pg-mem**
（インメモリ PostgreSQL 互換）で migration・`/api/scan`・採番・No.777・最強の証・`/api/health` を実SQLで実行する。
実 PostgreSQL は `DATABASE_URL` を渡せば同テストが通る。VPS 上の docker compose 実行は作業者が実施
（[DEPLOY_CONOHA_VPS.md](DEPLOY_CONOHA_VPS.md) 検証状況）。テスト/動作確認で最強の証を強制するには
`WORLDAWN_FORCE_STRONGEST_PROOF=1`。

## モジュール構成

| 層 | ファイル |
| --- | --- |
| 型 | [src/types/discoveryRecord.ts](../src/types/discoveryRecord.ts)（DiscoveryRecord/CharacterRecord/バッジ/称号ほか） |
| 設定値 | [src/config/discoveryConfig.ts](../src/config/discoveryConfig.ts)（レア率/DP/最強の証率/節目/解放コスト） |
| 純粋: 番号価値 | [src/services/numberValue.core.ts](../src/services/numberValue.core.ts) |
| 純粋: 難度/称号/ランク | [src/services/discoveryJudge.core.ts](../src/services/discoveryJudge.core.ts) |
| 採番 | [src/services/numberingService.ts](../src/services/numberingService.ts)（interface＋端末内実装） |
| 合成/永続化 | [src/services/discoveryRecordService.ts](../src/services/discoveryRecordService.ts) |
| 集計クエリ | [src/services/discoveryQueries.ts](../src/services/discoveryQueries.ts)（今日の一番/カレンダー/番号コレクション） |
| 保存 | storageService（discoveryCounters/discoveryRecords/characterRecords） |
| 配線 | monsterStore.addScannedMonster（採番→証明発行→キャラ記録更新→永続化） |

## 有効スキャン時の処理順（§9/§35・端末内トランザクション相当）

1. 同日同コード（sourceHash+localDate）重複判定 → 重複なら無効（採番・証明・DP・ブースト消費なし）
2. 出現ワールド決定 → レアリティ抽選 → キャラ決定（既存のワールド抽選エンジン）
3. `numberingService.issueCharacterDiscoveryNo(characterId)` で採番
4. 番号価値判定（タグ＋valueRank）
5. 発見難度判定（rarity/新規再発見/番号価値/最強の証/節目）
6. 最強の証の付与判定（決定的シード roll < 付与率）
7. 発見証明（DiscoveryRecord）発行
8. CharacterRecord 作成/更新（回数・最終発見日・最高難度・称号・代表証明・番号バッジ）
9. DP 付与（既存の経済系で加算し、実際の付与額を証明に記録）

## 数値ルール

- レア率: 目安 2〜3%（`RARE_APPEARANCE_RATE`）。デバッグ固定は settings.debugForceRarity。
- DP（§13）: 新規ノーマル30 / 再発見5 / レア初100 / レア再20 / 今日の初回 +20（`computeDiscoveryDp`）。
- 最強の証（§12.4）: 基本0.2% / 番号rare以上0.5% / 番号premium以上1% / レア+premium以上2%。
- 難度（§17）: C〜SSS。最強の証でSS以上、レア+最強+特別番号でSSS。
- 番号価値（§16）: legend(No.001/007/2026) / premium(777/1000/1234) / rare(111/100/ミラー) / memorial(2桁ゾロ/軽キリ番) / normal。

## UI

- 発見結果: 発見証明カード（番号/難度/番号価値/称号/DP）。
- キャラ詳細: キャラクター記録（回数/最高難度/称号）＋実在モチーフ参考値＋代表発見証明＋取得済み全証明（通常再発見は折りたたみ）。
- 発見ログ / 番号コレクション / 発見カレンダー / ホーム「今日の一番発見」。
- 共有カード文言に 公式発見番号・難度・最強の証・#WORLDAWN を含め、生値/商品名/時刻/位置は含めない。

## プライバシー（§4）

保存/表示しない: 生バーコード値・生QR値・商品名・正確な位置・正確な時刻・OCR結果。
保存する: sourceHash・localDate・スキャン種別・発見結果・発見証明・発見番号・DP履歴。
