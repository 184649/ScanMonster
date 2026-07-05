# BUILD_AND_RELEASE_GUIDE — ビルドとリリース手順

Windows 11 + Expo を前提にした、初心者向けの手順です。

## 0. 必要なもの

- Node.js（LTS）と npm
- スマホに Expo Go アプリ（iPhone は App Store、Android は Google Play）
- （ビルド時）Expo アカウントと EAS CLI
- （iOS 配信時）Apple Developer Program、（Android 配信時）Google Play Console

## 1. ローカル起動（Expo Go で確認）

```cmd
cd C:\Users\user\work\git\WORLDAWN
taskkill /F /IM node.exe /T
npm install --no-audit --no-fund
set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.137.1
npx expo start --lan -c
```

> フォルダ名をまだ WORLDAWN へ移行していない場合は、`cd C:\Users\user\work\git\ScanMonster` を使ってください。
> 移行手順は README「リポジトリ／フォルダ名の移行」を参照。

- `package.json` を変更していなければ `npm install` は省略できます。
- 表示された QR を iPhone のカメラ（Expo Go）で読み取ると起動します。
- うまく繋がらないときは `docs/TROUBLESHOOTING.md` の「Metro 接続タイムアウト」を参照。

## 2. 型チェック

```cmd
npx tsc --noEmit
```

エラー0 を確認してからビルドへ進みます。

## 3. EAS Build 準備

```cmd
npm install -g eas-cli
eas login
eas build:configure
```

- `app.json` の `extra.eas.projectId`（現在 `worldawn-local-mvp` 仮）を、`eas build:configure` で
  生成される実際の EAS プロジェクトIDに変更する。
- `ios.bundleIdentifier`（現在 `com.worldawn.app`）と `android.package`（同）が、
  本番用として確定していることを確認する（必要なら一意な値に変更）。

## 4. iOS ビルド

```cmd
eas build -p ios --profile production
```

- Apple Developer Program の認証情報が必要です（EAS が案内します）。

## 5. Android ビルド

```cmd
eas build -p android --profile production
```

## 6. TestFlight の流れ（iOS）

1. `eas build -p ios` で `.ipa` を作成
2. `eas submit -p ios` で App Store Connect へアップロード
3. App Store Connect の TestFlight でテスターを招待
4. テスターは TestFlight アプリでインストールして確認

## 7. Google Play 内部テストの流れ（Android）

1. `eas build -p android` で `.aab` を作成
2. `eas submit -p android` で Google Play Console へアップロード
3. Play Console の「内部テスト」トラックに登録
4. テスターのメールを登録し、オプトインURLからインストールして確認

## 8. リリース前

`docs/RELEASE_CHECKLIST.md` をすべて確認すること。
特にアイコン/スプラッシュ・bundleId/package・projectId・プライバシーURL の差し替えを忘れない。
