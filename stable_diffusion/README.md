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

不足initialキャラクターの再現可能な自動生成では、GUI操作ではなく `diffusers` CLIを使用する。従来のForge手順は手動検証用として残す。

Stability Matrixは、Stable Diffusion系ツールのインストールやモデル管理をまとめて扱えるツールです。Forgeは、ブラウザ画面からStable Diffusionを操作するためのWebUIです。

## 今回使わないもの

- ComfyUI
- LoRA
- ControlNet
- IP-Adapter
- Stable Diffusion API
- ブラウザ自動操作
- 300体の本番一括生成

## Initial不足キャラクター自動生成

対象と設定は `configs/initial_missing_characters.json` に固定している。モデルは公式 `stabilityai/stable-diffusion-xl-base-1.0` revision `a7c2bcc30a3b5489f1f1989e66cd5fe957fdb45c`、ライセンスは CreativeML Open RAIL++-M。背景除去はMITライセンスの `rembg` とApache-2.0のU-2-Netをローカル利用する。

この端末では2026-07-11時点でIntel UHD Graphicsしか検出されず、NVIDIA CUDAがないため、本番SDXL生成は未実施。生成スクリプトも既定でCUDAがなければ停止する。

### セットアップ

Python 3.11〜3.13とCUDA対応NVIDIA GPUを備えたWindows端末で実行する。

```powershell
.\stable_diffusion\setup.ps1 -Python "C:\Path\To\python.exe" -TorchBuild cu128
.\stable_diffusion\.venv\Scripts\python.exe stable_diffusion\generate_missing_initial_characters.py --dry-run
```

初回生成時にモデルが `stable_diffusion/models/` へ取得される。モデルと候補画像はgitignore対象。

### 候補生成

White Tiger、Tsuchinoko、Yetiを4候補ずつ生成する。Underground Dwellerは `BLOCKED_DESIGN_UNRESOLVED` のためスクリプトから除外される。

```powershell
.\stable_diffusion\.venv\Scripts\python.exe stable_diffusion\generate_missing_initial_characters.py
```

候補は `stable_diffusion/tmp_candidates/<id>/`、再現記録は `stable_diffusion/generation_records/` に出力される。正式assetsへ直接書き込まない。

### 選定・背景除去

候補を目視し、種固有性、身体構造、全身、性格、既存キャラとの差別化を確認して1枚を選ぶ。次の例は同名アセットが存在すると必ず停止する。

```powershell
.\stable_diffusion\.venv\Scripts\python.exe stable_diffusion\remove_background.py `
  --input stable_diffusion\tmp_candidates\ground_rare_white_tiger\seed-8910201.png `
  --output "assets\characters\ground\rare\White Tiger.png"
```

U-2-Netでalpha matteを作成し、キャラクターの最大辺をキャンバスの84%に揃えた1024×1024 RGBA PNGとして保存する。毛先や尾の輪郭は正式保存前に必ず目視する。

### 自動検証

```powershell
.\stable_diffusion\.venv\Scripts\python.exe stable_diffusion\validate_generated_character.py
npm run validate:release-assets
```

画像検証はPNG、1024×1024、RGBA、透明ピクセル、alpha bounding box、edge clipping、既存画像との完全重複、正規パスを確認する。意味的な種判定と余分な手足は人間による目視確認が必要。

### モデルとライセンス

- SDXL Base 1.0: https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0
- SDXL license: https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/blob/main/LICENSE.md
- Diffusers SDXL: https://huggingface.co/docs/diffusers/api/pipelines/stable_diffusion/stable_diffusion_xl
- rembg: https://github.com/danielgatis/rembg
- U-2-Net: https://github.com/xuebinqin/U-2-Net

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
