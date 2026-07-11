# WORLDAWN ワールド構造・出現分類 設計

## キャラ分類
| 分類 | 内容 | 初回リリース |
| --- | --- | --- |
| normal | 実在生物ベースの基本キャラ（地上/水辺/空/虫）。通常スキャンで最も高確率 | ✅ 抽選対象 |
| rare | 通常ワールド内の希少個体（白いカラス・夜光チョウ・古代魚など）。神様/フレンド/コード系ではない | ✅ 抽選対象 |
| prefecture | 都道府県そのものをキャラ化。GPSでその県内のときだけ低確率で出現。rareよりレア | ✅ 抽選対象 |
| secret | 全ワールド外の最上位の隠し存在。**UIに存在を明示しない** | ✅ 抽選対象（伏せる） |
| variant | 同種族の別個体（ポーズ/模様/体格等） | ❌ 未実装（抽選に含めない） |
| limited | 企業/地域コラボ・期間限定イベント | ❌ 未実装（DB枠のみ） |
| friend | フレンドワールド専用の空想生物。**通常スキャンでは出ない**。フレンドQR読み込み時のみ均等抽選 | フレンドQR時のみ |

WorldGroup: `land/water/sky/bug/friend/prefecture/secret`（既存の ground/waterside 等の内部キーは維持）。

## 通常スキャン確率（server `src/rates.ts`）
GPS有効・フレンド効果Lv0の基本値：
```
normal 96.0% / rare 3.0% / prefecture 0.8% / secret 0.2%
```
GPS無効（未許可/失敗/県判定不可）→ prefecture 0%、その分 normal に戻す：
```
normal 96.8% / rare 3.0% / secret 0.2%
```
**variant/limited/friend は通常スキャンの抽選に含めない**（`pickRarity` は normal/rare/prefecture/secret のみ返す）。

## フレンド効果による補正（§5・数値は非表示）
フレンドQRの連続利用・新規フレンドで rare/prefecture/secret を上限まで引き上げ、上げた分を normal から差し引く。
```
上限：rare 5.0% / prefecture 2.5% / secret 1.0%（Lv3で normal 91.5%）
```
レベルは Lv.0〜3。`friendEffectLevel/3` で線形補間。詳細は [FRIEND_QR_AND_EFFECT.md](FRIEND_QR_AND_EFFECT.md)。
**ユーザーには具体的な確率も secret の存在も見せない**（Lv とやわらかい文言のみ）。

## secret の非表示方針
- UI に「secret / シークレット」の語を出さない（アプリ内に該当文言なし）。
- 出現時の演出はティア差分（`AwakeningReveal` の secret = 「☆ 未知の出現！ ☆」）で、"secret" とは言わない。
- 図鑑は未発見時に隠し枠（明示しない）。※図鑑の隠し枠UIは今後。

## UI方針（ワールドが増えても見やすく・§9）
- 横並びタブの乱立を避け、カテゴリ折りたたみで整理：
  - 基本ワールド（地上/水辺/空/虫）／特殊（フレンド）／地域（都道府県）／限定（イベント/コラボ）／隠し領域（シークレット・未発見時は非表示）。
- ホームは全ワールドを並べない（今日の発見・スキャン・フレンド効果・導線など4〜6要素）。
- 図鑑フィルタ：すべて/基本/地域/フレンド/限定/レアリティ別/発見済み・未発見（secret は未発見時に出さない）。
- ※ワールド一覧の完全なカテゴリ折りたたみUIは段階実装（本フェーズはサーバー分類＋確率＋フレンド効果ヒントまで）。

## DB/API
- 分類・地域・限定・フレンドの列/テーブルは migration `0003_world_rarity_friend.sql`（discovery_records に prefecture/discovery_source/friend_effect_level、character_masters に prefecture/limited 列、`friend_qr_reads`・`friend_effect_state`）。
- `POST /api/scan` は `prefectureCode`/`prefectureName` を受け取り prefecture 抽選を有効化。フレンド効果はサーバーが `friend_effect_state` から適用。
- `POST /api/friend-qr/scan`・`GET /api/friend-effect`（数値・secret を返さない）。

## テスト
- `server/tests/ratesFriend.test.ts`（基本確率・GPS無効時の再配分・Lv3上限・レベル単調増加・pickRarity が friend/variant/limited を出さない・フレンド効果レベル/連続日数）。
- `server/tests/friendQr.int.test.ts`（friendQRのみ friend 抽選・新規判定・履歴保存・効果更新・自己QR拒否・数値非表示）。
- `cd server && npm test` = 34 pass。
