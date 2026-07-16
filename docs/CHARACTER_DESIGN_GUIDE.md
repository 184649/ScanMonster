# CHARACTER_DESIGN_GUIDE - WORLDAWN キャラクター設計方針

最終更新: 2026-07-04

初回リリースでは、キャラクターは「出現カテゴリ」と「通常/レア/シークレット」の整理を優先します。個体差コレクション、個体値、アニメーション、フォーム、背景、フレームは初回リリースUIに出しません。

## 基本方針

- 実在生物をモチーフにする
- 小さいカードでも顔とシルエットが分かる
- 既存IPに似せない
- 1キャラにつき覚えやすい特徴を1つ以上持たせる
- 図鑑で並べたときに統一感がある
- レアは通常キャラの世界観から自然に派生させる

## 初回リリースのキャラ単位

初回リリースでは、ユーザーに見せる単位は「キャラ」です。

```ts
type CharacterRarity = "normal" | "rare" | "secret";

type Character = {
  id: string;
  no: number;
  name: string;
  displayName: string;
  motif: string;
  habitatGroup: HabitatGroup;
  rarity: CharacterRarity;
  imageKey: string;
  description: string;
};
```

既存の `MonsterFamily` と `RareMonster` は残し、`src/data/characters.ts` でCharacter相当のデータへ変換します。

## ベース種族と別個体の分離

`Character.xlsx` の各ワールド100体は、独立した「ベース種族」だけで構成します。同じ種族の品種・亜種・地域型・色違い・幼体/成体差は、将来の「別個体」として扱い、ベース種族の100体には数えません。

### ベース種族として残す例

- イヌ / Dog
- ネコ / Cat
- ウシ / Cow
- コイ / Carp
- カブトムシ / Rhinoceros Beetle
- サクラ / Cherry Blossom

### 別個体候補として独立行から外す例

- チワワ / Chihuahua → 親種族: Dog
- 柴犬 / Shiba Inu → 親種族: Dog
- ブルドッグ / Bulldog → 親種族: Dog
- 三毛猫 / Calico Cat → 親種族: Cat
- シャム猫 / Siamese Cat → 親種族: Cat
- 金魚の品種、コイの品種、植物の栽培品種など → 親種族へ紐づけ

判定に迷う場合は、ユーザーが「新しい種族を発見した」と感じるかで判断します。姿や品種の違いとして理解されるものは別個体、明確に別の生物モチーフとして覚えられるものはベース種族です。

### Character.xlsx 推奨列

将来の別個体実装に備えて、原本には以下の列を追加できます。

| 列名 | 入力例 | 方針 |
| --- | --- | --- |
| `カタログ区分` | `base_species` | ワールド100体に数える独立種族。 |
| `親種族和名` | `イヌ` | 別個体候補の場合だけ入力。 |
| `親種族英名` | `Dog` | 別個体候補の場合だけ入力。 |
| `別個体メモ` | `小型犬の別個体候補` | 将来の実装・画像制作メモ。 |

初回リリースの通常ワールド図鑑では `base_species` だけを表示対象にします。`variant_candidate` は削除せず、別シートまたは別管理範囲へ退避して、将来の別個体コレクションで使います。

## 出現カテゴリ

| key | 表示名 | 方針 |
| --- | --- | --- |
| `land` | 陸の動物 | 犬、猫、熊、狐など、最も親しみやすい入口 |
| `water` | 水辺の生き物 | クラゲ、イルカ、クジラなど、水・透明感・流れ |
| `sky` | 空の生き物 | 鳥類など、翼・風・高所 |
| `bug` | 虫・小さな生き物 | 甲虫、小動物、草むら感 |
| `reptile` | は虫類・両生類 | カメ、ワニ、ヘビ、カエルなど |
| `rare_world` | 希少生物・特殊枠 | 初回では拡張枠。主要導線に出しすぎない |

## レアリティ

- `normal`: 通常キャラ
- `rare`: レアキャラ
- `secret`: 特に希少なレアキャラ

レア確率は1〜3%です。DPや気配ブーストでレア確率は上げません。

## データ管理パイプライン（2026-07-05 更新）

キャラクターの原本は **`assets/characters/Character.xlsx`**。**シート名＝worldGroup（英語キー: ground / waterside / sky / bug / phantom / planet …）** で、ワールド名・シート名・フォルダ名・json/csv のカテゴリ名・コードの WorldGroup をすべて英語キーで統一する。

- xlsx 列: `no` / `キャラ名`(name) / `和名`(speciesJa) / `英名`(speciesEn) / `rarity`(normal|rare) / `作成状況`(status) / `説明`(description)。
- 画像フォルダ: **`assets/characters/<worldGroup>/<英名>/<英名>.png`**（通常・レア共通の同一構成）。
- 運用フロー:
  1. `Character.xlsx` を編集（シート＝ワールド、行＝キャラ）。
  2. `npm run export:master` … xlsx → `character_master.json` ＋ `character_master.csv` を出力。
  3. `npm run gen:catalog` … master json ＋ 画像実在から `src/data/characterCatalog.generated.ts` と画像マニフェスト＋サムネを生成。
- id は `<worldGroup>_<英名slug>`（レアは `<worldGroup>_rare_<英名slug>`）。`realmGroup` は worldGroup から自動導出。

## 画像方針

- 本番表示は `MonsterAvatar` で解決する（カタログ画像 `characterImages.generated` を優先）
- 画像が見つからない場合は安全なfallbackを表示する
- 共有カードにはコード値、正確な時刻、位置情報、sourceHashを表示しない
- `assets/characters/old` と `assets/characters/backup` は参照しない

## 初回リリースで使わない表現

以下は初回リリースではユーザー向けUIに出しません。

- 個体値
- 個体差コレクション
- フォーム
- 背景変更
- フレーム変更
- アニメーション
- 探索適性
- 研究Lv
- カテゴリ図鑑

既存コードや素材が残っていても、主要導線・README・リリースチェックでは対象外として扱います。

## 図鑑で表示する情報

- キャラ名
- 種族/モチーフ
- 出現カテゴリ
- レアリティ
- 発見済み/未発見
- 初発見日
- 最終発見日
- 発見回数
- お気に入り

## 追加時のチェック

- `habitatGroup` が必ず設定されている
- `rarity` が必ず設定されている
- 画像が存在しなくてもfallbackで落ちない
- レアはカテゴリ解放済みの範囲からしか出ない
- 商品名やOCR結果に依存しない
- 位置情報で出現を制御しない

## Phase 0.5 追記（2026-07-14）：ID と分類の扱い

- キャラクターの **character ID は永久識別子**であり、**デザイン変更・rarity 変更・画像差し替えでは変更しない**。
- **ID から rarity を読み取らない**（`ground_rare_fenrir` は legendary）。分類は rarity フィールド／`character-classification.json` で判定する。
- 対象が確定できない行（英名・rarity 未定）は **`Character.xlsx` の `unresolved` シート**へ退避し、正式6シートへは入れない。推測で対象を確定しない（例：ground 旧76行目の「麒麟」）。
