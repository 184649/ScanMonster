# キャラクターマスター（唯一の正本）

キャラクター情報は**1つの正本**から server seed と app catalog を生成する。手書きの二重管理をしない（二度と「server 8体 vs app 74体」の乖離を作らない）。

## 正本

**真の編集原本は `assets/characters/Character.xlsx`**（`npm run export:master` → `character_master.json`）。ただし **Xlsx の rarity 列は normal|rare しか表現できず、legendary / releaseStatus を持てない**。そのため分類と公開状態は別レイヤが正本になる：

- **`assets/characters/character_master.json`** … Xlsx由来のベース roster（英名/キャラ名/和名/rarity(normal|rare)/no）。**生成物なので手編集しない**（`export:master` で再生成される）。
- **`assets/characters/character-classification.json`** … **legendary 分類（`rarity`）と `releaseStatus` の正本レイヤ**。Xlsxが表現できない情報を保持する第一級の正本（一時的なoverrideではない）。id を変えずに実効 rarity を上書きし、releaseStatus を明示する。
- 実アセット … `assets/characters/<world>/<英名>/<英名>.png`（旧構造）または `<world>/<rarity>/<英名>.png`（新構造）。generatorが両対応。

> 将来 Xlsx に legendary/releaseStatus 列を追加して `export:master` に反映すれば、分類も Xlsx 側へ一本化できる。それまでは classification.json が分類・公開状態の正本。

## releaseStatus（初期リリースの明示管理）

`hasImage` は初期リリース対象の**決定要因にしない**。releaseStatus を明示する：

| 値 | 意味 | server seed | app catalog(初期UI) |
|---|---|---|---|
| `initial` | 初期リリース対象 | ○ | ○ |
| `future` | 将来（art待ち含む） | × | × |
| `inactive` | 非アクティブ | × | × |
| `qa` | QA専用 | ×（seed.tsのQA枠で別管理） | × |

- 決定順：`byId[id] > worldDefault[world] > "future"`。
- **hasImage は releaseStatus を決定・降格しない**。initial なのに画像が無いキャラは `initial` のまま **missing** として扱う（future にしない）。
- 現状 worldDefault：ground=initial / sky=initial / waterside=future / bug=future / phantom=future / planet=future（**暫定・要承認**）。
- **現状：canonical initial=89（ground74+sky15）/ asset complete=85 / missing=4**（White Tiger・Tsuchinoko・Yeti・Underground Dweller。すべて ground、releaseStatus=initial）。

## release gate（画像欠損時の安全動作）

- `npm run validate:release-assets` … canonical から 89/85/4 を集計し、**missing が1体でもあれば非0終了**（現状 4 欠損で FAILED が正）。通常の `npm test` とは別。
- `npm run gen:catalog` / `gen:seed` … **initial 画像欠損があれば既定で中止**（既存生成物を壊さない・server/appを不一致に部分再生成しない＝§14 原子性）。`WORLDAWN_ALLOW_INCOMPLETE=1` で「画像がある initial のみ（=85 buildable）」の安全ビルドを生成できる。
- 画像解決は **実効 rarity** フォルダで行う：`assets/characters/<world>/<effRarity>/<英名>.png`（例 legendary は `ground/legendary/Tsuchinoko.png`）または旧構造 `assets/characters/<world>/<英名>/<英名>.png`。
- **4画像を配置後**：`npm run gen:catalog && npm run gen:seed` を実行すると server seed / app catalog / image が同一の 89 集合から一括再生成される。

## 生成物（どちらも AUTO-GENERATED・手編集しない）

| コマンド | 出力 | 用途 |
|---|---|---|
| `npm run gen:catalog` | `src/data/characterCatalog.generated.ts`（`CATALOG_NORMALS/RARES/LEGENDARIES`）＋ `src/assets/characterImages.generated.ts` | アプリ図鑑・画像（Metro静的require） |
| `npm run gen:seed` | `server/src/characterSeed.generated.ts`（`SEED_CHARACTERS`） | サーバー seed（`npm run db:seed` が投入） |

両者は**同じ正本＋同じ `catalogBuild.js`** から生成されるため、rarity/world/母集団が常に一致する。CIは [characterMasterParity.test.ts](../tests/characterMasterParity.test.ts) で乖離を検出する。

## 初期リリース母集団のルール（暫定・要承認）

`SEED_CHARACTERS` = **基本4ワールド（ground/waterside/sky/bug）∩ 承認済みアセットが解決できる（hasImage）** キャラのみ。
- 画像未投入キャラ・将来ワールド（phantom/planet 等）は初期リリース対象外（監査 [CHARACTER_DATA_AUDIT.md](CHARACTER_DATA_AUDIT.md) で保留）。
- **normalコンプリート→legendary解放**の判定母集団は「そのワールドの available な normal 全体」。母集団が server/app で一致していることがこのルールの前提。

## 手順

- **新キャラ追加**：`Character.xlsx` に行を足す → `npm run export:master` で `character_master.json` を再生成 → classificationでrarity/releaseStatusを確認 → 画像を配置 → `gen:catalog` と `gen:seed` を実行。
- **rarity 修正**：`rarity-overrides.json` に `id→rarity` を追加（**id は変えない**）→ 再生成。
- **world 変更**：原則しない（id が world を含むため）。必要時は監査で影響評価。
- **secret 追加**：`rarity: "secret"` は通常 catalog（NORMALS/RARES/LEGENDARIES）に**出さない**（`catalogBuild` は secrets を別バケットにし、generator は書き出さない）。未発見ユーザーに件数・名前・シルエットを漏らさない。
- **future-only**：基本4ワールド外／画像未投入は seed から自動除外される。

## ID と rarity（技術的負債）

既存 id は `ground_rare_fenrir` のように rarity を含むものがある。rarity を legendary に修正しても **id は据え置く**（`discovery_records`・公式番号・証明との関連を壊さないため）。id と実効 rarity の不一致は**既知の負債**として許容し、破壊的 rename はしない（将来の新キャラは `ground_fenrir` のような rarity 非依存 id を推奨）。

## Character.xlsx ロスター拡張（2026-07-11）

確定済みの基本4ワールドへ、既存行を削除・並べ替えずにキャラクターを追記した。normalは各ワールド最低100体を満たす。rareは「実在する希少種・希少個体」を原則とし、伝説・空想上の存在は追加していない。

| world | normal（変更前→変更後） | rare（変更前→変更後） | 追加行 |
|---|---:|---:|---|
| ground | 69 → **100** | 5 → **7** | `Character.xlsx` ground `A77:G109` |
| waterside | 116 → **121** | 7 → **9** | `Character.xlsx` waterside `A125:G131` |
| sky | 15 → **100** | 0 → **2** | `Character.xlsx` sky `A17:G103` |
| bug | 100 → **105** | 2 → **4** | `Character.xlsx` bug `A104:G110` |

追加normalの選定方針：

- ground：既存69体と重複しない哺乳類・爬虫類を追加し、体型・生態・地域の幅を広げる。
- waterside：海生哺乳類、軟体動物、エイ、節足動物を追加し、既存の魚中心ロスターを補完する。
- sky：猛禽、水鳥、海鳥、地上性鳥類、樹上性鳥類、小型鳴禽を追加し、normalを100体へ拡張する。
- bug：大型甲虫、蛾、カマキリ、クモを追加し、既存100体と英名が重複しないようにする。

追加rare：

| world | rare additions |
|---|---|
| ground | Saola / Iberian Lynx |
| waterside | Vaquita / Axolotl |
| sky | Kakapo / Japanese Crested Ibis |
| bug | Lord Howe Island Stick Insect / Queen Alexandra's Birdwing |

### 公開状態の注意

- 今回の変更は `Character.xlsx` のロスター拡張であり、画像生成・公開承認を意味しない。
- `ground` / `sky` はclassificationの`worldDefault=initial`であるため、`export:master`前に新規IDの`releaseStatus`を`byId`で明示し、意図せずinitial母集団へ入らないようにする。
- `waterside` / `bug`も、画像・QA・公開時期が確定するまでは既存のreleaseStatus方針を維持する。
- phantom / planetシートは将来ワールドとして内容を保持し、Excel上ではグレー表示にした。行削除・world変更・releaseStatus変更は行っていない。
