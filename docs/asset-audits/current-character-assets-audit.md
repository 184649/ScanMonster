# 現行正式キャラクター画像の実測監査

> **これは v6 採用画像の監査ではありません。**
> 現在このリポジトリに存在する正式画像を、技術情報だけ実測した結果です。
> 画風の採否・v6 適合性は判定していません。**画像本体は変更していません（読み取り専用）。**

監査日: 2026-07-20　／　対象 5 件

結果: **PASS 4** / PASS_WITH_WARNINGS 0 / **FAIL 1**

## 一覧

| id | キャラ名 | モデル生物 | 寸法 | mode | IEND | alphaMin | 完全透明 | 半透明 | 判定 |
|---|---|---|---|---|---|---|---|---|---|
| `ground_sheep` | ツノヒツジ | 羊 / Sheep | 1024×1024 | RGBA | **無** | — | — | — | **FAIL** |
| `ground_gorilla` | ゴリマル | ゴリラ / Gorilla | 1024×1024 | RGBA | 有 | 0 | 547,225 | 9,952 | **PASS** |
| `ground_elephant` | ゾウノコ | ゾウ / Elephant | 1024×1024 | RGBA | 有 | 0 | 529,630 | 9,947 | **PASS** |
| `ground_gecko` | ヤモリン | ヤモリ / Gecko | 1024×1024 | RGBA | 有 | 0 | 693,886 | 11,456 | **PASS** |
| `ground_mole` | モグリット | モグラ / Mole | 1024×1024 | RGBA | 有 | 0 | 618,315 | 8,398 | **PASS** |

## 明細

### ツノヒツジ（`ground_sheep`）— FAIL

- 正式パス: `assets/characters/ground/Sheep/Sheep.png`
- SHA-256: `1ea48f9b644c5b53fa7cb445517bb6fff3a60eddfd27886bf7aeedc7fff672e2`
- ファイルサイズ: 787,456 バイト
- 寸法 / colorType / mode: 1024×1024 / 6 / RGBA
- PNG decode: **無**　IEND: **無**
- alphaMin / alphaMax: — / —
- 透明画素: 合計 —（完全透明 — / 半透明 —）／不透明 —
- 背景・見切れの疑い: **なし**
- **確定エラー**:
  - IEND チャンクが無い（ファイルが途中で切れている）
  - 画素デコードに失敗: unexpected end of file

### ゴリマル（`ground_gorilla`）— PASS

- 正式パス: `assets/characters/ground/Gorilla/Gorilla.png`
- SHA-256: `d0955f42aab79f4e560286a4e62f59175a58b4008057ae351ed6530e0b335c54`
- ファイルサイズ: 743,313 バイト
- 寸法 / colorType / mode: 1024×1024 / 6 / RGBA
- PNG decode: 有　IEND: 有
- alphaMin / alphaMax: 0 / 255
- 透明画素: 合計 557,177（完全透明 547,225 / 半透明 9,952）／不透明 491,399
- 四隅 RGBA: (0,0,0,0) (0,0,0,0) (0,0,0,0) (0,0,0,0)
- 背景・見切れの疑い: **なし**

### ゾウノコ（`ground_elephant`）— PASS

- 正式パス: `assets/characters/ground/Elephant/Elephant.png`
- SHA-256: `df7d27f73e22da2c68f4deb55d1bd65c5b2a3df9a393c09bb2196f1fc77a4c29`
- ファイルサイズ: 868,099 バイト
- 寸法 / colorType / mode: 1024×1024 / 6 / RGBA
- PNG decode: 有　IEND: 有
- alphaMin / alphaMax: 0 / 255
- 透明画素: 合計 539,577（完全透明 529,630 / 半透明 9,947）／不透明 508,999
- 四隅 RGBA: (0,0,0,0) (0,0,0,0) (0,0,0,0) (0,0,0,0)
- 背景・見切れの疑い: **なし**

### ヤモリン（`ground_gecko`）— PASS

- 正式パス: `assets/characters/ground/Gecko/Gecko.png`
- SHA-256: `ae11faba45bc4f958a8b1e58e662442e5bb30315a262348c74f691782334de0d`
- ファイルサイズ: 669,818 バイト
- 寸法 / colorType / mode: 1024×1024 / 6 / RGBA
- PNG decode: 有　IEND: 有
- alphaMin / alphaMax: 0 / 255
- 透明画素: 合計 705,342（完全透明 693,886 / 半透明 11,456）／不透明 343,234
- 四隅 RGBA: (0,0,0,0) (0,0,0,0) (0,0,0,0) (0,0,0,0)
- 背景・見切れの疑い: **なし**

### モグリット（`ground_mole`）— PASS

- 正式パス: `assets/characters/ground/Mole/Mole.png`
- SHA-256: `8df1eb74e16648038da9947e7ee95a6bcdd27b8e903fe1b85796c33ed42c83a2`
- ファイルサイズ: 683,652 バイト
- 寸法 / colorType / mode: 1024×1024 / 6 / RGBA
- PNG decode: 有　IEND: 有
- alphaMin / alphaMax: 0 / 255
- 透明画素: 合計 626,713（完全透明 618,315 / 半透明 8,398）／不透明 421,863
- 四隅 RGBA: (0,0,0,0) (0,0,0,0) (0,0,0,0) (0,0,0,0)
- 背景・見切れの疑い: **なし**

## 判定の定義

- **PASS**: 確定エラー・警告ともになし
- **PASS_WITH_WARNINGS**: 確定エラーなし。警告のみ（警告だけで FAIL にはしない）
- **FAIL**: 確定エラーあり（decode 失敗／寸法不一致／IEND 欠落／完全不透明／透明画素0／名前・パス不一致など）

しきい値は `scripts/pngInspect.js` の `PNG_ANALYSIS_THRESHOLDS` に名称付き定数として定義しています。

