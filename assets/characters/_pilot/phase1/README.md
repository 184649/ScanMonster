# Phase 1 パイロット画像置き場（正式アセットではない）

このフォルダは **Phase 1A の実在生物図鑑イラスト・パイロット（5種）** の一時保存場所です。

## ⚠️ ここにある画像は正式アセットではありません

- **catalog（`src/data/characterCatalog.generated.ts`）へ登録しない**
- **画像 manifest（`src/assets/characterImages.generated.ts`）へ登録しない**
- **server seed（`server/src/characterSeed.generated.ts`）へ登録しない**
- **`validate:release-assets` の正式画像判定へ使用しない**
- **`selected/` へ入っただけでは正式採用ではない**
- **正式採用には昇格手順が必要** → `docs/PHASE1_ASSET_PROMOTION.md`

`assets/characters/<world>/<英名>/<英名>.png` が正式アセットのパスであり、
このフォルダ（`_pilot/`）は先頭のアンダースコアで**正式 world ではない**ことを示しています。
`scripts/catalogBuild.js` は master（Character.xlsx 由来）に登録された world/英名 からのみ画像を解決するため、
このフォルダの画像が誤って正式生成物へ入ることはありません（回帰テストで固定しています）。

## 構造

```
assets/characters/_pilot/phase1/
  <character-id>/
    candidates/   … ChatGPT Work で生成した候補画像を置く
    selected/     … 88点以上かつ automaticReject=false の採用候補を置く
    reports/      … evaluation.json（視覚評価レポート）を置く
```

対象5種：`ground_sheep` / `ground_elephant` / `ground_deer` / `ground_chameleon` / `ground_hedgehog`

## 使い方

1. `docs/legacy-character-prompts/phase1-pilot-prompts/0X_<id>.md` のプロンプトを ChatGPT Work へ貼り付けて画像を生成する
2. 生成画像を `<character-id>/candidates/` へ置く（例：`candidate_01.png`）
3. `<character-id>/reports/evaluation.json` に視覚評価を記録する（形式は `docs/PHASE1_ASSET_PROMOTION.md`）
4. **合計88点以上**かつ **automaticReject=false** の1枚を `<character-id>/selected/` へ置く
5. `assets/characters/phase1-pilot.json` の該当エントリーの `selectedCandidate` にそのパスを記入する
6. `npm run validate:phase1-pilot` で技術検証する（**技術検証の合格＝品質合格ではない**）
7. 5種そろったら**並べて統一評価**する。1種だけ画風が外れている場合は**その1種だけ再生成**する
8. 正式採用は `docs/PHASE1_ASSET_PROMOTION.md` の昇格手順に従う（**Phase 1A では実施しない**）

## Sheep について

`ground_sheep` の正式画像 `assets/characters/ground/Sheep/Sheep.png` は**現在破損しています**（IEND欠損）。
Git 全履歴を探索しましたが**同一原画の正常版は存在しません**（過去版は別デザインの羊）。
そのため `validate:release-assets` は**失敗したまま**であり、**リリース不可**です。
新しい正式 Sheep 画像は本パイロットの結果をもとに **Phase 1B** で制作します。
**Phase 1A では正式 Sheep.png を変更しません。**
