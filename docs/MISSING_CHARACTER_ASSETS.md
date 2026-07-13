# Initial Release Missing Character Assets

> **解決済み（2026-07-14）**：本書の不足4体（White Tiger / Tsuchinoko / Yeti / Underground Dweller）は
> `assets/characters/ground/<英名>/<英名>.png` に 1024×1024 透過PNGが投入され、resolver で解決される。
> `npm run validate:release-assets` は **89/89/0（OK）**、`gen:catalog`/`gen:seed` は **89 buildable** を出力する。
> 以下は経緯の記録として保持する。Underground Dweller の外見は生成画像で確定した（旧「unresolved」は解消）。

調査日: 2026-07-11

## 判定根拠

- roster: `assets/characters/character_master.json`
- rarity / release status: `assets/characters/character-classification.json`
- resolver: `scripts/catalogBuild.js`
- 正規の新規配置: `assets/characters/<world>/<effective rarity>/<speciesEn>.png`
- 初期指定: `releaseStatus.byId > releaseStatus.worldDefault > future`
- `hasImage` は初期対象の決定に使用せず、初期対象を決めた後の欠損検証にのみ使用した。

現在の明示設定では `ground` と `sky` が `initial` である。canonical な初期指定は**89体**で、画像解決済み**85体**、欠損**4体**。

> 更新 2026-07-11：**hasImage による future 自動降格は廃止**。欠損4体は `releaseStatus=initial` のまま `missingInitialAssets` として検出され、`npm run validate:release-assets` が非0終了する（release gate）。`gen:catalog`/`gen:seed` は欠損時に既定で中止し、生成物を server/app 不一致に部分再生成しない。画像解決は**実効 rarity** フォルダで行うため、下表の期待パス（例 `ground/legendary/Tsuchinoko.png`）が正しく解決される（旧構造 `ground/<英名>/<英名>.png` も可）。

## 不足一覧

| id | 日本語名 | 英名 | world | effective rarity | canonical releaseStatus | expected path | current filename | resolver result | reason |
|---|---|---|---|---|---|---|---|---|---|
| `ground_rare_white_tiger` | 白虎 | White Tiger | ground | rare | initial | `assets/characters/ground/rare/White Tiger.png` | なし | `missingInitialAssets` | 解決可能なPNGなし |
| `ground_rare_tsuchinoko` | ツチノコ | Tsuchinoko | ground | legendary | initial | `assets/characters/ground/legendary/Tsuchinoko.png` | なし | `missingInitialAssets` | 解決可能なPNGなし |
| `ground_rare_yeti` | イエティ | Yeti | ground | legendary | initial | `assets/characters/ground/legendary/Yeti.png` | なし | `missingInitialAssets` | 解決可能なPNGなし |
| `ground_rare_underground_dweller` | 地底人 | Underground Dweller | ground | legendary | initial | `assets/characters/ground/legendary/Underground Dweller.png` | なし | `missingInitialAssets` | 解決可能なPNGなし。外見定義も未記載 |

## 集計

- 生成対象候補: 4体
- world別: ground 4体
- rarity別: rare 1体 / legendary 3体
- secret: 0体（通常一覧へ秘匿対象を出力していない）

## 生成可否

2026-07-11時点のローカル調査では、リポジトリ内にForge向けの手順と手動プロンプト補助はあるが、実行中のForge API、Stability Matrix / Forge本体、checkpoint、透過背景化workflowは確認できなかった。端末の表示アダプターは Intel UHD Graphics のみで、NVIDIA CUDA環境もない。このため画像は未生成であり、上記パスも作成していない。

再現可能な候補生成・背景除去・検証手順は `stable_diffusion/README.md` と `stable_diffusion/configs/initial_missing_characters.json` に定義した。CUDA対応GPU上で実行するまで、生成成功とは扱わない。

`Underground Dweller` はマスター、分類正本、ドキュメントのいずれにも種固有の身体特徴がない。最低3つの固有特徴を正本から決められないため、画像生成環境が利用可能になっても正式デザイン定義が追加されるまでは生成しない。
