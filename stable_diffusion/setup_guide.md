# Windows Stable Diffusion セットアップ手順

この手順は、初心者でもWORLDAWN用の画像生成を始められるように、Stability MatrixとStable Diffusion WebUI Forgeを使う前提で書いています。

## 1. 事前確認

推奨環境です。

- Windows 10 / Windows 11
- NVIDIA GPU搭載PC
- 空き容量 20GB以上
- 安定したインターネット接続
- 英数字だけの作業フォルダ

例:

```text
C:\AI\StabilityMatrix
D:\AI\StabilityMatrix
```

日本語や空白を含むフォルダ名でも動く場合はありますが、初心者向けには英数字だけのパスがおすすめです。

## 2. Stability Matrixを入れる

1. 公式リリースページを開く  
   https://github.com/LykosAI/StabilityMatrix/releases
2. 最新版のWindows x64向けファイルをダウンロードする
3. ダウンロードしたファイルを実行または展開する
4. Stability Matrixを起動する
5. 初回起動時にデータ保存場所を聞かれたら、次のような場所を選ぶ

```text
C:\AI\StabilityMatrix
```

Stability Matrixは、PythonやGitなどの必要な部品を内包して扱えるため、Stable Diffusion環境を手作業で組むより始めやすいです。

## 3. Forgeをインストールする

1. Stability Matrixを開く
2. `Packages` または `Package Manager` を開く
3. `Add Package` を選ぶ
4. 一覧から `Stable Diffusion WebUI Forge` を選ぶ
5. インストールを開始する
6. 完了まで待つ

この時点ではComfyUIを選ばないでください。今回使うのはForgeです。

## 4. 画像生成モデルを入れる

Forgeだけでは画像を生成できません。画像生成モデル、つまりチェックポイントが必要です。

初心者向けの進め方です。

1. Stability Matrixの `Model Browser` またはモデル管理画面を開く
2. ライセンスを確認できるモデルを選ぶ
3. SDXLまたはSD1.5系のイラスト向けモデルを1つ入れる
4. ダウンロード後、Forgeから選べることを確認する

WORLDAWNでは、かわいい2Dマスコット風のキャラクターを作りたいので、写真風よりもイラスト・アニメ・マスコット表現が得意なモデルが向いています。

注意:

- モデルの利用条件を確認してください
- 商用利用予定がある場合は、商用利用可否を必ず確認してください
- 今回はLoRA、ControlNet、IP-Adapterは使いません

## 5. Forgeを起動する

1. Stability Matrixの `Packages` でForgeを選ぶ
2. `Launch` または `Start` を押す
3. 起動ログが流れるので待つ
4. ブラウザが自動で開く、または表示されたURLを開く

よく使われるURL:

```text
http://127.0.0.1:7860
```

ブラウザにStable Diffusion WebUI Forgeの画面が出れば成功です。

## 6. txt2img画面を開く

1. Forge画面上部の `txt2img` を選ぶ
2. 画面左上付近のモデル選択欄で、入れたモデルを選ぶ
3. Prompt欄とNegative Prompt欄があることを確認する
4. Generateボタンが押せる状態になっていることを確認する

## 7. 生成画像の保存場所

Forgeの出力画像は、通常はForgeパッケージ内の `outputs` フォルダに保存されます。

Stability Matrix経由の場合の例:

```text
C:\AI\StabilityMatrix\Packages\Stable Diffusion WebUI Forge\outputs\txt2img-images
```

または、Stability Matrixのデータフォルダ構成によって次のような場所になる場合があります。

```text
C:\AI\StabilityMatrix\Data\Packages\Stable Diffusion WebUI Forge\outputs\txt2img-images
```

見つからない場合は、Forge画面の生成結果ギャラリーから保存画像を開き、右クリックやフォルダ表示機能で場所を確認してください。

## 8. 次にやること

Forgeが起動できたら、`first_image_test.md` の手順で最初の1枚を生成してください。

1枚生成できたら、`prompts_test_10.txt` を使って先頭10体のテスト生成に進めます。
