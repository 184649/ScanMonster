# WORLDAWN 音仕様書（実装状況つき）

初回リリースは **BGMなし・キャラ個別鳴き声なし・共通SEのみ**。目的はスキャンの手触り、
発見・レア・ワールド解放の高揚、DP/再発見を前進として感じさせること。

## 実装の全体像

| 要素 | 実体 |
| --- | --- |
| 再生ライブラリ | `expo-audio`（Expo Go 同梱・SDK 54） |
| 再生API | `playSound(id: SoundId)` … [src/services/soundService.ts](../src/services/soundService.ts) |
| SoundId / 既定設定 | [src/types/sound.ts](../src/types/sound.ts)（`SoundId`, `SoundSettings`, `DEFAULT_SOUND_SETTINGS`） |
| 素材マニフェスト | [src/assets/soundManifest.generated.ts](../src/assets/soundManifest.generated.ts)（自動生成・実在ファイルのみ） |
| マニフェスト生成 | `npm run gen:sounds` … [scripts/generateSoundManifest.js](../scripts/generateSoundManifest.js) |
| 音設定 | `AppSettings.seEnabled` / `AppSettings.seVolume`（設定画面「サウンド」） |

### 素材未配置でも落ちない仕組み（重要）
- Metro は存在しないファイルの `require` でバンドルが壊れる。よって **実在する素材だけ**を
  `soundManifest.generated.ts` に載せる。`npm run gen:sounds` が `assets/sounds/` を走査し、
  実在ファイルのみ `require` を書き出す。
- マニフェストに無い `SoundId` は `playSound` が **無音（no-op）**として安全に処理する。
- 生成・再生の失敗は `__DEV__` 時のみ `console.warn` し、UI 処理は止めない。
- 現在は素材0のため全SEが無音。素材を置いて `npm run gen:sounds` を実行すると自動で鳴り始める。

## 音素材の追加手順
1. 下表のファイル名で `assets/sounds/` に配置（拡張子は `mp3` / `m4a` / `wav`、優先順もこの順）。
2. `npm run gen:sounds` を実行。
3. 実機/Expo Go で確認。設定画面「サウンド」で ON/OFF・音量を切替。

## SoundId ↔ ファイル名 ↔ 再生タイミング（実装済みトリガ）

| SoundId | ファイル名 | 再生タイミング | 実装箇所 | 長さ目安 |
| --- | --- | --- | --- | --- |
| tap | sound_ui_tap | 全 `PrimaryButton` 押下（既定） | PrimaryButton | 0.05–0.15s |
| cancel | sound_ui_cancel | 戻る/閉じる（`soundId="cancel"` 指定箇所） | PrimaryButton prop | 0.08–0.20s |
| error | sound_ui_error | 同日同コード/発見失敗/解放・ブースト不可/画像読取失敗 | ScanScreen, HabitatUnlock | 0.10–0.30s |
| scan_start | sound_scan_start | スキャン画面フォーカス時 | ScanScreen `useFocusEffect` | 0.20–0.50s |
| scan_read | sound_scan_read | 有効コード検出時（カメラ/写真） | ScanScreen | 0.20–0.40s |
| scan_success | sound_scan_success | 新規発見あり→結果画面へ遷移する時 | ScanScreen `autoDiscover` | 0.40–0.80s |
| discovery_normal | sound_discovery_normal | 通常キャラ初発見（結果表示時） | SummonResult `useEffect` | 0.80–1.30s |
| discovery_rare | sound_discovery_rare | レア発見（結果表示時） | SummonResult `useEffect` | 1.50–2.50s |
| rediscovery | sound_rediscovery | 既所持キャラの再発見（結果表示時） | SummonResult `useEffect` | 0.50–1.00s |
| dp_gain | sound_dp_gain | 発見音の後に順に再生（重ねない） | SummonResult `useEffect` | 0.30–0.70s |
| world_unlock | sound_world_unlock | ワールド解放成功時 | HabitatUnlock | 1.50–2.50s |
| boost_activate | sound_boost_activate | ワールドブースト発動成功時 | HabitatUnlock | 0.80–1.50s |
| favorite | sound_favorite | お気に入り登録/解除時 | SummonResult, MonsterDetail | 0.30–0.70s |
| title_unlock | sound_title_unlock | 称号獲得時 | **未トリガ（素材枠のみ）** | 1.00–1.80s |

> `title_unlock` は §14 の必須条件外（「可能なら入れる」）。称号は発見処理内で自動解放される
> ため、獲得検知の実装は将来対応。SoundId と素材枠は用意済み。

## 二重再生の回避
- 専用SEを鳴らすボタンは `PrimaryButton` に `soundId="none"` を渡し、`tap` との重複を防ぐ
  （ワールド解放/ブースト、お気に入り、サウンド設定トグル）。
- スキャン→発見の流れは `scan_read`（検出）→ `scan_success`（遷移）→ 発見音 → `dp_gain` の
  順で時間差再生し、1画面遷移でSEを重ねすぎない（§13 準拠）。

## 音設定
```ts
type SoundSettings = { seEnabled: boolean; seVolume: number /* 0.0–1.0 */ };
const DEFAULT_SOUND_SETTINGS = { seEnabled: true, seVolume: 0.8 };
```
- 設定画面「サウンド」: 効果音 ON/OFF、効果音音量（20/40/60/80/100% を循環）。
- SE OFF の間は `playSound` が即 return（一切鳴らない）。
- 音量変更時は新音量で `tap` をプレビュー再生。

## トーン方針（素材制作用）
明るい／透明感／スマホゲームらしい／子どもっぽすぎない／うるさすぎない／連続でも疲れない。
避ける: ホラー、強い金属音、派手なガチャ演出、長いファンファーレ、実在動物のリアル鳴き声、
課金ガチャ風の射幸SE。ワールドブーストはレア率アップと誤解される音にしない。

### 生成AI向けプロンプト例
- 通常発見: `A short, bright, magical discovery sound effect for a mobile collection game. Soft bells, light sparkle, warm and friendly, ~1s, no vocals, no copyrighted melody.`
- レア発見: `A special rare discovery fanfare for a mobile collection game. Magical, sparkling, premium but not gambling-like, short build-up then bright reveal, ~2s, no vocals.`
- ワールド解放: `A world unlock sound for a mobile adventure collection game. New world opening, soft low swell then bright magical expansion, ~2s, warm, hopeful, no vocals.`
- ブースト: `A short energy activation sound. Magical aura, soft rising tone, subtle power-up, not aggressive, ~1s, no vocals.`
- スキャン成功: `A clean scan success sound. Digital but warm, short confirmation, light sparkle, ~0.5s, no harsh beep.`

## §14 完成条件チェック
- [x] 主要SEの呼び出し実装（scan_start/read/success、discovery_normal/rare、rediscovery、dp_gain、world_unlock、boost_activate）
- [x] 設定画面で SE ON/OFF・音量を切替可能
- [x] SE OFF 時は鳴らない
- [x] 素材が読み込めなくてもアプリが落ちない（実在ファイルのみ require＋no-op）
- [x] 設計書に音仕様を反映（本書）
- [ ] **素材（assets/sounds/*.mp3）の配置**（AIでは音声生成不可のため要別途用意）＋ `npm run gen:sounds`
