# キャラクターデータ監査（2026-07-11）

正本一元化にあたり、実コード・seed・generated catalog・アセットを実物確認した結果。

## 情報源（一元化前）

| 源 | 内容 | 件数 |
|---|---|---|
| server seed（手書き `seed.ts`） | 地上normal 8 / 地上rare fenrir 1 / 水rare kraken 1 | **10** |
| app catalog（`character_master.json` 由来） | 全ワールドの roster | **327** |
| アセット（hasImage解決） | 承認済み画像で解決できたキャラ | **約100→111** |

→ **server 10 vs catalog 327 の重大な乖離**（legendary解放の母集団判定を壊す）。

## 一元化後（正本→生成）

- `character_master.json`（327）＋ `rarity-overrides.json` を正本化。
- **server seed = 基本4ワールド ∩ hasImage ＝ 106体**：ground normal 69 / ground legendary 1（Fenrir）/ sky normal 15 / waterside normal 20 / waterside legendary 1（Kraken）。
- app catalog：normal 300 / rare 25 / **legendary 2（Fenrir, Kraken）** / images 111。

## ワールド別（manifest）

| world | normal | rare | 画像有(概算) | 備考 |
|---|---|---|---|---|
| ground | 69 | 5 | 69 | 画像充足。legendary=Fenrir(再分類) |
| waterside | 116 | 7 | 20 | 画像は20のみ。96 normal がアセット未投入 |
| sky | 15 | 0 | 15 | 画像充足 |
| bug | 100 | 2 | 0 | **画像0**＝初期リリース対象外（保留） |
| phantom | 0 | 11 | ? | 基本4外・全rare（空想寄り）＝将来ワールド |
| planet | 0 | 2 | ? | 基本4外＝将来ワールド |

## rarity 分類の問題

- **Fenrir（ground_rare_fenrir）**：空想生物なのに rare → **legendary へ修正**（`rarity-overrides.json`、id据え置き、アセットあり）。
- **Kraken（waterside_rare_kraken）**：同上 → **legendary へ修正**。
- **要ユーザー判断（未修正）**：phantom ワールドの全rare（11・幻獣系の可能性）、planet の rare（2）、waterside の rare に Sea Dragon / Megalodon 等がある場合の実在/空想判定。名前だけで自動判定せず、定義・素材確認のうえ分類を確定してほしい。

## アセット整合

- 構造：現状は旧構造 `ground/<英名>/<英名>.png`（generatorが後方互換で解決）。目標の `<world>/<rarity>/` へは**別工程で安全に移行**（今回は物理移動しない）。
- missing：manifestにあるが画像なし＝**227体（=327-100）**。うち基本4ワールドの normal は初期リリース保留。
- ゴミ/無関係ファイル（`assets/characters/` 直下・**削除せず候補として列挙**）：`Character.xlsx`、`~$Character.xlsx`、`ChatGPT Image 2026年... .png` 複数。→ 整理推奨（要承認）。

## ID / migration

- **ID 変更なし・破壊的 rename なし**。Fenrir/Kraken は id 据え置きで rarity のみ修正（id と rarity の不一致は既知の負債として明記）。
- 本番ユーザーデータは未存在（dev seed のみ）。character_masters は `db:seed` の ON CONFLICT UPDATE で rarity 更新されるため、**別途 migration は不要**。将来、本番 discovery_records が存在する状態で rarity を変える場合は影響評価が必要。

## ユーザー判断が必要な保留事項

1. **初期リリース母集団ルール**（基本4∩hasImage=106）の承認。
2. waterside の未投入 normal 96体・bug 100体の扱い（将来投入か、母集団から恒久除外か）。
3. phantom / planet ワールドの起動時期と rarity 再分類（幻獣→legendary 等）。
4. その他 fantasy-in-rare（Sea Dragon/Megalodon 等）の分類確定。
5. `assets/characters/` 直下のゴミファイル削除可否。

---

## 更新 2026-07-11（releaseStatus明示化＋全rare監査）

### 情報源の確定
- **真の編集原本＝Character.xlsx**（rarity=normal|rare のみ）。legendary/releaseStatus は表現不可。
- **分類・公開状態の正本＝character-classification.json**（`rarity_overrides` は廃止・統合）。

### releaseStatus 導入（hasImage 依存を廃止）
- server seed / app catalog はともに `releaseStatus==="initial"` から生成（hasImageは決定要因でなく検証項目）。
- 初期リリース＝**85体**：ground normal 69 / ground legendary 1(Fenrir) / sky normal 15。
- **art待ち保留(held)＝4体**（ground：White Tiger(rare)・Yeti/Tsuchinoko/Underground Dweller(legendary)。フォルダはあるが解決可能なPNGなし）。
- future：waterside(全)・bug(全)・phantom(全)・planet(全)。

### 全rare(27) rarity監査結果
**rare→legendary（明確な空想・神話・伝説上の存在／21体）**：
ground: Fenrir, Yeti, Tsuchinoko, Underground Dweller ／ waterside: Kraken, Sea Dragon(和名「海竜」=神話), Nessie, Merlion ／ bug: Phantom Insect, Kesaran Pasaran ／ phantom: Dragon, Phoenix, Sphinx, Fairy, Dwarf, Elf, Unicorn, Griffin, Pegasus, Ghost ／ planet: Alien。

**rare 維持（実在・絶滅・要判断／6体）**：
- White Tiger … 実在の白変種（leucistic）→ rare。※神話「白虎」と同名だが実在個体として rare 妥当（要確認）。
- Megalodon … 実在した絶滅生物 → rare（絶滅=legendaryにしない・§16）。
- Coelacanth … 実在（生きた化石）→ rare。
- Megamouth Shark … 実在の希少ザメ → rare。
- **Moai** … 実在の石像（生物でない）→ 便宜上rare維持だが**要判断**（分類自体が生物カテゴリと不整合）。
- **Robot** … 人工物（神話生物でない）→ rare維持だが**要判断**。

### ID / migration
ID変更なし。`ground_rare_yeti` 等、id に旧rarityを含むが**据え置き**（rarityのみ classification で修正）。本番ユーザーデータ未存在＋`db:seed` の ON CONFLICT UPDATE で反映されるため別途migration不要。公式番号連番はリセットしない。
