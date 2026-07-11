# WORLDAWN

WORLDAWNは、バーコードやQRコードをスキャンしてキャラクターを発見し、DPで出現カテゴリを解放しながら図鑑と称号を進めるスマホアプリです。

開発フォルダ名は歴史的経緯で `ScanMonster` のままの場合があります。

## サーバー連携型への変更（重要）

WORLDAWN は **サーバー連携型** に移行しました。

- 公式発見番号 `characterDiscoveryNo` は**必ずサーバーが採番**（キャラごとに1から・全ユーザー共通・DBは BIGINT、APIは string、`Number()` 変換禁止）。
- アプリは sourceHash を送るだけで**採番しない**。**オフラインでは新規スキャン不可**（図鑑・発見証明・カレンダー・ログはローカルキャッシュで閲覧可）。
- API サーバーは `server/`（Node + TypeScript + Express + PostgreSQL、ConoHa VPS / Docker Compose）。
- ローカル採番は「暫定（非公式）」に降格（`DiscoveryRecord.numberSource`）。
- 接続先は `EXPO_PUBLIC_API_BASE_URL`（未設定＝ローカルモード）。

手順書: [docs/LOCAL_DEV_AND_TEST.md](docs/LOCAL_DEV_AND_TEST.md) ／ [docs/DEPLOY_CONOHA_VPS.md](docs/DEPLOY_CONOHA_VPS.md) ／ [docs/APP_RELEASE.md](docs/APP_RELEASE.md) ／ 設計: [docs/DISCOVERY_SYSTEM.md](docs/DISCOVERY_SYSTEM.md)

## 初回リリースの遊び方

```text
スキャン
↓
キャラクター発見 / 再発見
↓
DP獲得
↓
カテゴリ解放
↓
出現対象が増える
↓
気配ブーストで狙うカテゴリを出やすくする
↓
図鑑と称号が進む
```

初回リリースでは、探索、研究、ミッション、個体差コレクション、アニメーション、課金、広告は入れません。

機能一覧は [docs/FEATURE_STATUS.md](docs/FEATURE_STATUS.md) を参照してください。

## 主な機能

- バーコード/QRコードのスキャン
- 写真ライブラリからのコード読み取り
- 同日同コード制限
- キャラクター発見
- 再発見
- 図鑑
- キャラ詳細
- DP
- 初回カテゴリ選択
- DPによるカテゴリ解放
- 気配ブースト
- レア出現
- 称号
- マイページ
- 設定
- ローカル保存

## 初回カテゴリ

最初に以下から1つを選びます。選んだカテゴリだけが最初の出現対象になります。

- 陸の動物
- 水辺の生き物
- 空の生き物
- 虫・小さな生き物

その後、DPでカテゴリを解放できます。

| 解放数 | コスト |
| --- | ---: |
| 1カテゴリ目 | 0 DP |
| 2カテゴリ目 | 1,000 DP |
| 3カテゴリ目 | 2,300 DP |
| 4カテゴリ目 | 4,200 DP |
| 5カテゴリ目 | 7,000 DP |
| 6カテゴリ目 | 11,000 DP |

## 気配ブースト

気配ブーストは、300 DPを使って次の10回の有効スキャンだけ特定カテゴリを出やすくする機能です。

- 解放済みカテゴリにだけ使用可能
- 同時に1つだけ使用可能
- 同日同コードブロックでは残り回数が減らない
- レア確率は上がらない

## DP報酬

- 新キャラ発見: 30 DP
- 通常キャラ再発見: 5 DP
- レアキャラ初発見: 100 DP
- レアキャラ再発見: 20 DP
- 今日の初スキャン: 20 DP
- 同日同コードブロック: DPなし

DPは課金購入できません。

## キャラクター画像フォルダ

キャラクター画像は `assets/characters/Character.xlsx` のシート名を「世界」として扱い、以下の形で管理します。

現在アプリに組み込んでいる種類数:

- 通常キャラクター: 80種
- レアキャラクター: 8種
- 合計: 88種
- 個体コレクション枠: 80種 x 12個体差 = 960個体

```text
assets/characters/<世界>/<英名>/<画像ファイル>
```

例:

```text
assets/characters/動物/Dog/Dog.png
assets/characters/魚/Shark/Shark.png
assets/characters/動物/Raccoon Dog/Tanuki.png
```

アプリで表示する画像は `src/assets/monsterImages.ts`／`src/assets/characterImages.generated.ts` で静的に `require` します。Metroは動的な画像パスを解決できないため、**キャラ画像を追加・改名・移動したら必ず**次を実行してマニフェストを再生成してください（実行しないと古いファイル名を参照し `Unable to resolve module ...png` でバンドルが失敗します）:

```cmd
npm run gen:catalog
```

`gen:catalog` はマニフェスト（src配下）のみ再生成し、`assets/` の画像には触れません。

`Character.xlsx` の各ワールド100体は、独立したベース種族だけを対象にします。チワワ、柴犬、ブルドッグのようなものは `Dog` の将来別個体候補として扱い、100体の独立キャラクターには含めません。

フォルダを `Character.xlsx` に合わせて同期する場合:

```cmd
scripts\syncCharacterFolders.bat
```

確認だけの場合:

```cmd
scripts\syncCharacterFolders.bat -DryRun
```

`assets/characters/old` と `assets/characters/backup` は退避・過去素材用で、アプリ参照対象外です。

詳しくは [assets/characters/README.md](assets/characters/README.md) を参照してください。

## プライバシー方針

永続保存しないもの:

- バーコード数字そのもの
- QRコードのURLや文字列
- `rawBarcode`
- `rawQrValue`
- `rawValue`
- `normalizedBarcode`
- `normalizedQrValue`
- `normalizedValue`
- 正確な緯度/経度
- 商品名
- OCR結果

同日同コード制限は `sourceHash + localDate` で行います。詳しくは [docs/PRIVACY_NOTES.md](docs/PRIVACY_NOTES.md) を参照してください。

## 必要なもの

- Windows 11
- Node.js LTS
- npm
- iPhone または Android
- Expo Go

## 初回セットアップ

```cmd
cd C:\Users\user\work\git\ScanMonster
npm install --no-audit --no-fund
```

## iPhone / Androidで起動

```cmd
cd C:\Users\user\work\git\ScanMonster
taskkill /F /IM node.exe /T
set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.137.1
npx expo start --lan -c
```

表示されたQRコードをExpo Goで読み取ります。

接続できない場合は、PCとスマホが同じネットワークにいるか確認してください。iPhoneでPCのMetroにアクセスできるか確認する場合は、Safariで `http://192.168.137.1:8081` を開きます。

## 動作確認

```cmd
npm.cmd run typecheck
npm.cmd test
```

PowerShellで `npm run typecheck` が実行ポリシーに止められる場合は、上記のように `npm.cmd` を使ってください。

## 主要ドキュメント

- [docs/DESIGN.md](docs/DESIGN.md)
- [docs/INITIAL_RELEASE_DESIGN.md](docs/INITIAL_RELEASE_DESIGN.md)
- [docs/WORLD_AND_RARITY_DESIGN.md](docs/WORLD_AND_RARITY_DESIGN.md) — ワールド構造・出現分類・確率
- [docs/FRIEND_QR_AND_EFFECT.md](docs/FRIEND_QR_AND_EFFECT.md) — フレンドQR・フレンド効果
- [docs/PREFECTURE_CHARACTERS.md](docs/PREFECTURE_CHARACTERS.md) — 都道府県キャラ（GPS連動）
- [docs/ACCOUNTS_AND_FEEDBACK.md](docs/ACCOUNTS_AND_FEEDBACK.md) — アカウント連携・データ引継ぎ・要望掲示板
- [docs/SCAN_PRESENTATION.md](docs/SCAN_PRESENTATION.md) — スキャン演出（5フェーズ・ドキドキ体験）
- [docs/SOUND_SPEC.md](docs/SOUND_SPEC.md) — 効果音
- [docs/FEATURE_STATUS.md](docs/FEATURE_STATUS.md)
- [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md)
- [docs/PRIVACY_NOTES.md](docs/PRIVACY_NOTES.md)
- [docs/CHARACTER_DESIGN_GUIDE.md](docs/CHARACTER_DESIGN_GUIDE.md)
- [docs/FUTURE_EXPANSION_PLAN.md](docs/FUTURE_EXPANSION_PLAN.md)

## リリース前に確認すること

- `npm.cmd run typecheck` が通る
- `npm.cmd test` が通る
- iPhone/AndroidのExpo Goで起動できる
- スキャンから発見結果まで進める
- 初回カテゴリ選択が動く
- DPでカテゴリ解放できる
- 気配ブーストが10回だけ有効になる
- 称号を設定できる
- 生のバーコード/QR値が永続保存されていない
- `src/constants/appLinks.ts` のURLを本番用にする

詳しいチェック項目は [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) を参照してください。
