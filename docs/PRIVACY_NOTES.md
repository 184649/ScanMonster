# WORLDAWN プライバシー方針メモ

WORLDAWNは、バーコード/QRコードを読み取ってキャラクターを発見するアプリです。初回リリースでは、ユーザーの入力値や位置情報を必要以上に保存しない方針を取ります。

## 使用する権限

- カメラ: バーコード/QRコード読み取り
- 写真ライブラリ: ユーザーが選んだ画像内コードの読み取り

## 保存しないもの

- `rawBarcode`
- `rawQrValue`
- `rawValue`
- `normalizedBarcode`
- `normalizedQrValue`
- `normalizedValue`
- バーコード数字そのもの
- QRコードのURLや文字列
- 正確な緯度/経度
- 位置情報を使った出現制御結果
- 商品名
- OCR結果

## 保存するもの

- `sourceHash`
- `variantSeedHash`
- `barcodeType`
- `scanDate`
- `scanTimeBucket`
- `sourceType`
- `scanSource`
- `familyId`
- `rareId`
- `characterId`
- `habitatGroup`
- `firstDiscoveredAt`
- `lastDiscoveredAt`
- `discoveryCount`
- DP残高とDP台帳
- 解放済みカテゴリ
- 気配ブースト状態
- 称号状態

## 同日同コード制限

同じコードを同じ日に何度も使って新規発見できないようにするため、次のキーを使います。

```text
sourceHash + ":" + localDate
```

同日2回目以降は抽選なし、DPなし、気配ブースト消費なしです。

## 位置情報

最新の初回リリース仕様では、位置情報を使った出現制御は行いません。正確な緯度/経度も保存しません。

既存コードに地域設定や過去互換の `regionKey` が残る場合がありますが、初回リリースの出現カテゴリ抽選には使用しません。

## 共有

共有カードや共有テキストに含めてよいもの:

- キャラクター名
- 図鑑進捗
- レアリティ
- 発見カテゴリの一般名
- `#WORLDAWN`

含めないもの:

- バーコード数字
- QR内容
- `sourceHash`
- 正確な時刻
- 位置情報

## 広告・課金

初回リリースでは広告、動画広告、バナー広告、課金、ガチャ、時短課金を入れません。

## リリース前確認

- `src/constants/appLinks.ts` の `privacyPolicyUrl` を本番URLにする
- `src/constants/appLinks.ts` の `contactUrl` を本番URLにする
- 設定画面からプライバシーポリシーと問い合わせを開けることを確認する
