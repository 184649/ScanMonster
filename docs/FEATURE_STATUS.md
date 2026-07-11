# WORLDAWN 機能ステータス

最終更新: 2026-07-10

> 2026-07-10（公開前ハードニング Phase 1）：**Bearer認証を導入し x-user-id を廃止**。1端末=1匿名アカウント（`POST /api/auth/anon`→トークン、SecureStore保存、`Authorization: Bearer`）。全ユーザー依存APIを `requireAuth` で保護。トークンはDBにSHA-256ハッシュのみ保存。引継ぎ(redeem)は新端末用トークンも発行。詳細 [AUTHENTICATION.md](AUTHENTICATION.md)。検証：server 114 tests / app 105 tests / 両TSC0 / export成功。
> 2026-07-10（Phase 2）：**動的フレンドQR**を導入。QRは userId 直載せをやめ、サーバー発行の**HMAC署名付き短期トークン（約60秒）**を運ぶ。`POST /api/friend-qr/token`（owner・Bearer）→表示側は自動更新、`POST /api/friend-qr/scan`は`{token, localDate}`で reader=Bearer・owner=署名から解決。改ざん/期限切れ/自己QRは無効。`UNIQUE(reader,owner,local_date)`は維持（別readerは同一QRを60秒内に読める＝スクショ後日使い回しのみ無効）。詳細 [FRIEND_QR_AND_EFFECT.md](FRIEND_QR_AND_EFFECT.md)。検証：server 128 / app 105 / 両TSC0 / export成功。
> 2026-07-10（Phase 3）：**レート制限・farming対策**を導入（[rateLimit.ts](../server/src/rateLimit.ts)）。IP単位（緩め・NAT対面イベント許容）＋user単位（主防御）で anon/scan/friend-qr token・scan/transfer/masters に 429。しきい値は `RL_*` 環境変数で調整可。詳細 [SECURITY.md](SECURITY.md)。検証：server 133 tests / TSC0。app は本フェーズ非変更（Phase 2 の 105 tests / TSC0 / export成功を維持）。
> 2026-07-10（Phase 4）：**実PostgreSQL統合テスト環境**を用意（`server/docker-compose.test.yml`、`scripts/it-postgres.sh`/`.ps1`、`npm run it:postgres`、CI `.github/workflows/server-it.yml`、実PG専用の同時採番テスト [numberingConcurrency.int.test.ts](../server/tests/numberingConcurrency.int.test.ts)）。既存テストは `DATABASE_URL` 設定で実PGにそのまま走る。手順 [POSTGRES_INTEGRATION_TEST.md](POSTGRES_INTEGRATION_TEST.md)。**この環境はDocker不在のため実PGでの実行は未実施**（pg-memで133 pass＋同時採番1 skip）。
> 2026-07-10（Phase 5–6）：**自動バックアップ＋復元＋復元検証スクリプト**を用意（[backup.sh](../server/scripts/backup.sh) 世代保持/ローテーション/破損検知/オフサイト複製/失敗検知、[restore.sh](../server/scripts/restore.sh)、[restore-verify.sh](../server/scripts/restore-verify.sh) 件数・公式番号・カウンター突合）。cron/systemd 例と手順は [BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md)。`bash -n` 構文チェック済み。**実バックアップ取得・復元・検証の実行はこの環境（稼働PG/pg_dump不在）では未実施**。
> 2026-07-10（Phase 7–9）：**利用規約・プライバシーポリシー**を実文で作成＋アプリ内表示（[TERMS_OF_SERVICE.md](TERMS_OF_SERVICE.md)/[PRIVACY_POLICY.md](PRIVACY_POLICY.md)、[LegalScreen](../src/screens/LegalScreen.tsx)、メニューから閲覧）。プライバシーは実コード/DBの収集・非収集に一致。**完全引き継ぎ統合テスト**（[transferComplete.int.test.ts](../server/tests/transferComplete.int.test.ts)）で、引き継ぎ＝同一user_id移譲によりサーバー側の全データ（発見/番号/特殊番号/称号/DP/解放/フレンド履歴/legendary解放）が健在・新トークン認証・コード単回/期限切れ不可を検証。DP/解放の読み取り用 `GET /api/dp` `GET /api/world-unlocks` を追加。詳細 [DATA_TRANSFER.md](DATA_TRANSFER.md)。検証：server 137 pass・1 skip / app 111 pass / 両TSC0 / export成功。
> **残（公開前）**：実PostgreSQL統合テストとバックアップ/復元の**実行**（環境待ち）。アプリ新端末の自動復元は現状 discoveries のみ（DP/解放の取り込み配線・お気に入り/メモのサーバー永続化は今後）。レート制限は単一プロセス前提（水平スケール時は共有ストアが必要）。

> 2026-07-10（段3）：希少度を **normal > rare > legendary > secret** の4段階に整理。**rare=実在の希少生物**、**legendary=空想生物**。伝説はワールド単位で、**そのワールドの normal 全発見（rare不問）で解放**。未解放時は存在を一切示唆しない（文言・タブ・シルエット・件数・APIレスポンスも非開示）。解放時のみ `legendaryUnlockedNow` で示唆解禁。出現率：未解放は legendary **常に0%**、解放後は基本1.0%でフレンド人数に応じ最大10.0%（100人）。secretは0.2%固定。詳細は [LEGENDARY_UNLOCK.md](LEGENDARY_UNLOCK.md) / アセット構成は [CHARACTER_ASSET_STRUCTURE.md](CHARACTER_ASSET_STRUCTURE.md)。**実PostgreSQL統合テストはDocker未導入のため未実行**（pg-memで検証）。アプリ側の伝説解放演出・図鑑/ワールドUIの伝説表示、および物理的なアセットフォルダ移動は未実装（段4以降）。

> 2026-07-10（段2）：フレンドQRを「正式な発見」へ統合。**新規フレンド=未発見キャラを1体確定出現**／**既存フレンド=通常発見（未発見に重み補正）**。新規・既存とも**その日の有効フレンド人数（同一相手は1日1回・最大100人補正）**に計上し、1人ごとに未発見重み +0.02（最大×3.00）、10人ごとに rare +0.2pt（最大5.0%、内部secretは0.2%固定）を適用。採番・発見証明・記録・DPは通常スキャンと共通化（`finalizeDiscovery`）。レアリティ/キャラはサーバー側抽選に変更（sourceHashは同日同コード重複防止・識別のみ）。旧「friendワールド専用キャラ均等抽選」は廃止（master/migrationは将来用に残置）。都道府県は初期リリース非対象（構造は保持）。実PostgreSQL統合テストはDocker未導入のため未実行（pg-memで検証）。

> 2026-07-09：メインUIを**固定5タブ**（ホーム／スキャン／図鑑／フレンド／メニュー）へ再編。図鑑は検索＋カテゴリチップ＋3列グリッド、フレンドは自分のQR表示・QR読取・フレンド効果をまとめたハブ、メニューはデータ／設定／参加する／その他をセクションで整理。発見結果はレア度別の見出し（通常「発見！」／レア「珍しい発見！」／都道府県「都道府県キャラ発見！」／secret「未知の出現！」）を表示。**画像の追加・改名時は必ず `npm run gen:catalog` を実行**（生成物のみ更新、元画像は非変更）。

WORLDAWNの初回リリースは、「スキャンしてキャラを発見し、DPで**ワールド**を解放し、**ワールドブースト**で狙いたいワールドを出やすくしながら図鑑と称号を進める」体験に絞る。

> 2026-07-05：分類を「**領域 > ワールド > キャラクター**」構造へ移行。DPで解放する単位は**ワールド**。初回は生物領域の4ワールド（地上／水辺／空／虫）で、開始時に1つを無料選択。旧「出現カテゴリ／気配ブースト」は「ワールド／ワールドブースト」に置換。詳細は [WORLD_SYSTEM.md](WORLD_SYSTEM.md) §7。

## MVPで利用可能

- [x] バーコード/QRスキャン
- [x] 写真ライブラリからのコード読み取り
- [x] 1画面/1画像内の複数コード処理
- [x] 同日同コード制限
- [x] 生のバーコード値/QR内容を保存しないハッシュ運用
- [x] キャラクター発見
- [x] 再発見（再発見でも発見証明を発行）
- [x] 発見証明・発見記録（CharacterRecord／全証明蓄積）
- [x] キャラ別公式発見番号（**サーバー採番**・BIGINT・APIはstring。オフライン新規スキャン不可）
- [x] 番号価値（ゾロ目/キリ番/ラッキー7/連番/ミラー/年号ほか）＋番号コレクション
- [x] 発見難度 C〜SSS・発見ランク表示
- [x] 最強の証（キャラクター称号／完全共鳴は不使用）
- [x] 発見ログ・発見カレンダー・今日の一番発見
- [x] 共有カード（公式番号・難度・称号・#WORLDAWN、生値は非表示）
- [x] ワールド図鑑（ワールド別に発見/未発見を表示）
- [x] キャラ詳細（記録／代表＋全発見証明／実在モチーフ参考値）
- [x] DP
- [x] 初回ワールド選択（地上／水辺／空／虫から1つ）
- [x] DPによるワールド解放（コストは解放数で決定）
- [x] ワールドブースト（対象ワールドの出現率のみ）
- [x] レア出現率 1〜3%
- [x] DP/ワールドブーストでレア確率を上げない
- [x] 称号
- [x] マイページ
- [x] 設定
- [x] アカウント連携・ログイン（メール＋パスワード）
- [x] データ引継ぎ（ログイン／引継ぎコード）
- [x] 要望掲示板（投稿・人気/新着一覧・リアクション）
- [x] 効果音(SE)システム（スキャン/発見/レア/解放/DP/お気に入り、SE ON-OFF・音量、素材未配置でも安全）※素材は別途配置
- [x] スキャン演出（5フェーズ：確定→解析→出現前→公開→証明。サーバー待ちを解析演出に吸収、レア/secret差分、特別番号追加演出、ハプティクス、スキップ、Reduce Motion対応）
- [x] ローカル保存
- [x] データリセット

## 初回リリース対象外

- [ ] バトル
- [ ] 探索
- [ ] 研究
- [ ] アニメーション
- [ ] 個体値
- [ ] 個体差コレクション
- [ ] カテゴリ図鑑
- [ ] 商品名取得
- [ ] OCR
- [ ] 位置情報を使った出現制御
- [ ] 交換
- [ ] ランキング
- [ ] 課金
- [ ] 広告

## 実装メモ

- `src/types/habitat.ts`: HabitatGroup / Character / OwnedCharacter / HabitatBoost
- `src/data/habitatGroups.ts`: カテゴリ定義、解放コスト、気配ブースト率
- `src/data/characters.ts`: 既存MonsterFamily/RareMonsterからCharacter相当へ変換
- `src/data/titles.ts`: 初回リリース称号マスター
- `src/services/habitatService.ts`: カテゴリ抽選、ブースト消費
- `src/services/titleService.ts`: 称号解放判定
- `src/stores/monsterStore.ts`: 初回カテゴリ、カテゴリ解放、気配ブースト、再発見、称号設定
- 効果音: `src/services/soundService.ts`（`playSound`）、`src/types/sound.ts`（SoundId/設定）、`src/assets/soundManifest.generated.ts`（`npm run gen:sounds` で生成）。仕様は [SOUND_SPEC.md](SOUND_SPEC.md)。素材は `assets/sounds/` に配置（現状未配置＝無音）。
- スキャン演出: `src/components/discovery/ScanPresentation.tsx`（5フェーズ・API待ち吸収）、`AwakeningReveal.tsx`（公開・ティア差分）、純粋ロジック `src/services/scanPresentation.core.ts`、触覚 `src/services/hapticsService.ts`（expo-haptics）。設定 `hapticsEnabled`/`simpleScanFx`。仕様は [SCAN_PRESENTATION.md](SCAN_PRESENTATION.md)。
- 発見記録: 型 `src/types/discoveryRecord.ts`、設定 `src/config/discoveryConfig.ts`、純粋判定 `src/services/numberValue.core.ts`／`discoveryJudge.core.ts`、合成/永続化 `src/services/discoveryRecordService.ts`、集計 `src/services/discoveryQueries.ts`。仕様は [DISCOVERY_SYSTEM.md](DISCOVERY_SYSTEM.md)。
- サーバー連携（方針変更）: **公式発見番号はサーバー採番**。API サーバーは `server/`（Node+TS+Express+PostgreSQL、ConoHa VPS）。アプリは `src/config/apiConfig.ts`／`src/services/apiClient.ts`／`networkService.ts` で `POST /api/scan` を呼ぶ。ローカル採番は「暫定（非公式）」に降格（`DiscoveryRecord.numberSource`）。オフラインは新規スキャン不可・閲覧のみ。手順は [LOCAL_DEV_AND_TEST.md](LOCAL_DEV_AND_TEST.md)／[DEPLOY_CONOHA_VPS.md](DEPLOY_CONOHA_VPS.md)／[APP_RELEASE.md](APP_RELEASE.md)。secret/friend は出現ロジック未実装（マスタ枠のみ・`is_available_for_scan=false`）。
- アカウント/引継ぎ/要望掲示板: 設計は [ACCOUNTS_AND_FEEDBACK.md](ACCOUNTS_AND_FEEDBACK.md)。サーバー `authService.ts`／`featureService.ts`／migration `0002_auth_feature.sql`、アプリ `stores/authStore.ts`／`services/activeUser.ts`／`AccountScreen`／`FeatureBoardScreen`。データ引継ぎは発見証明・キャラ記録を同期（monsters/DP/解放の完全同期は今後）。
- ワールド構造・出現分類: normal/rare/prefecture/secret を通常スキャンで抽選（variant/limited は未実装・friend はフレンドQR時のみ）。確率モデル `server/src/rates.ts`、フレンド効果 `friendEffect.ts`／`friendService.ts`、migration `0003_world_rarity_friend.sql`。設計は [WORLD_AND_RARITY_DESIGN.md](WORLD_AND_RARITY_DESIGN.md)／[FRIEND_QR_AND_EFFECT.md](FRIEND_QR_AND_EFFECT.md)／[PREFECTURE_CHARACTERS.md](PREFECTURE_CHARACTERS.md)。ユーザーには確率数値も secret も見せない。
- アプリ体験（都道府県/フレンドQR/ワールド一覧）: GPS→都道府県 `prefectures.ts`／`prefectureService.ts`／`locationStore.ts`（スキャン時に prefectureCode 送信）、prefecture 発見は「地域発見！」表示、フレンドQR `FriendQRCodeScreen`／`FriendWorldScanScreen`／`FriendQRResultScreen`＋`friendQrPayload.ts`、ワールド一覧カテゴリUI `WorldListScreen`、フレンド効果ヒント `FriendEffectCard`（Home/Scan、数値なし）。secret は非表示（「シークレット」語なし・"特別"表記）。
- サーバー結合検証: `server` テスト **34 pass**（ドメイン7＋発見結合7＋HTTP3＋認証/掲示板5＋確率/フレンド8＋フレンドQR4）。実SQLで migration/採番/No.777/最強の証/duplicate/`/api/health`/`/api/scan` を検証（DB無し環境は pg-mem、実 PostgreSQL は DATABASE_URL 指定で同一）。**実 ConoHa VPS 上の起動は作業者が実施（未実施）**。

## 確認コマンド

```powershell
npm.cmd run typecheck
npm.cmd test
```
