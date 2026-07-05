# ワールド構成とキャラクターデータ（新モデル）

最終更新: 2026-07-05。旧「35種＋個体差＋レア8」から、**ワールド別の大規模キャラ図鑑**へ移行する設計。

## 1. 現状（このドキュメント時点の実データ）

キャラクター原本は `assets/characters/Character.xlsx`（各ワールド＝シート）。現在の基本列は
`No / キャラ名 / 和名 / 英名 / 作成状況`。英名＝画像フォルダ名（`assets/characters/<world>/<英名>/<英名>.png`）。

### ベース種族と同種族の別個体

`Character.xlsx` の各ワールド100体は、**独立したベース種族**だけを数える。将来の同種族の別個体になりうるものは、独立キャラクター行としては扱わない。

例:

- `イヌ / Dog` はベース種族として採用する。
- `チワワ / Chihuahua`、`柴犬 / Shiba Inu`、`ブルドッグ / Bulldog` は `Dog` の将来別個体候補であり、動物シートの100体には含めない。
- `ネコ / Cat` に対する `三毛猫`、`シャム猫`、`ペルシャ猫` なども同様に別個体候補とする。
- 魚、虫、植物などでも、同じ生物分類内の品種・栽培品種・地域型・色違い・幼体/成体差は、原則として別個体候補に回す。

別個体候補は削除して終わりではなく、後続設計で使えるように `親種族` と紐づけて管理する。`Character.xlsx` に列を追加する場合は、以下を推奨する。

| 列名 | 用途 |
|---|---|
| `カタログ区分` | `base_species` / `variant_candidate` / `rare`。ワールド100体の対象は `base_species` のみ。 |
| `親種族和名` | 別個体候補の場合の親種族。例: `イヌ`。 |
| `親種族英名` | 別個体候補の場合の親英名。例: `Dog`。 |
| `別個体メモ` | 将来の姿・品種・地域型・サイズ差などのメモ。 |

運用上は、各ワールドシートを100体の `base_species` で揃え、別個体候補は `カタログ区分=variant_candidate` として別管理シートへ退避するか、同シートに残す場合でも100体カウントから除外する。

xlsx から抽出した機械可読マスタ： **`assets/characters/character_master.json`**（コミット済み・人が編集可）。

| ワールド | key | 行数 | 画像あり | 初回リリース |
|---|---|---|---|---|
| 動物 | animal | 100 | 72 | ○ |
| 魚 | fish | 100 | 5 | ○ |
| 虫 | bug | 100 | 0 | ○ |
| 植物 | plant | 100 | 0 | 将来 |
| 恐竜 | dinosaur | 100 | 0 | 将来 |
| 宇宙 | space | 100 | 0 | 将来 |
| 城（幻想/伝説） | castle | 0 | 0 | 将来 |
| レア | （各ワールドへ分配） | 21 | 8(ルートのRare_*.png) | — |

**画像はまだ生成途中**（動物72／魚5のみ実在。虫/植物/恐竜/宇宙は0）。キャラ生成プロンプトで順次作成中。

## 2. 生成パイプライン（実装済み）

- `scripts/generateCharacterData.js`（`npm run gen:catalog`）
  - 入力: `character_master.json` ＋ 実在PNGの有無。
  - 出力1: **`src/data/characterCatalog.generated.ts`** … `WORLDS` / `CATALOG_CHARACTERS`(600) / `CATALOG_RARES`(21)。各キャラに `world` / `name`(キャラ名) / `speciesJa` / `speciesEn` / `hasImage`。
  - 出力2: **`src/assets/characterImages.generated.ts`** … 実在PNGだけを static require（`CHARACTER_IMAGES[id]`＝原画）。Metroが欠損画像を掴まないので、画像未生成でもビルドが壊れない。加えて **`CHARACTER_THUMBS[id]`＝図鑑グリッド用サムネ**（`getCharacterThumb(id)` は無ければ原画へフォールバック）。
  - 出力3: **`assets/thumbs/<id>.png`** … 原画（1024px級・約2MB）を **256px 最大辺に縮小したサムネ**（jimp、devDependency）。原画より新しいサムネがあればスキップ。コミット対象。
- レアはシート横断。`RARE_WORLD` テーブルで各レアを出現ワールドへ割当（現状: 魚7 / 動物5 / 城5 / 虫2 / 宇宙2）。
- 検証: `tests/characterCatalog.test.ts`（ワールド定義・ID一意・world妥当性・初回各ワールドにレア存在）。

**画像を追加したら `npm run gen:catalog` を再実行**すれば、その画像が自動でバンドル対象になり、サムネも生成される。

### 図鑑の表示パフォーマンス（2026-07-05）
原画は 1024×1024・約2MB。図鑑グリッドは1枚110px前後なのに原画をフル解像度でデコードし、さらに `ScrollView` で全件同時マウントしていたため重かった。対策：
- **サムネ**（256px・約70KB／枚、動物72枚で 86MB→6.2MB）を `MonsterAvatar thumb` 経由で図鑑グリッドに使用。個体詳細・発見結果は原画のまま。
- `WorldDexScreen` を **`FlatList`（numColumns=3）で仮想化**（`removeClippedSubviews` / `windowSize` 等）。画面内のカードだけデコードする。

## 3. レア→ワールドの割当（現状の暫定マッピング）

xlsx の「レア」シートにワールド列が無いため、`generateCharacterData.js` の `RARE_WORLD` で暫定割当：
- 魚: Sea Dragon / Megalodon / Coelacanth / Megamouth Shark / Kraken / Nessie / Merlion
- 虫: Phantom Insect / Kesaran Pasaran
- 動物: White Tiger / Fenrir / Yeti / Tsuchinoko / Underground Dweller
- 宇宙: Alien / Robot
- 城: Dragon / Phoenix / Ghost / Sphinx / Moai / 妖精 / 小人 / エルフ / ユニコーン / グリフォン / ペガサス

→ 恒久運用では xlsx レアシートに「ワールド」列を足すのが望ましい（そうすれば原本で管理できる）。

### レア画像の命名規則（2026-07-05）
各ワールドのレアキャラの画像は、**ファイル名の先頭を `Rare` にする**（例: `Rare_alien.png` / `Rare_sea_dragon.png`）。置き場所は `assets/characters/` 直下。
- 生成器 `findRareImage(en)` が、英名を記号無視で照合し（`normKey("rare"+英名)`）ルート直下の `Rare*` 画像を拾う。無ければ旧配置 `assets/characters/レア/<英名>/*.png` を補助的に見る。
- 現状マッチ: `Rare_alien / Rare_dragon / Rare_fenrir / Rare_ghost / Rare_kraken / Rare_phoenix / Rare_robot`（7枚）。`Rare_panda` はレアマスタに該当が無いため未使用。
- 通常キャラ画像は従来どおり `assets/characters/<world>/<英名>/<英名>.png`。

## 4. 確定した方針（2026-07-04）

1. **v1 = 動物/魚/虫の3ワールド。出現・発見できるのは画像実在キャラのみ**。未生成キャラは図鑑に「？？？（近日）」のシルエット枠として残す。画像を追加して `npm run gen:catalog` すれば自動で出現対象が増える。
2. **v1の3ワールドは初期から全開放**。将来ワールド（植物/恐竜/宇宙/城）はロック。「解放済みワールドのキャラだけ出現」というゲートは実装する。
3. **旧・個体差（時間帯/季節/rarity）は廃止**し、出現ティアは **normal + rare の2層**。`discoveryRate` の variant(別個体) 層は当面 normal に統合する。ただし、チワワ/柴犬/ブルドッグのような同種族の別個体は将来拡張として残し、現時点ではベース種族100体のカウントから外す。

## 5. 実装済み（フェーズ2の中核・純粋ロジック）

- `src/services/catalogDiscovery.core.ts` … 依存注入・純粋関数。`filterNormalPool` / `filterRarePool` / `selectFromCatalog` / `hasSpawnable`。
  - **解放済みワールド かつ 画像実在** のキャラだけを候補にする。
  - `wantRare` なら解放済みワールドの画像実在レアから抽選（＝ワールド別レア）。無ければ通常へフォールバック。
- `src/services/catalogDiscovery.ts` … 上記に実データ（`characterCatalog.generated`）を束ねたアプリ向けAPI。解放済みワールドは呼び出し側から渡す（正典は economy の `unlockedWorlds`＝既定は動物/魚/虫）。
- 単体テスト `tests/catalogDiscovery.test.ts`（解放ゲート・画像実在のみ・ワールド別レア・フォールバック）。

現状 `tsc` / `npm test`(29) / `expo export` すべてグリーン。既存アプリ（旧35種）は無改変で稼働。

## 6. 移行方針（world を正典に）

2026-07-04 決定：**world（動物/魚/虫...）を正典**にする。既存の habitat(land/water/sky/bug) ゲートは順次 world へ寄せる。フェーズ分割で安全に移行する。

### フェーズ3a：発見フロー（実装済み）
- `MonsterAvatar` … 画像解決を **`characterImages.generated`（カタログ画像）優先**→旧マニフェストへフォールバック。カタログ画像がどの画面でも表示される。
- `monsterStore.addScannedMonster` … discoveryRate で normal/rare をロール（variant は normal 扱い）→ **`selectCatalogDiscovery({ unlockedWorlds: INITIAL_UNLOCKED_WORLDS, wantRare })`** で**解放ワールド×画像実在**キャラを抽選（レアはワールド別）。得たキャラの **表示名・画像・world・和名/英名・レア判定**を、既存生成モンスターに上書き（`familyId` 等は互換のため残置＝クラッシュ回避）。プールが空なら旧ロジックへフォールバック。
- `UserMonster` に `world?/speciesJa?/speciesEn?` を追加。`getMonsterDiscoveryType` はカタログ由来を normal/rare の2層で判定。
- 発見結果画面 … 名前＝キャラ名、画像＝カタログ、種族＝和名、区分＝world/レアを表示。
- 検証：tsc / npm test(29) / expo export すべてグリーン。

### フェーズ3b：ワールド図鑑・個体詳細（実装済み）
- **`WorldDexScreen`**（`WorldDex` ルート）… world タブ（動物/魚/虫＝解放、将来はロック表示）＋ No順グリッド。**所持＝画像＋名前／未所持だが画像実装済み＝シルエット「？？？」／画像未実装＝「？？？（近日）」**。ワールド別レア枠も表示。所持キャラのタップで個体詳細へ。進捗「発見/総数（画像実装N）」。
- 図鑑ロジック `services/worldDex.core.ts`（純粋・DI）＋ `worldDex.ts`（実データ束ね）＋ テスト `tests/worldDex.test.ts`。所持判定は characterId。
- DexHome のヒーローを **ワールド図鑑** へ差し替え（旧・種族図鑑はグリッドから引き続き参照可）。
- 個体詳細（`MonsterDetailScreen`）… カタログ由来は **ワールド名＋和名／ワールドのレア** を副題・バッジに表示（画像・名前は既に3aでカタログ）。
- 検証：tsc / npm test(33) / expo export すべてグリーン。

### フェーズ3c-1：ワールド解放stateの正式化（実装済み）
- economy に **`unlocks.unlockedWorlds: WorldKey[]`** を新設（`types/economy.ts`）。既定は `INITIAL_WORLD_KEYS`（初回リリース＝動物/魚/虫）。
- `data/economy.ts` … `createDefaultEconomyState` で `unlockedWorlds: [...INITIAL_WORLD_KEYS]`。`normalizeEconomyState` は `normalizeUnlockedWorlds()` で保存データを検証（不正キー除去・空なら既定へ）。
- 出現ゲートを定数 `INITIAL_UNLOCKED_WORLDS` から **永続state** へ切替：`monsterStore.addScannedMonster` は `state.economy.unlocks.unlockedWorlds` を `selectCatalogDiscovery` に渡す。
- 図鑑も永続stateを参照：`getWorldDexView(world, monsters, unlockedWorlds)`。`WorldDexScreen` は `economy.unlocks.unlockedWorlds` を渡し、タブのロック表示も解放stateに追従。
- → 将来ワールドに DP/進行解放を付ける場合は `unlockedWorlds` に push すれば出現・図鑑・タブが自動で開く。
- 検証：tsc / npm test(33) / expo export すべてグリーン。

### フェーズ3c-2：称号の world 化（実装済み）
- `data/titles.ts` … 旧 `habitat_{land/water/sky/bug}_{10/30/50}`（12件）を **`world_{animal/fish/bug}_{10/30/50}`（9件）** に置換。`TitleCategory` の `"habitat"` を `"world"` へ。
- `titleService.ts` … 発見数集計を `habitatGroup` ベースから **`monster.world` ベース**（`discoveredByWorld`）に変更。未使用の habitat 依存を除去。
- 保存済みの旧IDは `USER_TITLES` に無いため自動的に非表示（互換問題なし）。
- 注：`unlock_*` 称号は現行の DP 解放（HabitatUnlock＝habitatベース）が存続しているため据え置き。ワールドのDP解放を実装する段階で `unlockedWorlds.length` へ寄せる。
- 検証：tsc / npm test(33) / expo export すべてグリーン。

### フェーズ3c-3：キャラ説明文のカタログ化（配管実装済み）
- カタログに **`description` 列**を追加（`CatalogCharacter` / `CatalogRare`）。生成器は master json の `description` / `memo` / `説明` 列を読む（未記入なら空文字）。
- 逆引き `src/data/catalogLookup.ts`（`getCatalogDescriptionById`）を追加。
- `MonsterDetailScreen` / `SummonResultScreen` のキャラメモは、**カタログ由来（world持ち）かつ説明文があればそれを優先**、無ければ従来の family/rare メモへフォールバック。
- → **恒久運用**：`Character.xlsx` 各シートに「説明」列を足して `character_master.json` を再生成し `npm run gen:catalog` すれば、説明文が全画面に反映される（現状は列が空のため表示は従来どおり）。
- 検証：tsc / npm test(33) / expo export すべてグリーン。

### フェーズ3c-4：旧図鑑UIの撤去・ワールド図鑑へ一本化（2026-07-05）
- キャラは新ワールドカタログへ一新済み。**旧図鑑UIを撤去**し、図鑑はワールド図鑑に一本化した。
  - 削除画面：`FamilyDexScreen`（種族）/ `RareDexScreen`（レア）/ `CategoryDexScreen`（カテゴリ）/ `IndividualDexScreen`（個体）。App.tsx のルート登録・`navigation.ts` の型も削除。
  - 導線を全て `WorldDex` へ張替：Home（図鑑/レア発見/最近の発見）・SummonResult（図鑑で見る×2）・Research・MonsterDetail。DexHome の「レア」カードは `WorldDex` へ誘導（レアはワールド図鑑内で確認）。
  - Home のプレイヤーアバターは所持キャラがあれば新カタログ画像（`thumb`）を表示。DexHome の `discoveredRares` は `characterRarity==="rare"` も数えるよう更新。
- **旧キャラのデータ/画像（`monsterFamilies` / `rareMonsters` / `assets/monsters` 等）は温存**。モンスター生成・研究・遠征・共有カードの土台のため残し、UIには出さない（＝ユーザー選択「旧図鑑UIを撤去」）。
- **出現カテゴリの DP 解放（HabitatUnlock）は habitat のまま据え置き**。ワールドに DP ゲートを付ける段階で `unlockedWorlds` へ寄せ、その時に `unlock_*` 称号も world 化する。
- 検証：tsc / npm test(33) / expo export すべてグリーン。

### デバッグモード（2026-07-05）
- `src/constants/featureFlags.ts` に **`DEBUG_MODE`** を新設（現在 **ON**）。リリース時は `false` にする。
- `src/services/worldAccess.ts` … `effectiveUnlockedWorlds(persisted)` が、`DEBUG_MODE` の間は **全ワールド（`ALL_WORLD_KEYS`）** を返し、通常は保存stateをそのまま返す。
- 反映箇所：`monsterStore.addScannedMonster`（出現抽選）と `WorldDexScreen`（図鑑タブ・ロック表示）。→ デバッグ中は**全ワールドが解放**され、全キャラが図鑑・出現の対象になる。
- 注意：実際に出現・図鑑表示されるのは**画像実在キャラのみ**（画像未生成のワールド＝虫/植物/恐竜/宇宙/城 は解放されても「？？？（近日）」枠のまま）。デバッグモードは解放ゲートを外すだけで、欠損画像は生成しない。
- **`DEBUG_ALL_OWNED`**（現在 **ON**）… 図鑑で全キャラを「取得済み」表示（進捗も満タン）。所持データは変更せず表示のみ（`worldDex.getWorldDexView` が debug 時に全カタログIDを owned 扱い）。`DEBUG_MODE`（全ワールド解放）とは別フラグ。リリース時は両方 false。

### ワールドの公開／追加は1フラグで（2026-07-05）
- **図鑑に出すのは実装済みワールドのみ**。`data/worlds.ts` の `RELEASED_WORLD_DEFS = WORLD_GROUP_DEFS.filter(initialRelease)` が単一の真実。`worldDex.getWorldTabs()` はこれを order 順で返す（**実装予定ワールドは図鑑に非表示**）。
- 初回選択（`INITIAL_WORLD_GROUPS`）・図鑑・ワールド解放画面がすべて `initialRelease` フラグ1箇所に追従。→ **新ワールド公開は、その def の `initialRelease` を true にするだけ**。
- キャラ追加/変更は `character_master.csv`（または `character_master.json`）に行を足して `npm run gen:catalog`。realmGroup/worldGroup を記入すればカタログ・図鑑・出現に自動反映。

### 将来（v1以降の任意項目）
- 旧キャラのデータ/画像（`monsterFamilies` / `rareMonsters` / `assets/monsters` 等）の完全撤去。現状は生成・研究・遠征・共有カードの土台のため温存中（＝完全削除する場合は生成基盤を新カタログへ全面移行が必要）。
- 出現カテゴリの DP 解放を world 解放へ移行（＋`unlock_*` 称号の world 化）。
- `Character.xlsx` に「説明」列を追加してキャラ説明文を実データ化（配管は3c-3で完了済み）。
- 同種族の別個体を `親種族` と紐づけて実装する。別個体は新しいベース種族ではなく、発見済み種族内の姿・品種・地域型・レア個体として扱う。
- 画像未生成ワールド（虫/植物/恐竜/宇宙/城）のキャラ画像生成。

### 画像追加時の注意
`assets/characters/<world>/<英名>/<英名>.png` を置いて `npm run gen:catalog`。**ファイル名の大文字小文字は実体に一致させる**（Metro は大小区別。WindowsのexistsSyncは区別しないため、生成器は実ファイル名の綴りを使う）。

## 7. 「領域 > ワールド > キャラクター」構造への移行（2026-07-05〜）

WORLDAWN の分類を **領域(RealmGroup) > ワールド(WorldGroup) > キャラクター** の3階層へ移行する。**DPで解放する単位はワールド**。領域は表示・拡張のためのテーマ分類（解放単位ではない）。

### 構成（正式仕様）
| 領域 | ワールド | 初回リリース |
|---|---|---|
| 生物(life) | 地上(ground) / 水辺(waterside) / 空(sky) / 虫(bug) | ○（4ワールド） |
| 生物(life) | うろこ(scale) / まぼろし(phantom) | 将来 |
| 宇宙(space) | 惑星(planet) / 星座(constellation) | 将来 |
| 歴史(history) | 紀元前(bc) / 縄文(jomon) / 平成(heisei) | 将来 |
| ミクロ(micro) | 原子(atom) / ウイルス(virus) | 将来 |
| 食べ物(food) | 主食(staple_food) / デザート(dessert) | 将来 |

※「食べ物ワールド」ではなく**食べ物領域**。配下に主食/デザートワールドを置く。

### 解放とブースト
- **解放コストは「何個目のワールド解放か」で決まる**（種類非依存）：`[0, 1000, 2300, 4200, 7000, 11000]`（`getNextWorldUnlockCost`）。
- 初回選択：`ground/waterside/sky/bug` から1つを無料選択。選んだワールドだけが最初の出現対象。
- ワールドブースト：300DP、次の10回の有効スキャンで対象ワールドの出現率を上げる（2ワールド時0.7、3+時0.55）。**レア確率は変えない**。同時併用不可、未解放ワールド不可、同日同コードブロックでは回数を減らさない。

### フェーズ1：データモデル基盤（実装済み・2026-07-05）
- 型 `src/types/worlds.ts` … `RealmGroup` / `WorldGroup` / `CharacterRarity` / `WorldCharacter` / `OwnedCharacter` / `WorldBoost`。
- 定義 `src/data/worlds.ts` … `WORLD_GROUP_DEFS`（領域対応・初回リリースフラグ・順序）、`REALM_GROUP_LABELS` / `WORLD_GROUP_LABELS`(+short/emoji/description)、`WORLD_UNLOCK_COSTS` / `getNextWorldUnlockCost`、`INITIAL_WORLD_GROUPS`、`WORLD_BOOST_*` / `getWorldRates` / `normalizeWorldGroups`。既存 `habitatGroups.ts` のコスト・ブースト率と一致（land/water/sky/bug ≒ ground/waterside/sky/bug）。
- 原本再編 `scripts/reworldMaster.js` … `character_master.json` の各行に `realmGroup`/`worldGroup` を付与し、`character_master.csv`（人が編集しやすい原本）を出力。
  - 動物100体を **ground 69 / waterside 16 / sky 15** に振り分け（鳥・コウモリ=sky、水生/両生/水辺=waterside、残り陸生=ground）。魚100→waterside、虫100→bug。
  - レア→worldGroup：waterside(海の幻獣7) / bug(2) / ground(5) / planet(Alien,Robot) / phantom(城レア11)。※空(sky)のレアは現状なし（将来追加）。
  - 植物/恐竜/宇宙シートは worldGroup 未割当（将来）。
- 生成器 `generateCharacterData.js` … `CatalogCharacter`/`CatalogRare` に `realmGroup`/`worldGroup` を追加出力（既存 `world` は後方互換で残置＝段階移行）。
- 検証：tsc / npm test(33) / expo export グリーン。

### フェーズ2：economy とストアアクション（実装済み・2026-07-05）
- `types/economy.ts` の `UnlockState` に `unlockedRealmGroups`/`unlockedWorldGroups`/`selectedInitialWorldGroup`/`activeWorldBoost` を追加（既存 habitat 系・`unlockedWorlds` は後方互換で残置）。
- `data/economy.ts` … `createDefaultEconomyState`（realm=["life"]、worldGroups=[]）、`normalizeRealmGroups`/`normalizeWorldBoost`、`normalizeEconomyState` で新フィールドを正規化。
- `monsterStore` に3アクション追加：`selectInitialWorldGroup`（初回選択＝worldGroup1つ解放＋称号）/ `unlockWorldGroup`（DP解放・コストは解放済み数）/ `startWorldBoost`（300DP・10回・2ワールド以上）。既存 habitat アクションは当面併存。
- 検証：tsc / npm test(33) グリーン。

### フェーズ3：出現ロジックの worldGroup 化（実装済み・2026-07-05）
- 純粋モジュール `src/services/worldSpawn.core.ts`（DI）… `spawnableWorldGroups`（画像実在キャラを持つ解放ワールド）/ `pickWorldByRates`（rates重み抽選・rates無しは均等）/ `selectWorldSpawn`（ワールド抽選→そのワールドの画像実在キャラ/レアを1体、未発見優先なし）。
- バインダ `src/services/worldSpawn.ts` … `CATALOG_CHARACTERS`/`CATALOG_RARES` と `getWorldRates`（ブースト補正）を束ねる。
- `worldAccess.ts` に `effectiveUnlockedWorldGroups`（デバッグ時は全ワールド）。`data/worlds.ts` に `decrementWorldBoostAfterValidScan`。
- `monsterStore.addScannedMonster` … 旧 `selectCatalogDiscovery`(world) を **`selectWorldSpawn`(worldGroup)** に置換。解放済みワールドから均等抽選（ブースト補正込み）→ そのワールドの画像実在キャラ→ NEW/再発見。有効スキャンで `activeWorldBoost` の残り回数を1消費（同日同コードブロック時は addScannedMonster 自体に入らないので減らない）。`UserMonster` に `worldGroup`/`realmGroup` を付与。
- 単体テスト `tests/worldSpawn.test.ts`（7件）：解放外は出ない／画像なしワールドは候補外／レアは解放ワールドの画像実在レアのみ／レア無しは通常フォールバック／rates（ブースト）反映／均等抽選。
- 検証：tsc / npm test(40) / expo export グリーン。

### フェーズ4：称号の worldGroup 化（実装済み・2026-07-05）
- `titleService.ts` … 発見数集計を `monster.worldGroup` ベース（`discoveredByWorldGroup`）へ。`world_{ground/waterside/sky/bug}_{10/30/50}`（4ワールド×3＝12件）。`unlock_*` は `unlockedWorldGroups.length` / `selectedInitialWorldGroup` を参照。
- `data/titles.ts` … `world_animal/fish/bug` を `world_ground/waterside/sky/bug` に置換（空ワールドの称号を追加）。`unlock_*` 文言を「カテゴリ」→「ワールド」、`unlock_1`＝「最初のワールドを選びし者」。
- 旧IDは `USER_TITLES` に無いため保存済みでも非表示（互換問題なし）。
- 検証：tsc / npm test(40) グリーン。

### フェーズ5：UI の worldGroup 化（進行中・2026-07-05）
実装済み（P5前半＝起動フローの根幹）：
- 初回ワールド選択 `InitialWorldScreen`（地上/水辺/空/虫から1つ→`selectInitialWorldGroup`）。App.tsx の分岐を `selectedInitialWorldGroup` に。旧 `InitialHabitatScreen` は削除。
- ワールド解放＋ブースト `HabitatUnlockScreen`（export名・ルート名は維持、中身を world 化）：`unlockWorldGroup`/`startWorldBoost`、コスト・出現率表示。対象は初回4ワールド。
- ホーム：解放ワールド数・次の解放コスト・`activeWorldBoost`・出現率を world 表示（`WORLD_GROUP_*`、`getNextWorldUnlockCost`）。
- 検証：tsc / npm test(40) / expo export グリーン。

未実装（P5後半）：
- **図鑑** `WorldDexScreen`＋`worldDex` サービスを world(animal/fish/bug) から worldGroup(ground/waterside/sky/bug) タブ・フィルタへ。
- **キャラ詳細** `MonsterDetailScreen`：領域＋ワールド表示（`realmGroup`/`worldGroup`）。
- **DexHome**：カテゴリ別発見数・解放済みカテゴリ表示を worldGroup へ。**MyPage** のボタン文言。
- 旧 habitat 系（`habitatGroups.ts`/`types/habitat`/economy の `unlockedHabitatGroups` 等）の撤去。
- **P6 対象外導線の除去**：バトル/探索/研究/アニメ/個体値/カテゴリ図鑑等を feature flag で無効化・導線から除去。
- **P7 ドキュメント**：DESIGN.md / FEATURE_STATUS.md / INITIAL_RELEASE_DESIGN.md / CHARACTER_DESIGN_GUIDE.md / RELEASE_CHECKLIST.md / FUTURE_EXPANSION_PLAN.md / PRIVACY_NOTES.md へ反映。
- **P8 テスト**：初回選択・ワールド解放・出現抽選・レア・再発見・ワールドブースト・プライバシー。
