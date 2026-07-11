# データ引き継ぎ（DATA_TRANSFER）

Phase 9。ログインUIなし・1端末=1匿名アカウント。引き継ぎは**同一 user_id の移譲**。

## 仕組み

```
旧端末： POST /api/transfer/create → 一時・単回・期限付きの引き継ぎコード
新端末： コード入力 → POST /api/transfer/redeem → { userId, token }
          → 同じ user_id を取り戻し、新しい Bearer トークンで認証
```

- 引き継ぎは**データのコピーではなく識別子（user_id）の移譲**。サーバーの全データは user_id をキーに保存されているため、移譲＝全データがそのまま新端末のものになる。
- redeem は**新端末用の Bearer トークンを新規発行**（旧端末のトークンは共有しない）。
- コードは**単回使用・期限付き**（既定30日）。使用済み/期限切れは拒否。総当たりは IP レート制限（Phase 3）。

## 何が移るか（検証済み・[transferComplete.int.test.ts](../server/tests/transferComplete.int.test.ts)）

**サーバー側は user_id に紐づくため完全に移譲される（＝失われない）**：

| データ | 保存先 | 移譲 |
|---|---|---|
| userId / 認証状態 | users / auth_tokens | ✅（新トークン発行） |
| 発見記録・発見証明（初回/最新/代表） | discovery_records | ✅ |
| 公式発見番号との紐づき・番号価値・特殊番号(例 No.777) | discovery_records | ✅ |
| キャラ記録・称号・activeTitle・最強の証 | character_records | ✅ |
| 採番カウンター | discovery_counters（全ユーザー共通） | ✅（グローバル） |
| DP残高・DP履歴 | user_dp / dp_transactions | ✅（新端末は `GET /api/dp` で取得可能） |
| ワールド解放・ブースト | user_world_unlocks / user_boosts | ✅（`GET /api/world-unlocks` で取得可能） |
| フレンド交流履歴・新規/既存判定 | friend_qr_reads | ✅ |
| legendary解放 | user_world_legendary | ✅ |
| 発見ログ・カレンダー・番号コレクション | discovery_records から集計 | ✅ |
| 要望掲示板の自分の投稿 | feature_requests（user_id） | ✅ |

上記は統合テストで「引き継ぎ後も全テーブルが同一 user_id で健在」「新トークンで認証」「新端末が DP・解放・発見ログを取得可能」「コード単回・期限切れ不可」を検証済み。

## 現時点の制約（正直な明記）

- **アプリの新端末側の自動復元は、現状 `discoveries` の同期のみ**（[authStore.syncFromServer](../src/stores/authStore.ts) は `GET /api/discoveries` のみ呼ぶ）。DP・ワールド解放は**サーバーには在るが、アプリが自動で取り込む配線は未実装**（読み取り用 `GET /api/dp` / `GET /api/world-unlocks` は今回追加。取り込み処理は今後）。
- **お気に入り・キャラメモはローカル専用**（AsyncStorage・サーバー未送信）。現状サーバーに保存していないため、サーバー経由の引き継ぎ対象外。完全移行にはサーバー永続化が必要（今後）。
- **legendary解放の演出表示済みフラグ**は端末ローカル（[legendaryReveal.ts](../src/services/legendaryReveal.ts)）。引き継ぎ後の新端末では未表示扱いになり得る（解放状態自体はサーバーにあるため、演出が再度出るだけで実害は小さい）。

## 残作業（完全化のための推奨）
1. `syncFromServer` を拡張し、`GET /api/dp` / `GET /api/world-unlocks` を取り込みローカル economy に反映。
2. お気に入り・キャラメモをサーバー永続化（新テーブル＋GET/PUT）し引き継ぎ対象に含める。
3. 引き継ぎ完了後に旧端末トークンを失効させる運用（現状はトークン行削除で無効化可能）。
