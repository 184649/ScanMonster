# 旧キャラクター版 設計・プロンプト資産（legacy・凍結保存）

WORLDAWN が図鑑特化版へ移行する前の、**キャラクター・マスコット調**の設計とプロンプト一式。

**削除・上書きしない。図鑑特化版の正式画像へ流用しない。**

## 保存されているもの

| ファイル | 内容 |
|---|---|
| `CHARACTER_DESIGN_GUIDE.md` | 旧キャラクターデザイン方針 |
| `CHARACTER_IMAGE_GENERATION_HANDOFF.md` | 旧画像生成の受け渡し手順 |
| `PHASE1_REAL_CREATURE_ART_PROMPT.md` | Phase 1A のアートバイブル＋マスタープロンプト |
| `phase1-pilot-prompts/` | Phase 1A パイロット5種の個別プロンプト |

## 別ブランチに保存されているもの

Phase 1A.5 / 1A.6 の羊の画風探索（STYLE 01〜06、比較画像、STYLE 06 絞り込みプロンプト）は
**ブランチ `art/sheep-style-exploration` にそのまま凍結保存**されている。

- ブランチ：`art/sheep-style-exploration`（最新 `9a7b8bd`）
- 画像：`assets/characters/_pilot/style-exploration/sheep/`（7枚）
- プロンプト：`docs/phase1-style-prompts/`、`docs/PHASE1A6_STYLE06_REFINEMENT.md`

**Phase 1A.6 は停止済み。** 06A / 06B / 06C の追加生成は行わない。
main へマージせず、図鑑特化版の自然史イラストへ流用しない。旧キャラクター版の研究資産として保持する。

## 旧画像

`assets/characters/` 配下の全画像（初期89件を含む）は**そのまま保持**する。

図鑑特化版の新しい自然史イラストは `assets/encyclopedia/` へ分離して保存し、混在させない。

| | 旧（legacy） | 新（図鑑特化版） |
|---|---|---|
| 画像 | `assets/characters/` | `assets/encyclopedia/` |
| プロンプト | `docs/legacy-character-prompts/` | `docs/encyclopedia-prompts/` |
| 検査 | `npm run validate:release-assets` | `npm run validate:encyclopedia` |

旧画像には 512×512・パレット形式のものや破損ファイル（`ground/Sheep/Sheep.png`）が含まれるが、
**新基準（1024×1024・真の透明画素）は新画像にのみ適用**し、旧アセットを新基準で不合格にしない。

## 参考資料の扱い

`WORLDAWN_Encyclopedia_Redesign_v1.xlsx`（ユーザー提供）は、図鑑ページ構成・生物カタログ項目・
科学情報管理・MVP計画の**参考資料**として利用する。ただし以下の方針は**不採用**：

- rarity の廃止
- ガチャ・抽選の廃止
- SECRET の本編からの分離
- phantom / planet の別ブランドへの強制分離
- 既存ゲームループの全面置換

正本は `WORLDAWN_図鑑特化版_改修プロンプト集.md` と `Claude用_WORLDAWN図鑑特化版_改修プロンプト.md`。
