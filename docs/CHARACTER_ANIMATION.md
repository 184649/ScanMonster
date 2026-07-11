# キャラクターアニメーション 設計 & 素材配置ガイド（WORLDAWN）

> 注: スキャン成立→結果表示の「発見演出（UIエフェクト）」はキャラアニメとは別物です。そちらは [SCAN_PRESENTATION.md](SCAN_PRESENTATION.md) を参照。本書はキャラ画像のフレームアニメの話です。

このドキュメントの通りに**画像を配置 → `npm run gen:frames` → 再ビルド**すれば、期待どおりのフレームアニメが動きます。
参照実装は **bear**（配置済み）。他キャラは bear と同じ形で置くだけで自動対応します。

---

## 0. どこで動くか（2場面だけ）

| 場面 | 画面 | scene | クリック |
|------|------|-------|----------|
| スキャン発見時 | `SummonResultScreen` | `"scan"` | なし |
| 図鑑詳細表示時 | `MonsterDetailScreen` | `"detail"` | あり（3種ランダム）|

図鑑一覧・ホームでは動かしません（ホーム常駐/来訪は廃止済み）。

---

## 1. 正規のアセット配置（この形にする）

キャラIDごとに、下記フォルダを作ります。**キャラID = 種族の imageKey**（例: クマ種は `bear`）。

```
assets/characters/<characterId>/
  manifest.json            # 任意（あれば fps/loop/間隔を優先。無くても動く）
  base/
    shadow.png             # 任意（足元の影。あれば背面に敷く）
  scan_appear/   01.png 02.png ...   # 発見登場（1回）
  detail_appear/ 01.png 02.png ...   # 図鑑詳細の登場（1回）
  idle/          01.png 02.png ...   # 待機ループ（必須・基本）
  normal/        01.png 02.png ...   # 通常モーション（定間隔で1回）
  click_01_happy/       01.png ...   # クリック：喜ぶ
  click_02_surprise/    01.png ...   # クリック：驚く
  click_03_affection/   01.png ...   # クリック：甘える/近づく
```

ルール：
- 各モーションフォルダに **連番PNG**（`01.png` `02.png` …、透過、ゼロ埋め推奨）。
- フレーム数はモーションごと・キャラごとに**バラバラでOK**（実在ファイルだけ再生）。
- 全フレームは**同一キャンバス・同一サイズ**（例 1024×1024）で、キャラ位置を揃える（ズレるとガタつく）。
- 透過PNG前提。背景は入れない。**画像の色・比率・顔つきは変えない**（変形/移動/エフェクト中心）。
- `base/shadow.png` は任意。置けば足元に影が出る。同じキャンバスサイズにすると位置が合う。

> bear は現在この正規レイアウト（`assets/characters/bear/scan_appear/…`）に配置済みです。これを見本にしてください。

---

## 2. manifest.json（任意・あれば優先）

置かなくても動きます（フォルダの連番PNGを既定速度で再生）。速度や間隔を制御したいときに置きます。

```jsonc
{
  "character_id": "bear",          // キャラID（フォルダ名と揃える）
  "motions": {
    "scan_appear":   { "frames": 6, "fps": 12, "loop": false },
    "detail_appear": { "frames": 4, "fps": 10, "loop": false },
    "idle":          { "frames": 6, "fps": 6,  "loop": true },
    "normal":        { "frames": 8, "fps": 8,  "loop": false,
                       "interval_seconds": { "min": 4, "max": 7 } },  // idle中にnormalを挟む間隔
    "click_01_happy":    { "frames": 6, "fps": 12, "loop": false },
    "click_02_surprise": { "frames": 6, "fps": 12, "loop": false },
    "click_03_affection":{ "frames": 6, "fps": 12, "loop": false }
  },
  "shadows": { "base": "base/shadow.png" }
}
```

- `fps` → 1フレーム時間 = `1000/fps`（ms, 60〜200にクランプ）。無指定時の既定はモーション別（idle=150ms/normal=120ms/appear=90〜100ms/click=85ms、80〜140ms目安）。
- `interval_seconds`（normalのみ）→ idle中に normal を挟む間隔。無指定は 4〜8秒。
- ジェネレータは manifest の `path` 等の**ファイル位置は見ず**、フォルダを直接走査します（`path` は資料用でOK）。多少ネストしていても `manifest.json` を再帰的に探します。

---

## 3. 期待される動作フロー

### scene="scan"（発見結果）
```
scan_appear（1回） → idle ループ → 4〜8秒ごとに normal を1回 → idle に戻る → …（繰り返し）
```
クリック反応なし。発見演出は詳細より少し印象的（appearを用意）。

### scene="detail"（図鑑詳細）
```
detail_appear（1回） → idle ループ → 4〜8秒ごとに normal を1回
タップ → click_01_happy / click_02_surprise / click_03_affection からランダム1つ → idle に戻る
```
- クリックは**直前と同じを避けて**ランダム選択。
- クリック再生中の連打は無視（現在のクリックを優先）。normal自動再生はクリック中だけ一時停止。
- 画面を離れると停止、unmountでタイマー解除。

不足時のフォールバック：あるモーションが無ければ安全にスキップ（appear無し→idleから開始、normal無し→idleのみ、click無し→無反応）。**素材が無いキャラ全体**は、既存のトランスフォーム演出 `CharacterAnimator` にフォールバックします（フレーム未整備でもアプリは動く）。

---

## 4. ビルド & 反映手順

```bash
# 1) 画像を上記レイアウトで配置
# 2) 静的マニフェストを再生成（Metroは動的requireできないため必須）
npm run gen:frames        # → src/assets/characterFrames.ts を再生成
# 3) 再バンドル
npx expo start -c         # キャッシュクリア付きで起動、実機はリロード
# 4) 確認（任意）
npx tsc --noEmit && npx expo export --platform ios   # 全フレームのrequire解決を検証
```

コード変更は不要。`characterId` に `<id>` を渡すだけで自動再生されます（種族の imageKey を渡している）。

---

## 5. 新キャラを追加する手順（例：dog）

1. `assets/characters/dog/` に `scan_appear/ detail_appear/ idle/ normal/ click_01_happy/ click_02_surprise/ click_03_affection/` を作り、各に連番PNGを入れる。
2. （任意）`assets/characters/dog/manifest.json` と `assets/characters/dog/base/shadow.png` を置く。
3. `npm run gen:frames` を実行。`Characters with frames:` に `dog(n motions)` が出れば成功。
4. `npx expo start -c` で再バンドル。dog の発見結果・図鑑詳細でフレーム再生されます。

`characterId` は `family.imageKey`（例 `"dog"`）で渡しているので、フォルダ名を imageKey に一致させれば紐づきます。

---

## 6. コンポーネント（`components/CharacterMotionPlayer.tsx`）

```tsx
<CharacterMotionPlayer characterId="bear" scene="scan"   size={220} />
<CharacterMotionPlayer characterId="bear" scene="detail" size={230}
  onPress={() => {/* SE・親密度など */}} fallback={/* 素材が無い時の代替 */} />
```
props：`characterId, scene("scan"|"detail"), size?, autoPlay?, onPress?, disabled?, fallback?`。

内部状態：currentMotion / isPlayingOneShot / lastClickMotion / normalTimer（画面離脱・unmountで必ずclear）。

---

## 7. パフォーマンス方針（低スペック対策・重要）

- **同時に載せる画像は最大3枚**：影 ＋ 静止ポーズ下地(idle先頭) ＋ 現在フレーム。
  - 全フレームの重ね置きや全frameの `Image.prefetch` は**しない**（過去、1024px×多数のデコードで発見詳細が影だけ/空白になった）。
  - 下地を常時表示するので、フレーム差し替え中も空白にならない。
- 1体だけをアニメーション（図鑑一覧では使わない）。
- 素材が 1024×1024 と大きい場合、**512px程度へ縮小**するとメモリ・デコードが約1/4になり、低スペック機で安定します（任意）。フレーム数を欲張りすぎない（各6〜8枚で十分自然）。

---

## 8. デバッグ表示

`src/constants/featureFlags.ts` の `SHOW_CHARACTER_IMAGE_DEBUG` を `true` にすると、プレイヤー左下に
`bear/idle 3/6`（キャラID/現在モーション 現在フレーム/総フレーム）が出ます。**数字が動けば再生中**。位置確認にも使えます。リリース時は `false`。

---

## 9. アニメが出ない時のチェックリスト

1. `npm run gen:frames` を実行したか（配置後に必須）。ログに `bear(7 motions)` 等が出るか。
2. フォルダ名＝`characterId`（種族の `imageKey`）になっているか。詳細画面はレア/姿変更中だとフォールバック（フレーム非対象）になる点に注意。
3. 連番PNGが `01.png` から始まっているか（空フォルダは無視される）。
4. `npx expo start -c`（キャッシュクリア）で再バンドル・実機リロードしたか。古いバンドルだと反映されない。
5. `SHOW_CHARACTER_IMAGE_DEBUG=true` で数字が動くか確認（動く＝再生中／画像だけ出ない＝素材の中身/透過/サイズ問題）。
6. 端末が重い場合は素材を512pxへ縮小、フレーム数を削減。
7. `npx expo export --platform ios` が成功するか（失敗＝require解決不可＝配置/パスの問題）。

---

## 10. 参照

- 生成スクリプト：`scripts/generateCharacterFrames.js`
- 生成物（手編集しない）：`src/assets/characterFrames.ts`
- プレイヤー：`src/components/CharacterMotionPlayer.tsx`
- フォールバック：`src/components/CharacterAnimator.tsx`
- 全体設計：`docs/DESIGN.md` §13
