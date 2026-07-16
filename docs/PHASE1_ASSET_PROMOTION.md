# Phase 1 パイロット画像 → 正式アセット 昇格手順

パイロット画像（`assets/characters/_pilot/phase1/`）を**正式アセット**へ採用するための手順。

> **Phase 1A ではこの昇格処理を実行しない。** 本書は Phase 1B 以降のための手順書である。
> `selected/` へ入っただけでは正式採用ではない。

---

## 0. 前提

- **character ID は変更しない**（`ground_sheep` 等は永久不変・rarity非依存）
- **正式パスは変更しない**：`assets/characters/<world>/<英名>/<英名>.png`（同名・同パスへ置換する）
- **rarity / releaseStatus / 公式番号 / 発見履歴 / 発見証明を変更しない**
- 初期89 ID・rarity構成（normal84 / rare1 / legendary4）・ground normal 完成対象69 を**変えない**

---

## 1. 視覚評価レポート形式

保存先：`assets/characters/_pilot/phase1/<character-id>/reports/evaluation.json`

```json
{
  "characterId": "ground_sheep",
  "candidate": "assets/characters/_pilot/phase1/ground_sheep/candidates/candidate_02.png",
  "speciesRecognition": 19,
  "biologicalNaturalness": 18,
  "collectibleAppeal": 14,
  "silhouetteReadability": 9,
  "materialQuality": 9,
  "smallScreenReadability": 9,
  "styleConsistency": 9,
  "originality": 5,
  "totalScore": 92,
  "automaticReject": false,
  "rejectReasons": [],
  "strengths": ["羊毛の塊感が繊維として読める", "巻き角の螺旋が小サイズでも判別できる"],
  "weaknesses": ["後肢の蹄がやや不明瞭"],
  "revisionInstructions": "後肢の蹄の割れを1段濃い陰影で明示する",
  "reviewedAt": "2026-07-16T00:00:00Z"
}
```

| 項目 | 配点 |
|---|---|
| `speciesRecognition`（種の識別性） | 20 |
| `biologicalNaturalness`（生物学的自然さ） | 20 |
| `collectibleAppeal`（プレミアムゲームアートとしての魅力） | 15 |
| `silhouetteReadability`（シルエットの読みやすさ） | 10 |
| `materialQuality`（素材表現） | 10 |
| `smallScreenReadability`（小画面での認識性） | 10 |
| `styleConsistency`（全5種での画風統一） | 10 |
| `originality`（独自性・既存IP非類似） | 5 |
| **`totalScore`** | **100** |

- **`totalScore` が 88 未満の候補を `selectedCandidate` に指定してはいけない**
- **`automaticReject` が true の候補は、点数にかかわらず採用してはいけない**
- `automaticReject` の条件：脚・指・角・尾・耳の数や構造が不自然／身体部位の融合／本来ない身体部位／人間化／マスコット化／巨大なアニメ目／衣装・装備／背景や地面／透明風の市松模様／単色背景の残存／主要部位の切れ／既存有名IPへの過度な類似／写真の切り抜きにしか見えない／普通の教材用図鑑イラストにしか見えない

---

## 2. 昇格手順（この順に実行する）

| # | 手順 | 合格条件 |
|---|---|---|
| 1 | **技術検証成功** | `npm run validate:phase1-pilot` が exit 0（PNG・1024×1024・IEND・アルファ・重複なし・正式パスへの誤保存なし・manifest誤登録なし） |
| 2 | **視覚評価 88点以上** | `reports/evaluation.json` の `totalScore >= 88` かつ `automaticReject=false` |
| 3 | **5種全体の統一評価成功** | 5種を並べて：同じゲームの収集物に見える／同じ照明・レンダリング品質／輪郭線・彩度・コントラストが大きくばらつかない／写真と写実画とアニメ絵が混在しない／全員が同じポーズ・同じ顔の向き・同じかわいさに寄っていない／大型と小型の存在感が適切／毛・皮膚・鱗・針の素材差が明確／一覧で区別できる／legendary のような派手さがない。**1種だけ外れている場合はその1種だけ再生成する** |
| 4 | **正式ID確認** | `assets/characters/phase1-pilot.json` の `id` が master に存在し、初期89 IDに含まれること |
| 5 | **正式パス確認** | `officialAssetPath` が `assets/characters/<world>/<英名>/<英名>.png` であること（ID/パスを変えない） |
| 6 | **現在画像のバックアップ確認** | 置換前の正式画像が Git 履歴で復元可能であること（**未コミットの正式画像は先にコミットしておく**）。※Sheep.png のように**破損版しか履歴に無い場合はロールバック先が無い**ことを明記する |
| 7 | **同名・同パスへ置換** | `selected/` の画像を `officialAssetPath` へコピー（**リネーム・移動・削除をしない**） |
| 8 | **manifest 再生成** | `npm run gen:catalog`（**手動で manifest を編集しない**） |
| 9 | **サムネイル再生成** | 同上（`gen:catalog` がサムネイルも生成する） |
| 10 | **原画とサムネイルのキー集合確認** | `CHARACTER_IMAGES` と `CHARACTER_THUMBS` のキー集合が**完全一致**すること（現在は Sheep 破損により 89/88） |
| 11 | **`npm run validate:release-assets`** | **exit 0**（initial 89/89/0・corrupt 0） |
| 12 | **app tests** | `node --test "tests/**/*.test.ts"` が全 pass |
| 13 | **server tests** | `cd server && node --test "tests/**/*.test.ts"` が全 pass |
| 14 | **typecheck** | app / server とも `npx tsc --noEmit` が exit 0 |
| 15 | **Android export** | `npx expo export --platform android` が exit 0 |
| 16 | **実機表示確認** | 実機またはシミュレータで、図鑑一覧・キャラ詳細・発見結果・共有カードでの表示を目視確認する（**この環境では実施不可のため、実施できない場合は「未検証」と明記する**） |
| 17 | **昇格記録** | `phase1-pilot.json` の `promotedToOfficial` を true にし、`score` と `selectedCandidate` を記録する |

---

## 3. ロールバック方法

| 状況 | 手順 |
|---|---|
| 置換した画像に問題が見つかった | `git checkout -- assets/characters/<world>/<英名>/<英名>.png` で置換前へ戻す → `npm run gen:catalog` → `validate:release-assets` |
| 複数種を一括置換して問題が出た | **1種ずつ昇格すること**（一括置換は禁止）。問題種のみ上記で戻す |
| Git 履歴に正常な旧版が無い（例：Sheep.png） | **ロールバック先が存在しない**。この場合は**置換前に必ず新画像の検証を完了**させ、旧破損版へは戻さない |
| manifest だけ壊れた | `npm run gen:catalog` で再生成（**手動編集しない**） |

---

## 4. 禁止事項（昇格時）

- 画像 manifest への**手動追加**（必ず `gen:catalog` を通す）
- サムネイルの**拡大による原画化**
- 破損PNGへの **IEND だけの追記**
- **character ID / rarity / releaseStatus / world の変更**
- **公式番号 / 発見履歴 / 発見証明の変更**
- **初期89件の増減**（意図的変更は `WORLDAWN_ALLOW_INITIAL_CHANGE=1` が必要）
- `_pilot` 配下の画像を **catalog / seed / manifest へ登録すること**
- **`validate:release-assets` を通すための例外追加**
- release gate が失敗している状態を「リリース可能」と報告すること
