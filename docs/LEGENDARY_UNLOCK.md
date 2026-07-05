# 伝説キャラ解放（LEGENDARY UNLOCK）

段3で追加。希少度は **normal > rare > legendary > secret** の4段階。

## 解放条件

- **そのワールドの normal キャラを全発見**すること。
- **rare のコンプリートは不要**。判定対象は `normal` のみ。
- **ワールドごとに独立**（地上をコンプリートしても水ワールドの伝説は未解放）。
- `normalTotal > 0 かつ normalDiscovered >= normalTotal` で解放（[legendaryUnlock.core.ts](../server/src/legendaryUnlock.core.ts)）。
- 真実の根拠は `character_records` から再計算可能。到達時刻のみ `user_world_legendary`（[migration 0005](../server/db/migrations/0005_legendary_unlock.sql)）に一度だけ記録し、解放演出のトリガに使う。

## 未解放時は存在を一切示唆しない（最重要 §4）

条件達成前は、そのワールドに伝説キャラが**存在しないように見せる**。以下を出さない：

- 「伝説」「legendary」の文言 / 伝説カテゴリ・タブ / 未発見シルエット・???枠
- 伝説キャラの総数・進捗（進捗バーにも含めない）
- 「まだ何かいる」「コンプリートで何か起こる」等のヒント・解放条件の事前表示
- **APIレスポンスから未解放伝説の件数・存在が推測できる情報**
  - `/api/dex` は未解放ユーザーに legendary 行を返さない（[routes.ts](../server/src/routes.ts) の dex ゲート）。

## 条件達成時に初めて示唆（§5）

そのワールドの normal を**新規で最後の1体**発見した瞬間だけ、`discoveryRecord.legendaryUnlockedNow = <worldGroup>` を返す（[scanService.finalizeDiscovery](../server/src/scanService.ts)）。これを解放演出のトリガにする。解放後は伝説カテゴリ・未発見シルエット・抽選対象化を解禁してよい。

## 出現確率（フレンド補正は解放後のみ・最大10%）

| 状態 | legendary率 |
|---|---|
| 未解放 | **常に0%**（フレンド100人でも0%） |
| 解放・0人 | 1.0% |
| 解放・10人 | 1.9% |
| 解放・50人 | 5.5% |
| 解放・100人 | **10.0%（上限）** |

`legendaryRate = min(0.10, 0.01 + min(friendCountToday,100) * 0.0009)`（解放済みのワールドが1つ以上あるときのみ適用）。増分は normal から差し引き、合計は常に1.0（[friendDaily.core.scanDistribution](../server/src/friendDaily.core.ts)）。
