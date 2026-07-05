# トラブルシューティング

Stable Diffusion環境で詰まりやすい点をまとめます。

## Stability Matrixが起動しない

対処:

- PCを再起動する
- セキュリティソフトに止められていないか確認する
- 日本語や空白を含まないフォルダに置き直す
- 最新版を公式リリースページから入れ直す

## Forgeのインストールに失敗する

対処:

- インターネット接続を確認する
- Stability Matrixを再起動する
- インストール先の空き容量を確認する
- パスに日本語や特殊文字が入っていないか確認する
- もう一度 `Add Package` からForgeを選び直す

## モデルがないと言われる

Forgeは画像生成モデルがないと生成できません。

対処:

- Stability MatrixのModel Browserでモデルを追加する
- 追加したモデルがForgeから見える場所に入っているか確認する
- Forge画面左上のモデル選択欄でモデルを選ぶ
- モデルのダウンロードが途中で止まっていないか確認する

## Generateを押しても画像が出ない

対処:

- モデルが選ばれているか確認する
- Prompt欄が空でないか確認する
- Forgeのログにエラーが出ていないか確認する
- Width / Heightを `512 x 512` に下げる
- Batch sizeを `1` にする

## CUDA / GPU / VRAM関連のエラーが出る

GPUメモリが足りない可能性があります。

対処:

- Width / Heightを `512 x 512` にする
- Batch sizeを `1` にする
- 他の重いアプリを閉じる
- PCを再起動する
- それでも難しい場合は、より軽いSD1.5系モデルで試す

## 生成が極端に遅い

GPUではなくCPUで動いている、または設定が重すぎる可能性があります。

対処:

- NVIDIA GPU搭載PCか確認する
- Stepsを `20` から `25` 程度にする
- Width / Heightを `512` に下げる
- Batch countを `1` にする

## 画像が保存されない

対処:

- Forgeの `outputs` フォルダを確認する
- Stability Matrixのパッケージフォルダを開く
- ディスク容量が不足していないか確認する
- 書き込み権限のあるフォルダにStability Matrixを置く

## ブラウザ画面が開かない

対処:

- Forgeのログに表示されたURLをコピーして開く
- よく使われる `http://127.0.0.1:7860` を開く
- すでに別のアプリが同じポートを使っていないか確認する
- Stability MatrixからForgeを停止して再起動する

## 生成結果に文字やロゴが入る

対処:

- Negative Promptに `text, logo, watermark, UI` を入れる
- Promptにも `no text, no logo, no UI` を入れる
- 何度かSeedを変えて生成する

## キャラクターが複数出る

対処:

- Promptに `single character` と `one creature only` を入れる
- Negative Promptに `multiple characters` を入れる
- 構図を `centered, full body` にする

## WORLDAWNらしくならない

対処:

- `cute 2D mascot creature`
- `smartphone collection game character`
- `simple clean shape`
- `white background`
- `clean line art`

これらの語をPromptに入れて、まずは図鑑に並べやすい見た目を優先してください。
