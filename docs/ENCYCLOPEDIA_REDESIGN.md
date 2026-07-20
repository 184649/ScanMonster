# WORLDAWN 図鑑特化版 設計

## 1. 何を変え、何を変えないか

**変更の中心は「絵と図鑑情報」だけ。ゲーム構造は現状維持。**

| 変える | 変えない |
|---|---|
| キャラクター・マスコット調 → 自然史図鑑向けのリアルなイラスト | 探索・発見・抽選・収集・図鑑完成のループ |
| 図鑑詳細に生物情報・出典を表示 | 出現確率・抽選重み・乱数ロジック |
| 「キャラクター」表記 → 「生きもの」「図鑑」 | レアリティの実行値（`rarity`）と抽選での参照 |
| 実在/絶滅/空想の説明を明確に区別 | LEGEND のワールド完成による解放条件 |
| 新画像に 1024×1024・真の透明背景を要求 | 既存ユーザーの解放状態・発見記録 |

## 2. レアリティと図鑑分類

### 意味の整理

| 分類 | 対象 |
|---|---|
| NORMAL | 現生生物の通常個体・通常形態 |
| RARE | アルビノ、白変種、黒化個体など**実在が確認された**希少形態 |
| LEGEND | 絶滅した実在生物 |
| SECRET | 神話・伝承・空想・SF上の生物 |

保全状況（絶滅危惧種かどうか）は**レアリティとは無関係**の別情報として扱う。

### 実装：抽選用 `rarity` と図鑑用 `dexClass` を分ける

既存データを新定義へ機械的に当てはめると、`rarity` の中身がほぼ総入れ替えになり、
カテゴリ内件数が変わって**1種あたりの実効出現確率が変わってしまう**。
LEGEND 解放の母数（そのワールドの normal 件数）も動き、既存ユーザーの解放状態が退行しうる。

そこで**最小の変更**として：

- **抽選・確率・解放条件は従来どおり `rarity` を参照し続ける**（値を1件も変更しない）
- **図鑑の表示・説明だけが `dexClass` を参照する**

`dexClass` は `assets/characters/character-classification.json` の1キーとして追加した。
既定は `rarity` から導出（normal→NORMAL / rare→RARE / legendary→LEGEND / secret→SECRET）し、
実体と一致しないものだけ `byId` で上書きする（34件）。

**DBマイグレーションは追加していない。** `dexClass` はアプリ側カタログにのみ載せ、
サーバの `characterSeed.generated.ts` は完全に不変（差分ゼロ）。

### 全461件の内訳

| dexClass | 件数 | 主な内訳 |
|---|---|---|
| NORMAL | 436 | 現生生物。`rarity=rare` のまま図鑑上 NORMAL にした10件（絶滅危惧種7＋現生3）を含む |
| RARE | 1 | White Tiger（白変種） |
| LEGEND | 1 | Megalodon（絶滅生物） |
| SECRET | 23 | 旧 legendary 21件（Fenrir / Yeti / Kraken / Nessie / phantom 11 / planet 2 等）＋空想の虫2件 |

### 意図的に許容している乖離

`rarity=rare` だが `dexClass=NORMAL` の10件（Saola、Iberian Lynx、Vaquita、Axolotl、Coelacanth、
Megamouth Shark、Kakapo、トキ、Lord Howe島ナナフシ、アレクサンドラトリバネアゲハ）は、
**図鑑上は現生の通常種、抽選上は rare プール**という状態にある。

新定義は「絶滅危惧種だけを理由にRAREにしない」と明記しているため図鑑分類は NORMAL が正しいが、
`rarity` を normal へ移すと rare プールが14→4件に減って残りの実効確率が跳ね上がり、
同時に normal 母数が増えて LEGEND 解放が退行する。**確率不変を優先し、乖離を許容する。**

### SECRET と発見方法

旧 legendary 21件は図鑑分類が SECRET になるが、**発見方法は従来のワールド完成条件のまま**。

- 図鑑上の説明：SECRET・空想生物（`fictionDisclaimer` を表示）
- 発見方法：現在のワールド完成条件を維持
- **未解放時の完全秘匿を維持**：存在・枠・件数・シルエット・ヒントを一切表示しない

解放ルール用の新テーブル・バージョン管理・grandfathering 処理は**追加していない**。
`rarity` を変更していないため解放判定の母数が動かず、既存ユーザーの状態が壊れないため移行処理自体が不要。

## 3. 図鑑データ（科学情報）

正本：`assets/characters/species-profiles.json`。型：`src/types/speciesProfile.ts`。

### 方針

- **461種すべてを最初から埋めない。** 行が無い＝未調査。値が `null` も未調査。
- **推測で埋めない。**
- `reviewStatus === "confirmed"` かつ出典1件以上でなければ**図鑑へ公開しない**。
  SECRET は科学的出典を要求しないが `fictionDisclaimer` が必須。
- 実在生物（NORMAL/RARE/LEGEND）と空想生物（SECRET）で表示フィールドと見出しを変え、混同させない。

### 分類ごとの表示項目

| 分類 | 表示する項目 |
|---|---|
| NORMAL | 学名・分類・分布・生息環境・大きさ・食性・識別特徴・行動・生態系での役割・保全状況・豆知識 |
| RARE | 上記＋希少形態・発生のしくみ・外見上の特徴（`baseSpeciesId` で通常種へ関連付け） |
| LEGEND | 学名・分類・生息年代・化石発見地域・推定サイズ・推定食性・**確実性の高い復元**・**議論がある復元**・絶滅の主な説 |
| SECRET | 由来・神話伝承・WORLDAWN内の設定＋**空想である旨の但し書き**（科学フィールドは持たせない） |

### パイロット10種

全4分類の表示経路を網羅する構成：NORMAL 7／RARE 1／LEGEND 1／SECRET 1。

ゾウ、キリン、ゴリラ、コアラ、レッサーパンダ、フクロウ、フラミンゴ、White Tiger、Megalodon、Yeti。

**現在の状態：全件 `reviewStatus: needsReview`＝未公開。**
記載内容は一般に確立した生物学的事実だが、出典URLの実地確認を人間が行っていないため公開しない。
人間が確認後 `confirmed` へ変更すると図鑑へ表示される。

残り451種は未調査。アプリ本体の完成を妨げない**継続コンテンツ制作**として順次追加する。

## 4. 画像

### 新旧の分離

| | 旧（legacy） | 新（図鑑特化版） |
|---|---|---|
| 画像 | `assets/characters/` | `assets/encyclopedia/<dexclass>/<id>.png` |
| プロンプト | `docs/legacy-character-prompts/` | `docs/encyclopedia-prompts/` |
| 検査 | `npm run validate:release-assets` | `npm run validate:encyclopedia` |

**旧画像は削除・上書きしない。** 新しい自然史図鑑の正式画像として流用もしない。

### 新基準の検査

`npm run validate:encyclopedia`（`scripts/validateEncyclopediaAssets.js`）は
**RGBA形式であることだけを合格条件にしない。実際に画素をデコードして透明を数える。**

- 1024×1024／PNGとして正常に開ける（シグネチャ・IHDR・IEND・zlib展開）
- RGBA（colorType=6）
- **alpha最小値 < 255**／**透明画素数 > 0**
- 四隅が透明（背景色・市松模様の焼き込み検出）
- 外周1pxが全て透明（全身が切れていない）
- 被写体面積が極端に小さくない

終了コード：`0`=全件合格／`1`=不合格あり／**`2`=未生成（合格として報告しない）**。

「全身1体か」「対象種として識別できるか」「文字・ロゴ・台座・風景が無いか」は
画素検査では判定できないため、**目視チェックリストとして出力し自動合格にしない**。

検査器そのものの正しさは `tests/encyclopediaAssets.test.ts` で証明している
（不良PNGを合成し、6種の失敗パターンを実際に検出できることを確認）。

旧アセットには 512×512・パレット形式や破損ファイルが含まれるが、
**新基準は `assets/encyclopedia/` にのみ適用**し、旧アセットを不合格にしない。

## 5. 確率不変の検証

`tests/spawnInvariance.test.ts` が6階層で証明する。

1. **確率設定値** — `BASE_RATES` / `MAX_RATES` / `INITIAL_BASE_RATES` / `RARE_SPAWN_RATES` の値とハッシュ
2. **抽選カテゴリの確率** — `rarityDistribution()` を GPS×フレンドLv の全組合せで検証（合計1.0）
3. **同一seedのカテゴリ** — 固定seedで2000回抽選した結果列のハッシュ
4. **各生きものの実効出現確率** — カテゴリ内件数（normal 84／rare 1／legendary 4）と母集団ハッシュ
5. **解放の母数** — ground normal 69件／sky normal 15件
6. **GPS・フレンドの影響** — GPS無効時の normal 還元、上限クランプ

#4 が中心。実効確率＝カテゴリ確率÷カテゴリ内件数なので、**件数を固定すれば1種あたりの確率が固定される**。

## 6. 変更禁止領域

- `server/src/rates.ts`、`src/constants/rareRules.ts`、`src/services/worldSpawn.core.ts` の確率値・重み・乱数
- `character_masters.rarity` の値、`is_available_for_scan`
- `server/src/scanService.ts` の抽選WHERE句・GROUP BY・件数カウント
- 既存ID（初期89・全461）、`releaseStatus`、公式番号、発見履歴、発見証明
- 旧キャラクター画像、旧プロンプト、`art/sheep-style-exploration` ブランチ
- `.gitattributes`、`package-lock.json`、依存関係

## 7. 残課題

1. **パイロット10種の出典URL確認と `confirmed` への切替**（人間の監修）
2. 自然史イラストの生成（`assets/encyclopedia/` はまだ空）
3. 残り451種の科学情報（継続コンテンツ制作）
4. 旧アセットのうち sky 5件（512×512・パレット）と破損した `Sheep.png` の再生成可否
5. LEGEND が実質1件（Megalodon）である件。絶滅生物の追加は商品判断
6. `rarity=rare` × `dexClass=NORMAL` の10件の乖離を恒久的に許容するか
