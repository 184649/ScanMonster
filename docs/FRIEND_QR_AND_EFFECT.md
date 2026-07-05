# WORLDAWN フレンドQR・フレンド効果

## 動的QR（Phase 2）

QRは owner の user_id を直載せせず、サーバー発行の **HMAC-SHA256 署名付き短期トークン**（既定60秒）を運ぶ（[friendQrToken.ts](../server/src/friendQrToken.ts)、ステートレスで新規テーブル不要）。

- 発行：`POST /api/friend-qr/token`（owner・Bearer）→ `{ token, expiresInSeconds }`。表示側 [DynamicFriendQr.tsx](../src/components/DynamicFriendQr.tsx) は期限前に自動更新。
- 読取：`POST /api/friend-qr/scan`（reader・Bearer、body `{ token, localDate }`）→ サーバーが署名検証して owner を解決。
- 無効化：改ざん（署名不一致）・期限切れ・自己QR（owner=reader）・同一相手同日2回目（`UNIQUE(reader,owner,local_date)`）。
- **スクショ後日使い回しは無効**（exp）だが、**同じ有効QRを60秒以内に別 reader が複数読むのは正常利用**（トークンを世界単位の使い捨てにしない）。
- 秘密鍵は `FRIEND_QR_SECRET`（本番で必ず設定。未設定時は開発用デフォルト）。

## 目的
他者との交流（フレンドQR）で、通常スキャンの「珍しい発見」の期待を上げ、良い動機づけにする。
ただし**具体的な確率も secret の存在も見せない**（Lv とやわらかい文言のみ）。

## フレンドキャラ（friend）
- フレンドワールド専用の**空想生物**。通常スキャンでは出ない。フレンドQR読み込み時のみ抽選。
- 「つながり/縁/招待/守り/交流」テーマに寄せない。ただの空想生物。secret とも別系統。
- **均等確率（1/N）**：`character_masters` の `rarity='friend' AND is_available_for_scan` を均等抽選（5体なら各20%、10体なら各10%）。

## フレンド効果（Lv.0〜3）
`server/src/friendEffect.ts`（純粋）。
- `computeFriendEffectLevel({ newFriendCount, streakDays })`：`score = 新規フレンド数×2 + min(連続日数,7)`。score ≥12→Lv3、≥7→Lv2、≥3→Lv1、他→Lv0。
- **新しいフレンドほど価値が高い**（×2重み）。**同じ相手の連打では上がらない**（`is_new_friend` は初回のみ true＝`newFriendCount` は distinct owner でしか増えない）。
- 連続日数：翌日+1、間が空くと1にリセット（`nextFriendEffectState`）。
- 補正は通常スキャン確率に反映（rare/prefecture/secret を上限まで、上げた分は normal から差し引く）。上限 rare5%/pref2.5%/secret1%。

## 悪用対策
- 同一相手（owner）の再読み込みは新規扱いにしない（`friend_qr_reads` の reader+owner 履歴で判定）。
- 連続日数は日単位でのみ加算。自作連打・同日連打では最大化しない。
- 自分のQR（owner==reader）は拒否（`self_qr` / 400）。

## API
- `POST /api/friend-qr/scan { ownerUserId, localDate }` → `{ status, friendCharacter, isNewFriend, effectLevel, message }`。
- `GET /api/friend-effect` → `{ effectLevel, message }`（**数値・secret を返さない**）。

## DB
- `friend_qr_reads(id, reader_user_id, owner_user_id, is_new_friend, friend_character_id, read_at, local_date)`。
- `friend_effect_state(user_id, streak_days, new_friend_count, effect_level, last_friend_qr_date, updated_at)`。

## アプリ表示（数値なし）
- ホームに `FriendEffectCard`（「フレンド効果 Lv.x」＋文言）。サーバー接続時は `GET /api/friend-effect`、未接続は既定文言。
- フレンドQR読み込み後：「フレンド効果が高まりました。次のスキャンで、いつもと違う出会いがあるかもしれません。」
- 例文（Lv別）：Lv1「交流の気配が高まっています」/ Lv2「珍しい発見の気配が高まっています」/ Lv3「珍しい発見の気配が強まっています」。

## アプリ実装（画面）
- `FriendQRCodeScreen`：自分のフレンドQRを表示（`worldawn:fq:<userId>`、react-native-qrcode-svg）。
- `FriendWorldScanScreen`：カメラでフレンドQRを読み取り→`POST /api/friend-qr/scan`→結果画面（自己QR拒否）。
- `FriendQRResultScreen`：出現フレンドキャラ＋「フレンド効果 Lv.x」＋上昇メッセージ（数値なし・新規フレンド表示）。
- ペイロード util `friendQrPayload.ts`（テスト [friendQrPayload.test.ts](../tests/friendQrPayload.test.ts)）。ホーム「フレンドQR」から導線。

## 未実装（今後）
- フレンドキャラのマスタ投入（`rarity='friend'`）と画像（現状はマスタ未投入なら結果は character=null）。
