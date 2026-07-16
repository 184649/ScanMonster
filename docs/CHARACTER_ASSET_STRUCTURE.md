# キャラクターアセット構成（CHARACTER ASSET STRUCTURE）

## 正式構造（段3）

ワールドごとに、希少度を明確に分離する。

```
assets/
  characters/
    <world>/
      normal/
      rare/
      legendary/
```

例：

```
assets/characters/
  ground/
    normal/    dog.png, cat.png, elephant.png, ...
    rare/      albino_crow.png, white_deer.png, ...
    legendary/ dragon.png, griffin.png
  water/
    normal/    dolphin.png, shark.png
    rare/      albino_whale.png
    legendary/ kraken.png, leviathan.png
```

- ワールド直下に全キャラを混在させない。必ず `normal / rare / legendary` の3階層を基本とする。
- **rare は実在の希少生物・特異個体**（アルビノ／白変種／珍しい体色・模様／深海・発光生物など）。空想生物ではない。
- **legendary は空想生物**（ドラゴン／フェニックス／ユニコーン等）。

## secret のアセット

通常UIから秘匿するため、`normal/rare/legendary` とは分け、専用フォルダに置くことを推奨：

```
assets/characters/<world>/_secret/   （または characters/_secret/）
```

- UIカタログ生成・asset manifest・図鑑一覧・bundle・デバッグ画面から**存在・件数・名前が漏れない**ようにする。
- 未発見ユーザーへ secret の件数/名前を返さない（サーバー `/api/dex` は未発見 secret を返さない）。

## ジェネレータ対応（[scripts/generateCharacterData.js](../scripts/generateCharacterData.js)）

- rarity は `character_master.json`（Character.xlsx 由来）の `rarity` 列で決定：`normal | rare | legendary`。
- 画像解決は次の順で探索（後方互換）：
  1. `<world>/<英名>/<英名>.png`（従来）
  2. `<world>/<rarity>/<英名>.png`（新・フラット配置）
  3. `<world>/**/<英名>/*.png`（再帰。`<world>/<rarity>/<英名>/<英名>.png` もここで解決）
- 出力に `CATALOG_LEGENDARIES` を追加（`CATALOG_CHARACTERS`=normal, `CATALOG_RARES`=rare）。

## 運用と注意（過去の実障害）

- 画像の**追加・改名のたびに `npm run gen:catalog` を実行**（生成物のみ更新、元画像は非変更）。
- 過去に `Raccoon Dog/Tanuki.png → Raccoon Dog.png` の改名で manifest が stale になり export が壊れた実績あり。
- チェック観点：**大文字小文字 / スペース / Windows・Linux差異 / ファイル名とmaster IDの不一致 / manifest stale**。
- ⚠️ 物理的なフォルダ移動（既存 `<world>/<英名>/` → `<world>/<rarity>/`）は**アセット管理者（あなた）が実施**。ツール側では自動移動しない（過去に画像消失事故があったため）。ジェネレータは上記のとおり新旧どちらの構成でも解決できる。

## Phase 0.5 追記（2026-07-14）：画像健全性と Sheep.png の現状

- **release gate が PNG 健全性を検査する**：`npm run validate:release-assets` は initial 原画の **IEND チャンク欠損（＝ファイル末尾の切断）** を検出し、1件でもあれば**非0終了**する。破損原画はサムネイル生成に失敗し、原画とサムネイルのキー集合が一致しなくなるため。
- **`assets/characters/ground/Sheep/Sheep.png` は破損中（未復元）**
  - 787,456 bytes ／ PNGシグネチャ・IHDR は正常 ／ 1024×1024 ／ RGBA(colorType 6) ／ 非インターレース
  - IDAT 25個の後で**切断され IEND が無い**。デコード不可（jimp: `There are some read requests waitng on finished stream`）
  - **Git 全履歴・old/・dangling object・ビルド成果物・キャッシュを探索したが、同一原画の正常版は存在しない**。過去版2種はいずれも**別デザインの羊**（魔法使い風／鈴の首輪）で、現行デザインとは異なるため採用不可。既存サムネイルは旧デザインのもので、拡大による原画化は禁止。
  - → **新しい正式 Sheep 原画（1024×1024・透過PNG）の再出力が必要**。同名・同パスへ置いて `npm run gen:catalog` を再実行すると 89/89 で一致する。
  - 現状：原画 manifest **89** ／ サムネイル manifest **88**（`ground_sheep` のみ欠落）。**手動で manifest へ追加してはいけない**（release gate が実ファイルを検査するため通過できない）。
- 実測メモ：原画は 1024×1024 が基本だが、**sky の一部（Crow / Eagle / Ostrich / Owl / Sparrow）は 512×512** で制作されている（破損ではない）。

## Phase 0.75 追記（2026-07-14）：Sheep.png は変更していない

- Phase 0.75 では **Sheep.png を一切変更していない**（HEAD とバイト単位で同一であることを確認済み）。
- 状態は Phase 0.5 から不変：**原画 manifest 89 / サムネイル manifest 88**（`ground_sheep` のみ欠落）、**破損原画 1件**。
- **`npm run validate:release-assets` は失敗（非0終了）のまま**。この状態は**リリース不可**。
- 新しい正式 Sheep 原画は **Phase 1** で実在生物のプレミアム図鑑イラストとして別途制作する。
