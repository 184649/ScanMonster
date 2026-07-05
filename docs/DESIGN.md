# WORLDAWN 設計書

最終更新: 2026-07-05

WORLDAWNは、バーコード/QRコードをスキャンしてキャラクターを発見し、DPで**ワールド**を解放しながら図鑑と称号を進めるコレクションアプリです。

> 分類は **領域（RealmGroup） > ワールド（WorldGroup） > キャラクター** の3階層。**DPで解放する単位はワールド**。領域はテーマ分類で解放単位ではない。初回リリースは生物領域の4ワールド（地上／水辺／空／虫）で、開始時に1つを無料選択。詳細・実装フェーズは [WORLD_SYSTEM.md](WORLD_SYSTEM.md) §7。

## 初回リリースの体験

```text
スキャン
↓
キャラクター発見 / 再発見
↓
DP獲得
↓
ワールド解放（コストは何個目の解放かで決定）
↓
出現対象が増える
↓
ワールドブーストで狙うワールドを出やすくする（レア確率は不変）
↓
図鑑と称号が進む
```

## 初回リリースに入れるもの

- バーコード/QRスキャン
- 写真ライブラリからのコード読み取り
- キャラクター発見
- 再発見
- 図鑑
- キャラ詳細
- DP
- 初回ワールド選択（地上／水辺／空／虫から1つ）
- DPによるワールド解放
- 解放済みワールドからのランダム出現（未発見優先なし）
- レア出現（解放ワールド内のレアのみ／DP・ブーストで確率上げない）
- ワールドブースト
- 称号
- マイページ
- 設定
- ローカル保存

## 初回リリースに入れないもの

- バトル
- 探索
- 研究
- アニメーション
- 個体値
- 個体差コレクション
- カテゴリ図鑑
- 商品名取得
- OCR
- 位置情報を使った出現制御
- 交換
- ランキング
- 課金
- 広告

コードを残す場合でも、主要タブ・ホーム・図鑑・マイページ・チェックリストからは外します。

## 技術スタック

- Expo SDK 54
- React Native
- TypeScript
- Zustand
- AsyncStorage
- expo-camera
- expo-image-picker
- expo-crypto
- React Navigation
- Node標準 `node:test`

## 主要画面

- `HomeScreen`: DP、カテゴリ解放状況、気配ブースト、称号、最近の発見
- `InitialHabitatScreen`: 初回カテゴリ選択
- `HabitatUnlockScreen`: DPによるカテゴリ解放と気配ブースト
- `ScanScreen`: カメラ/写真からコード読み取り
- `SummonResultScreen`: NEW発見/再発見、獲得DP、共有プレビュー
- `DexHomeScreen`: 通常図鑑、レア図鑑、カテゴリ解放導線
- `FamilyDexScreen`: 発見済み/未発見一覧
- `MonsterDetailScreen`: キャラ画像、レアリティ、カテゴリ、初発見日、最終発見日、発見回数、お気に入り
- `TitlesScreen`: 称号一覧と表示称号設定
- `MyPageScreen`: プロフィール、DP、称号、図鑑進捗、設定導線
- `SettingsScreen`: プライバシー、デバッグ、データリセット

## データ設計

### HabitatGroup

```ts
type HabitatGroup = "land" | "water" | "sky" | "bug" | "reptile" | "rare_world";
```

初期選択可能:

- `land`
- `water`
- `sky`
- `bug`

DP解放対象:

- `land`
- `water`
- `sky`
- `bug`
- `reptile`
- `rare_world`

### Character

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

既存の `MonsterFamily` / `RareMonster` は当面残し、`src/data/characters.ts` で初回リリース向けのCharacter相当へ変換します。

### OwnedCharacter

```ts
type OwnedCharacter = {
  characterId: string;
  firstDiscoveredAt: string;
  lastDiscoveredAt: string;
  discoveryCount: number;
  favorite: boolean;
};
```

既存実装では `UserMonster` に互換フィールドを追加し、同じ `characterId` の発見は新規追加ではなく再発見として更新します。

### UnlockState

```ts
type UnlockState = {
  unlockedHabitatGroups: HabitatGroup[];
  selectedInitialHabitatGroup?: HabitatGroup;
  activeHabitatBoost?: HabitatBoost;
};
```

### HabitatBoost

```ts
type HabitatBoost = {
  id: string;
  targetHabitat: HabitatGroup;
  remainingScans: number;
  boostRate: number;
  createdAt: string;
};
```

### UserTitleState

```ts
type UserTitleState = {
  unlockedTitleIds: string[];
  activeTitleId?: string;
};
```

## 初回カテゴリ選択

初回開始時に `land` / `water` / `sky` / `bug` から1つ選びます。

- 選択カテゴリは無料で解放済み
- 最初は選択カテゴリだけが出現対象
- `selectedInitialHabitatGroup` が存在する場合は表示しない
- 選択後に称号「最初の世界を選びし者」を解放対象にする

## カテゴリ解放

カテゴリ解放コストはカテゴリ種類ではなく「何個目の解放か」で決めます。

| 解放数 | コスト |
| --- | ---: |
| 1カテゴリ目 | 0 DP |
| 2カテゴリ目 | 1,000 DP |
| 3カテゴリ目 | 2,300 DP |
| 4カテゴリ目 | 4,200 DP |
| 5カテゴリ目 | 7,000 DP |
| 6カテゴリ目 | 11,000 DP |

## 出現決定ロジック

1. `sourceHash + ":" + localDate` で同日同コード制限を確認
2. 有効スキャンなら抽選開始
3. 解放済みカテゴリを取得
4. `activeHabitatBoost` があればカテゴリ出現率を補正
5. カテゴリをランダム抽選
6. レア確率ロール
7. 通常/レアに応じて候補を絞る
8. カテゴリ内からランダムで1体選ぶ
9. 未所持ならNEW発見
10. 所持済みなら再発見

未発見優先は入れません。所持済みキャラも通常候補に含めます。

## レア出現

- レア確率は初心者約1%、進行後最大3%
- DPでレア確率を上げない
- 気配ブーストでレア確率を上げない
- レアは選ばれたカテゴリに紐づく候補から選ぶ
- カテゴリ抽選後にレア確率ロールを行う

## 気配ブースト

- コスト: 300 DP
- 効果: 次の10回の有効スキャン
- 対象: 解放済みカテゴリのみ
- 同時使用: 1つまで
- 1カテゴリだけの状態では使用不可
- 同日同コードブロックでは残り回数を減らさない
- レア確率は変えない

出現率:

- 4カテゴリ以上: 対象55%、残りを均等分配
- 3カテゴリ: 対象55%、残り22.5%ずつ
- 2カテゴリ: 対象70%、残り30%

## DP報酬

- 新キャラ発見: 30 DP
- 通常キャラ再発見: 5 DP
- レアキャラ初発見: 100 DP
- レアキャラ再発見: 20 DP
- 今日の初スキャン: 20 DP
- 同日同コードブロック: DPなし

DPは課金購入できません。カテゴリ解放と気配ブーストに使います。

## 称号

称号はプレイ実績と自己表現のための機能です。強さ、レア確率、抽選優遇には影響しません。

称号カテゴリ:

- スキャン回数
- 図鑑進捗
- カテゴリ解放
- カテゴリ別発見
- レア発見
- 再発見
- 連続スキャン

## 保存とプライバシー

保存しない:

- `rawBarcode`
- `rawQrValue`
- `rawValue`
- `normalizedBarcode`
- `normalizedQrValue`
- `normalizedValue`
- バーコード数字そのもの
- QRコードのURLや文字列
- 正確な緯度/経度
- 商品名
- OCR結果

保存する:

- `sourceHash`
- `variantSeedHash`
- `scanDate`
- `scanTimeBucket`
- `barcodeType`
- `scanSource`
- `characterId`
- `familyId`
- `rareId`
- `habitatGroup`
- `firstDiscoveredAt`
- `lastDiscoveredAt`
- `discoveryCount`
- DP残高と台帳
- 解放済みカテゴリ
- 気配ブースト状態
- 称号状態

位置情報を使った出現制御は初回リリース対象外です。既存互換の `regionKey` が残る場合も、出現カテゴリ抽選には使用しません。

## Feature Flags

初回リリースでは以下を無効化します。

- `ENABLE_EXPEDITION`
- `ENABLE_RESEARCH`
- `ENABLE_MISSIONS`
- `ENABLE_CHARACTER_MOTION`
- `ENABLE_INDIVIDUAL_VARIANTS`
- `ENABLE_CATEGORY_DEX`

有効:

- `ENABLE_HABITAT_UNLOCK`
- `ENABLE_HABITAT_BOOST`
- `ENABLE_TITLES`

## 確認コマンド

```powershell
npm.cmd run typecheck
npm.cmd test
```
