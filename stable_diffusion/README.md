# WORLDAWN Stable Diffusion 環境メモ

このフォルダは、WORLDAWN用キャラクター画像をStable Diffusionで生成するための作業用ドキュメントと補助ファイルをまとめた場所です。

既存アプリ本体のREADMEとは分けています。アプリの起動・リリース手順はルートの `README.md`、画像生成環境の準備はこのフォルダを見てください。

## 今回のゴール

まずはWindows PCで次の状態まで進めます。

1. Stability Matrixを起動できる
2. Stable Diffusion WebUI Forgeを起動できる
3. ブラウザで画像生成画面を開ける
4. テストプロンプトで1枚画像を生成できる
5. 生成画像の保存場所が分かる
6. `docs/管理.xlsx` から先頭10体分のプロンプトを作れる

## 今回使うもの

- Stability Matrix
- Stable Diffusion WebUI Forge
- Python
- `docs/管理.xlsx`

Stability Matrixは、Stable Diffusion系ツールのインストールやモデル管理をまとめて扱えるツールです。Forgeは、ブラウザ画面からStable Diffusionを操作するためのWebUIです。

## 今回使わないもの

- ComfyUI
- LoRA
- ControlNet
- IP-Adapter
- Stable Diffusion API
- ブラウザ自動操作
- 300体の本番一括生成

まずは「1枚出せること」と「次に10体テストへ進めること」を優先します。

## ファイル一覧

| ファイル | 内容 |
| --- | --- |
| `setup_guide.md` | WindowsでStability MatrixとForgeを準備する手順 |
| `stable_diffusion_tool_overview.md` | Stable Diffusion周辺ツールの役割説明 |
| `first_image_test.md` | Forgeで最初の1枚を生成する手順 |
| `troubleshooting.md` | よくあるエラーと対処 |
| `make_prompts.py` | Excel/CSVからForge用プロンプトを作るスクリプト |
| `prompts_test_10.txt` | 先頭10体分のテスト生成プロンプト |
| `negative_prompt.txt` | 共通ネガティブプロンプト |
| `generation_order_test_10.csv` | 生成順とキャラクター情報の対応表 |

## 作業順

1. `setup_guide.md` に沿ってStability Matrixを準備する
2. Stability MatrixからStable Diffusion WebUI Forgeをインストールする
3. 画像生成モデルを1つ入れる
4. Forgeを起動し、ブラウザで `txt2img` を開く
5. `first_image_test.md` の内容で1枚生成する
6. 保存場所を確認する
7. `prompts_test_10.txt` をForgeの `Prompts from file or textbox` に貼り付けて、10体テスト生成へ進む

## プロンプト再生成

管理表を更新したあとに先頭10件のプロンプトを作り直す場合は、リポジトリのルートで次を実行します。

```powershell
python stable_diffusion/make_prompts.py --limit 10
```

Python環境によっては `python` の代わりに `py` を使います。

```powershell
py stable_diffusion/make_prompts.py --limit 10
```

全件出したい場合は、次のようにします。

```powershell
python stable_diffusion/make_prompts.py --all --out-prompts stable_diffusion/prompts_all.txt --out-order stable_diffusion/generation_order_all.csv
```

## 公式リンク

- [Stability Matrix GitHub](https://github.com/LykosAI/StabilityMatrix)
- [Stability Matrix Releases](https://github.com/LykosAI/StabilityMatrix/releases)
- [Stable Diffusion WebUI Forge GitHub](https://github.com/lllyasviel/stable-diffusion-webui-forge)
