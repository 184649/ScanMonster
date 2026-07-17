# Phase 1A.6 — STYLE 06 絞り込み画像の保存先

このディレクトリは、Phase 1A.6 で生成する **STYLE 06 の3方向絞り込み画像**の保存先です。

**現時点で画像は1枚も存在しません。** 空 PNG やプレースホルダー画像を置いてはいけません。
このファイルは、生成前のディレクトリを Git 管理下に保持するためだけに存在します。

## 予定ファイル

| ファイル | 内容 |
|---|---|
| `style_06_source.png` | 既存 STYLE 06 のコピー（比較元）。`_pilot/style-exploration/sheep/style_06_balanced_signature.png` から将来コピーする |
| `style_06a_friendly_enhanced.png` | 親しみ強化型（Friendly Enhanced） |
| `style_06b_sheep_identity_enhanced.png` | 羊らしさ強化型（Sheep Identity Enhanced） |
| `style_06c_balanced_final.png` | バランス完成型（Balanced Final） |
| `style_06_refinement_comparison.png` | 2列×2行の比較画像（SOURCE / 06A / 06B / 06C） |
| `refinement_notes.md` | 生成後の目視検証記録 |

## 生成手順

ChatGPT Work で以下のプロンプトを順に使用します。各ファイルの実行用プロンプトは、そのまま一括コピーできる1つの連続したコードブロックです。

1. [docs/phase1-style-prompts/phase1a6/01_style06_friendly_enhanced.md](../../../../../../docs/phase1-style-prompts/phase1a6/01_style06_friendly_enhanced.md)
2. [docs/phase1-style-prompts/phase1a6/02_style06_sheep_identity_enhanced.md](../../../../../../docs/phase1-style-prompts/phase1a6/02_style06_sheep_identity_enhanced.md)
3. [docs/phase1-style-prompts/phase1a6/03_style06_balanced_final.md](../../../../../../docs/phase1-style-prompts/phase1a6/03_style06_balanced_final.md)

工程の全体像は [docs/PHASE1A6_STYLE06_REFINEMENT.md](../../../../../../docs/PHASE1A6_STYLE06_REFINEMENT.md) を参照してください。

## 制約

- 3案は同一寸法（1254×1254）、同一背景（`#EEECE7` に近い明るいウォームグレーの単色）、同程度の構図で生成すること。
- 既存 STYLE 06（`_pilot/style-exploration/sheep/`）を削除・上書き・修正しないこと。比較元として保持する。
- ここに置く画像は**画風探索用パイロットであり、正式画像ではない**。
- 正式画像 `assets/characters/ground/Sheep/Sheep.png` を変更しないこと。
- 最終案の選択は**ユーザーが行う**。自動選定しないこと。
- main へマージしないこと。
