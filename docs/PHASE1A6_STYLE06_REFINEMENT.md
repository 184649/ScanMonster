# Phase 1A.6 — STYLE 06 の3方向絞り込み

## 目的

STYLE 06 の記憶点（角内側の負の空間／頬から胸への羊毛ライン）を保持したまま、**親しみ強化型・羊らしさ強化型・バランス完成型**の3方向を生成し、ユーザーが最終的な方向を判断できる状態を作る。

**Claude は3案を自動選定しない。Claude は画像を生成しない。** 生成は ChatGPT Work がリポジトリを直接参照して行う。

## 現在の STYLE 06 の長所

- 角の内側に特徴的な負の空間がある
- 頬から胸へつながる羊毛ラインがある
- STYLE 01〜05 とは異なるシルエット
- かわいさだけにも力強さだけにも偏っていない
- 遠目で認識しやすい
- 記憶点を装備や模様ではなく**身体形状**で作っている

## 現在の STYLE 06 の問題

- 家畜羊より野生羊、ムフロン、ヤギ寄りに見える
- 顔つきが厳しく、親しみが不足
- 羊毛量が少なく、滑らかな体表に見える
- 顔と脚の色が濃く、野性味が強い
- 角が角張り、人工的または硬質に見える
- 羊らしい柔らかさが不足
- コレクションキャラクターとしての愛着がまだ弱い

## 生成する3方向

| # | 方向 | 英語内部名 | 出力画像名 | プロンプト |
|---|---|---|---|---|
| 06A | 親しみ強化型 | Friendly Enhanced | `style_06a_friendly_enhanced.png` | [01_style06_friendly_enhanced.md](phase1-style-prompts/phase1a6/01_style06_friendly_enhanced.md) |
| 06B | 羊らしさ強化型 | Sheep Identity Enhanced | `style_06b_sheep_identity_enhanced.png` | [02_style06_sheep_identity_enhanced.md](phase1-style-prompts/phase1a6/02_style06_sheep_identity_enhanced.md) |
| 06C | バランス完成型 | Balanced Final | `style_06c_balanced_final.png` | [03_style06_balanced_final.md](phase1-style-prompts/phase1a6/03_style06_balanced_final.md) |

3案の担当領域は重複しない。06A は**顔の表情と親しみ**、06B は**家畜羊としての種の同定性**、06C は**比率・顔・羊毛・角の統合**を担当する。06C は 06A と 06B の単純平均ではない。

## 各方向で維持するもの

全3案で共通して維持する**記憶点**（どちらかが読めなくなった時点で不合格）：

1. 左右の角の内側に、遠目でも読める特徴的な負の空間
2. 頬から胸へ斜めにつながる一本の明快な羊毛ライン

| 方向 | 上記に加えて維持するもの |
|---|---|
| 06A | STYLE 06 に近い全体シルエット／堂々とした立ち姿／normal としての明快さ |
| 06B | STYLE 06 固有の記憶しやすい外周／写実へ戻らない大きな色面／normal としての明快さ |
| 06C | STYLE 06 の明快なシルエット／かわいさと力強さの中間／装備なしで記憶に残る造形／normal としての親しみやすさ |

## 各方向で変更するもの

| 方向 | 主な変更 |
|---|---|
| 06A | 目を細すぎない自然な形へ／まぶたを柔らかく／目尻の吊り上がりを弱める／顔を少し短く幅を持たせる／鼻先をヤギ状にしない／口元を穏やかに（笑顔にはしない）／顔と脚の濃色コントラストを弱める／頭部を現実比 +20〜25%／脚を現実比 −10%（短足にしない）／羊毛を少し増やし頬・胸・腰へ柔らかな房を追加／角を少し丸みのある面へ |
| 06B | 家畜羊らしい幅のある頭部／ヤギ寄りの細長い鼻先を避ける／横長瞳孔を明確に／耳を家畜羊らしい自然な横向きへ／顔と脚の濃色を少し明るく／首・胸・胴・腰の羊毛量を増やす／細かな巻き毛ではなく大きな柔らかな房／胸から胴へ羊毛の厚みを連続／胴体は横長だが細長くしすぎない／脚に自然な太さ／角の硬い骨格感を弱める／角の面を滑らかな2〜4面へ |
| 06C | 頭部 +20%（01・04 より小さく、03・05 より大きい）／胴体は適度にコンパクト／脚 −8〜10%／胸は自然な範囲で少し広い／肩は筋肉質にしない／顔は羊らしい長さと幅を両立／角は存在感があるが全身を圧倒しない／部位ごとに房の大きさと向きを変える／角は2〜4面、左右を機械的完全対称にしない（解剖異常にはしない） |

## 画像の保存先

```
assets/characters/_pilot/style-refinement/sheep/phase1a6/
├── style_06_source.png                   ← 既存 STYLE 06 のコピー（比較元）
├── style_06a_friendly_enhanced.png
├── style_06b_sheep_identity_enhanced.png
├── style_06c_balanced_final.png
├── style_06_refinement_comparison.png
└── refinement_notes.md
```

比較元 `style_06_source.png` は、既存の `assets/characters/_pilot/style-exploration/sheep/style_06_balanced_signature.png` を将来コピーしたもの。**Phase 1A.6 ではコピーしていない。**

**空 PNG やプレースホルダー画像を作成してはいけない。**

## 生成時の条件

- **3案は同一寸法（1254×1254）、同一背景（`#EEECE7` に近い明るいウォームグレーの単色）、同程度の構図（カメラ距離・画面占有率）で生成すること。** 揃っていないと比較にならない。
- **既存 STYLE 06 を比較元として残すこと。** `style-exploration/sheep/` 配下の既存画像を削除・上書き・修正してはいけない。
- 各プロンプトは、リポジトリ内の STYLE 06 を直接参照させたうえで、**編集・トレースではなく新規描画**として生成させる。

## 比較画像

3案が揃った後に、**2列×2行**で作成する。

| | 左 | 右 |
|---|---|---|
| **上段** | **SOURCE** — 現在の STYLE 06 | **06A** — 親しみ強化型 |
| **下段** | **06B** — 羊らしさ強化型 | **06C** — バランス完成型 |

保存先：`assets/characters/_pilot/style-refinement/sheep/phase1a6/style_06_refinement_comparison.png`

**比較画像は ChatGPT Work で生成画像が揃った後に作成する。Phase 1A.6 では作成しない。**

## 判断と昇格のルール

- **Claude は最終案を自動選定しない。**
- **ユーザーが SOURCE / 06A / 06B / 06C を比較して判断する。**
- 3案はいずれも**正式画像へ昇格しない**。
- **main へマージしない。**
- **正式 `assets/characters/ground/Sheep/Sheep.png` を変更しない。**

## 本工程が変更しないもの

正式画像、既存 STYLE 01〜06 画像、`Character.xlsx`、`character_master.json`、`character-classification.json`、`characterCatalog.generated.ts`、`characterImages.generated.ts`、`characterSeed.generated.ts`、初期89件、既存461 ID、rarity、releaseStatus、公式番号、発見履歴、発見証明、DB、UI、依存関係、`package-lock.json`、`.gitattributes`。
