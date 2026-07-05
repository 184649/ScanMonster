# TROUBLESHOOTING — よくあるエラーと対処

## Metro 接続タイムアウト

症状:

```
Unknown error: The request timed out.
```

対処:

- iPhone が PC のモバイルホットスポットに接続されているか確認する
- Safari で `http://192.168.137.1:8081` を開けるか確認する
- 環境変数 `REACT_NATIVE_PACKAGER_HOSTNAME` を PC の IP に設定する
- `ipconfig` で PC の IP アドレスを確認する

```cmd
set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.137.1
npx expo start --lan -c
```

## babel-preset-expo が無い

```cmd
npm install -D babel-preset-expo --no-audit --no-fund
```

## lucide-react-native が無い

このプロジェクトでは使用しません。再追加しないでください。
アイコンは `src/components/icons.tsx`（テキストベースの自作アイコン）を使っています。

## キャラ画像が表示されない

```cmd
dir assets\monsters
```

確認:

- 画像ファイルが存在するか
- `imageKey` と `src/assets/monsterImages.ts` のキー・ファイル名が一致しているか
- `MonsterAvatar` が画像優先になっているか（画像があれば画像、無ければ fallback）
- 存在しない画像を `require` していないか（未配置キーは require しない）

初回は `cat` / `fox` / `rabbit` / `jellyfish` 以外は fallback 表示が正常です。
個別 PNG を追加し、`monsterImages.ts` に1行足すと画像表示になります。

## カメラが映らない / 権限が出ない

- Expo Go で実機確認する（シミュレータはカメラ非対応）
- 設定アプリで WORLDAWN（Expo Go）のカメラ権限を許可する
- スキャン画面の「カメラ権限を許可」を押す

## バーコードを読み取っても発見できない

- 候補カードが出たら「このバーコードで発見する」を押す（自動発見はしない）
- 同じバーコードは1日1回まで新規発見できる（2回目以降は「発見済み」表示＋研究Pt）
- 3秒以内の同じコードはカメラの重複検出として無視される

## 写真ライブラリからの読み取りについて（制約）

- 写真からの読み取りは `expo-image-picker` で画像を選び、`expo-camera` の
  `scanFromURLAsync(uri, types)` で静止画をスキャンします（Expo SDK 54、Expo Go で動作）。
- **QRコードは静止画から比較的安定して読み取れます。**
- **バーコード（1次元）の静止画読み取りは端末・画像品質・OS差により失敗することがあります。**
  読み取れない場合は、ピントの合った明るい画像を使うか、カメラでの読み取りをご利用ください。
- 読み取れなかった場合はアプリが落ちず、エラーメッセージを表示します。
- Development Build は必須ではありません（カメラ・写真ライブラリとも Expo Go で動作）。
  将来、より高精度な静止画バーコード認識が必要になった場合は Development Build + 専用ライブラリを検討します。

## カメラでQRとバーコードが同時に読めない

- カメラに両方を十分大きく・ピントが合った状態で写してください。
- 検出されたコードは画面下の「検出したコード」一覧に積み上がります。
  両方が一覧に出たら「まとめて発見」を押してください。
- 3秒以内の同一コードは重複として無視されます（別コードは無視されません）。

## 「DOMException doesn't exist」

`src/polyfills.ts` の読み込み順を確認する（`index.ts` の先頭で import）。

## 「Cannot assign to read-only property 'NONE'」

import した readonly 定数を書き換えていないか確認する。
