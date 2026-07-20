# WORLDAWN 体験設計 — リアルイラストで「集めたくなる」を作る

画像はリアルイラストで統一する。**画像側で派手さを競わない。**
コレクション欲・一覧映え・レア演出・共有導線は、すべて**UI側**で作る。

正本ロジック：[dexPresentation.core.ts](../src/services/dexPresentation.core.ts) / [shareText.core.ts](../src/services/shareText.core.ts) / [discoveryShare.core.ts](../src/services/discoveryShare.core.ts)

## 1. なぜUI側で作るのか

画像にレア演出（オーラ・王冠・エフェクト）を焼き込むと、次の問題が起きる。

- 実在生物に架空の装飾が付き、自然史図鑑として破綻する
- 分類を変更したとき画像を再生成する必要が出る
- 一覧の統一感が崩れる

そこで **画像 = 種の情報**、**UI = 特別感** と役割を分ける。

## 2. 分類別の提示ルール

`getDexPresentation(dexClass)` が一覧・詳細・発見演出・共有導線で使う値をまとめて返す。
**一覧画面・発見演出・詳細画面・シェアカードで同じ値を使うことで一貫性を担保する。**

| 分類 | 色調 | 英字ラベル | 枠幅 | glow | 演出強度 | 共有優先度 |
|---|---|---|---|---|---|---|
| NORMAL | 罫線色・ナチュラル | なし | 1.2 | なし | 0 | 0 |
| RARE | シルバー〜淡い虹彩 | RARE | 2.0 | あり | 2 | 1 |
| LEGEND | ブロンズ／ダークゴールド／アンバー（化石・地層・古代図鑑） | LEGEND | 2.5 | あり | 3 | 2 |
| SECRET | 深い紫／濃紺／青緑／黒金（伝承・禁書） | SECRET | 2.5 | あり | 3 | **3（最優先）** |

- **RARE は金系にしない。** LEGEND と色で衝突し格の違いが読めなくなるため、シルバー〜淡い虹彩に固定。
- **SECRET だけが過剰に浮かないよう**、LEGEND と同じ枠幅・強度に揃え、色調で差を作る。
- glow は**カード内側の枠だけ**に出す。イラストの上へ重ねない。

- **NORMAL は意図的に地味にする。** すべてが派手だと何も特別でなくなる。
- **未発見のあいだは分類を漏らさない。** 一覧カードは既定（NORMAL）の見た目で描画する。
  伝説の完全秘匿仕様（存在・枠・件数・シルエット・ヒントを出さない）は従来どおり維持。

## 3. 発見演出

| 分類 | 入り方 | 英字表示 | 長さ | SE |
|---|---|---|---|---|
| NORMAL | 短めのフェードイン | なし | 600ms | `discovery_normal` |
| RARE | 枠の発光 | RARE DISCOVERED | 1400ms | `discovery_rare` |
| LEGEND | 暗転からゆっくり出現 | LEGEND DISCOVERED | 2400ms | `discovery_legend` |
| SECRET | シルエット → イラスト | SECRET DISCOVERED | 2800ms | `discovery_secret` |

- **初発見は強度 +1 段**。再発見は**常に短いフェード・600ms・再発見音・英字ラベルなし**。
  毎回 "SECRET DISCOVERED" が出ると特別感が薄れるため。
- 初発見の NORMAL だけ「はじめての発見！」の専用見出し。
- **LEGEND / SECRET は発見日時と図鑑番号を目立たせる**（`emphasizeRecordMeta`）。
- 複数同時発見では**いちばん格上の分類**の SE を鳴らす。重い演出のときは DP 音を後ろへずらす。

SE は `discovery_legend` / `discovery_secret` / `dex_complete` を新設した。
**音素材はまだ未配置**のため、現状は無音（`soundManifest` が未配置IDを安全に無視する）。

## 3.5 詳細画面

分類ごとにヘッダ背景・枠・英字ラベルを変える（`headerBackgroundColor` / `headerTextColor`）。

- RARE：上品な希少感（シルバー地）
- LEGEND：復元図鑑・古代感（濃い焦茶地にアンバー文字）
- SECRET：伝承・禁書感（深い紫地に黒金文字）

**本文の可読性は最優先。** ヘッダ色は見出し領域だけに適用し、図鑑情報の本文色は変えない。

## 4. 図鑑完成率の可視化

`dexProgressOf(discovered, total)` ＋ [DexProgressBar](../src/components/dex/DexProgressBar.tsx)。

- **100% は全件発見時のみ。** 99.6% を四捨五入して 100% と出すと「完成したのに完成演出が出ない」ため、**切り捨て**にしている。
- 「あと1種で完成です」「折り返しです」など、**残り数を常に見せて埋めたくさせる**。
- 完成時のみ色を成功色へ変え、達成感を出す。
- ワールド完成演出は `shouldCelebrateWorldComplete()` で**一度だけ**（二重表示しない）。

### 完成演出（通常の発見より大きい）

`completionCelebrationOf(kind, label)` / `pickCompletionCelebration()`。

| 種類 | 内容 | 記念カード |
|---|---|---|
| ワールド完成 | そのワールドを全発見 | **代表生物のイラストを並べる** |
| 分類完成 | その分類を全発見 | なし |
| 初回コンプリート | 最初にどれか1つを完成 | あり |
| 図鑑100%達成 | 全種発見 | あり |

- いずれも強度3（通常の発見より大きい）＋ `dex_complete` SE ＋ 共有導線。
- **同時に成立したら大きい方を1つだけ**出す（full > firstComplete > dexClass > world）。
- 記念カードは枠と余白で作り、**イラストの上へエフェクトを重ねない**（[CompletionCelebrationCard](../src/components/dex/CompletionCelebrationCard.tsx)）。

## 5. 共有導線

すべての文面は `shareText.core.ts` が生成する。

| 導線 | 関数 | 出す条件 |
|---|---|---|
| 1体の発見 | `buildDiscoveryShareText` | 結果画面。レア以上はボタン文言が「この発見を見せる」になる |
| ワールド完成 | `buildWorldCompleteShareText` | 完成時 |
| 今日の発見 | `buildTodayShareText` | ホーム。**その日の発見が0件なら出さない** |
| 今週のコレクション | `buildWeeklyShareText` | ホーム。**今週0種なら出さない** |

- 空のカードを出して押させない（`ShareNudgeCard` は `message` が undefined なら何も描画しない）。
- 進捗（`図鑑 30/69（43%）`）を必ず添える。見た人の参加動機になり、本人のコンプリート欲も押す。

### プライバシー（テストで固定）

共有文面に次を**絶対に含めない**。`findShareTextLeaks()` が最終防衛線として検出する。

- バーコード/QRの値（8桁以上の数字列）
- sourceHash（16桁以上の16進文字列）
- 位置座標
- 秒単位の時刻

公式番号は7桁までを想定。8桁以上はバーコード値と区別できないため共有しない。

## 6. 一覧映え

図鑑一覧は3列グリッドの統一カード。

- 枠色・背景・バッジは `dexClass` から決まる（カードごとに独自装飾をしない）
- 未発見は共通シルエット。名前も姿も出さない
- サムネイルの背景は全種共通（レアだけ背景色を変えると画像の統一感が崩れるため）

画像側の統一（サイズ感・向き・光源・描画密度）は [00_ART_DIRECTION.md](encyclopedia-prompts/00_ART_DIRECTION.md) の「一覧での統一」を参照。

## 7. 虫が敬遠される問題

リアル路線で最大のリスク。[05_ARTHROPODS.md](encyclopedia-prompts/05_ARTHROPODS.md) に専用指示を置いた。

要点：口器・複眼・毛・トゲ・濡れた質感を**強調しすぎない**（消すのではなく目立たせない）。
シルエット・角・翅・体色・模様で同定する。標本感とホラー感を避ける。

**縮小表示で確認する。** 等倍で良く見えても一覧で不快なら不合格。

## 8. 変更していないもの

この体験設計は表示層のみ。次には一切影響しない。

- 出現確率・抽選重み・乱数ロジック
- 抽選用 `rarity` の値
- LEGEND のワールド完成による解放条件と完全秘匿仕様
- 発見記録・発見証明・公式番号

確率不変は [spawnInvariance.test.ts](../tests/spawnInvariance.test.ts) が6階層で証明している。

## 9. 残課題

- **シェアカードの画像化**：現在の共有はテキストのみ。`ShareCard` は画面内プレビューで、画像として書き出していない。画像添付には `react-native-view-shot` 等の新規依存が必要なため見送り。
- `ShareCard` が旧 family/element 系のデータを参照している（表示は成立するが、`dexClass` ベースへ寄せる余地あり）。
- **レア演出SEの音素材が未配置**（`discovery_legend` / `discovery_secret` / `dex_complete`）。現状は無音で動作する。`assets/sounds/` へ配置後 `npm run gen:sounds` を実行すると有効になる。
- **発見演出の入り方は値として定義済みだが、アニメーション実装は未着手**。`revealEntranceFor()` が `fade` / `glow` / `dim_then_rise` / `silhouette_then_reveal` を返すので、`ScanPresentation` 側で分岐すれば適用できる。現状は英字ラベル・SE・枠色・共有強調までが反映されている。
- 分類完成 / 初回コンプリート / 図鑑100%の判定は `pickCompletionCelebration()` に用意済みだが、**画面へ配線しているのはワールド完成のみ**。
