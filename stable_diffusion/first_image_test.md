# 最初の1枚を生成するテスト

この手順では、ForgeでWORLDAWN向けのテスト画像を1枚生成します。

## 1. Forgeを開く

1. Stability Matrixを起動する
2. Stable Diffusion WebUI Forgeを起動する
3. ブラウザでForge画面を開く
4. `txt2img` タブを選ぶ

## 2. Promptを入れる

Prompt欄に次を貼り付けます。

```text
cute 2D mascot creature, full body, centered, simple clean shape, smartphone game character, fantasy creature, white background, no text, no logo, no UI, high quality, soft shading, clean line art
```

## 3. Negative Promptを入れる

Negative Prompt欄に次を貼り付けます。

```text
text, logo, watermark, UI, frame, multiple characters, realistic, photo, human, bad anatomy, extra limbs, cropped, background scenery, low quality, blurry, messy design, too complex
```

## 4. 推奨設定

まずは軽めの設定で試します。

| 項目 | 値 |
| --- | --- |
| Width | 768 |
| Height | 768 |
| Steps | 25 |
| CFG Scale | 7 |
| Batch size | 1 |
| Batch count | 1 |
| Seed | -1 |

VRAMが少ないPCで失敗する場合は、WidthとHeightを `512` に下げてください。

## 5. Generateを押す

1. `Generate` を押す
2. 生成が終わるまで待つ
3. 画像が1枚表示されることを確認する

## 6. 保存場所を確認する

Forgeの出力先は、通常は次のような場所です。

```text
StabilityMatrixのデータフォルダ\Packages\Stable Diffusion WebUI Forge\outputs\txt2img-images
```

日付フォルダの中にPNG画像が保存されます。

保存場所が分からない場合は、Forgeの生成結果画像を右クリックするか、Stability Matrixのパッケージフォルダから `outputs` を探してください。

## 7. 成功チェック

次を確認できれば、初回テストは成功です。

- Forge画面を開けた
- PromptとNegative Promptを入力できた
- Generateを押せた
- 1枚画像が表示された
- 保存先フォルダを確認できた

ここまでできたら、次は `prompts_test_10.txt` を使って先頭10体のテスト生成に進みます。
