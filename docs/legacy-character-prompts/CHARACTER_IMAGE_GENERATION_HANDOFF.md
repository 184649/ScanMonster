# キャラクター画像生成 引き継ぎ（Codex / 画像生成工程）

> **完了（2026-07-14）**：本書の対象4体は画像投入済み。初期リリース89体は **89/89/0（欠損0）** で完成状態。
> `validate:release-assets`=OK、`gen:catalog`/`gen:seed`=89 buildable、`characterMasterParity.test.ts` は 89/89/0 に更新済み。
> 以下は経緯の記録として保持する。

初期リリース（89体）のうち、かつて **4体が画像未投入**だった。現在はすべて生成・配置済み。

## 対象4体

| # | id | 日本語名 | 英名(speciesEn) | world | rarity | releaseStatus | 正規保存パス（推奨） | 代替パス | designStatus |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `ground_rare_white_tiger` | 白虎 | White Tiger | ground | **rare** | initial | `assets/characters/ground/rare/White Tiger.png` | `assets/characters/ground/White Tiger/White Tiger.png` | 実在の白変種トラ（leucistic）。神話「白虎」ではない |
| 2 | `ground_rare_tsuchinoko` | ツチノコ | Tsuchinoko | ground | **legendary** | initial | `assets/characters/ground/legendary/Tsuchinoko.png` | `assets/characters/ground/Tsuchinoko/Tsuchinoko.png` | 日本のUMA。太く短い蛇状 |
| 3 | `ground_rare_yeti` | イエティ | Yeti | ground | **legendary** | initial | `assets/characters/ground/legendary/Yeti.png` | `assets/characters/ground/Yeti/Yeti.png` | 雪男・UMA。白い毛の類人猿型 |
| 4 | `ground_rare_underground_dweller` | 地底人 | Underground Dweller | ground | **legendary** | initial | `assets/characters/ground/legendary/Underground Dweller.png` | `assets/characters/ground/Underground Dweller/Underground Dweller.png` | **designStatus = unresolved（外見・特徴が正本に未定義。生成前に人間がデザイン方針を確定する）** |

- rarity は id の接尾辞ではなく **`character-classification.json` の実効 rarity** が正。id `ground_rare_*` は据え置き（rarityと不一致だが安全のため変更しない）。
- 正規保存パスは **実効 rarity フォルダ**（resolver は effRarity で解決）。代替の旧構造フォルダは既に空フォルダが存在する。

## 正本・resolver（Codexが読むべきファイル）

- roster（原本）: `assets/characters/Character.xlsx` → `assets/characters/character_master.json`（生成物・手編集禁止）
- 分類/公開状態（正本レイヤ）: `assets/characters/character-classification.json`
- 画像解決: `scripts/catalogBuild.js`（`findImageFor`：①`<world>/<英名>/<英名>.png` ②`<world>/<effRarity>/<英名>.png` ③再帰）
- 生成: `scripts/generateCharacterData.js`（app catalog）/ `scripts/generateServerSeed.js`（server seed）
- 検証: `scripts/validateReleaseAssets.js`

## 画像仕様（既存キャラと揃える）

- 1024×1024・**透過背景PNG**・全身・中央・単体・背景/地面/草/岩なし。
- 元生物が一目で分かる／性格を感じる／量産マスコットにしない（[CHARACTER_DESIGN_GUIDE.md](CHARACTER_DESIGN_GUIDE.md)）。
- 参考に見る既存の近縁：ground の実在動物（Fenrir=既存legendaryの作風）。

## ファイル名の注意

- 空白を含む：`White Tiger.png` / `Underground Dweller.png`。resolver は `normImageKey`（英数字のみに正規化）で一致させるため空白可。Metro の静的 require も空白文字列パスで生成される（既存に空白名あり）。
- 大文字小文字：resolver は case を無視して照合（normImageKey）。ただし**ファイル名は speciesEn と同一表記を推奨**（`White Tiger.png`）。

## 配置後の手順

1. 4画像を上表の正規パスへ配置。
2. `npm run validate:release-assets` … `missing 0 / OK` になることを確認（現状は 4 で FAILED）。
3. `npm run gen:catalog && npm run gen:seed` … 89体の同一集合から server seed / app catalog / image を一括再生成（欠損が無ければ中止しない）。
4. `npm test`（app）/ server `node --test`（含む groundGoldenPath）/ `npm run typecheck` / `expo export` を再実行。
5. `characterMasterParity.test.ts` の 89/85/4 を更新（missing 0・buildable 89）。

## デザイン未確定（人間判断待ち）

- **Underground Dweller**：外見・性格・固有特徴が正本に無い。ゴブリン/ゾンビ/青白い肌/大きな目 等を**勝手に確定しない**。生成前に正本（classification か専用 design note）へ最低3つの固有特徴を追記してから生成すること。
