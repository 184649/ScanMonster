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
