# Stable Diffusion 周辺ツール概要

WORLDAWNの画像生成で出てくる名前を、初心者向けに整理します。

## Stable Diffusion

テキストから画像を生成するAIモデルの仕組みです。

WORLDAWNでは、管理表にあるキャラクター名、モチーフ、特徴をもとに、2Dマスコット風のキャラクター画像を作るために使います。

## Stability Matrix

Stable Diffusion関連ツールをまとめて管理するためのアプリです。

主な役割:

- Stable Diffusion WebUI Forgeなどのツールをインストールする
- モデルを管理する
- 複数のWebUIを切り替えやすくする
- PythonやGitなどの環境差を減らす

初心者が最初に環境を作る場合、手作業でPythonやGitを整えるより分かりやすいです。

## Stable Diffusion WebUI Forge

Stable Diffusionをブラウザ画面で操作するためのWebUIです。

主な役割:

- Promptを入力する
- Negative Promptを入力する
- 画像サイズ、Steps、CFG Scaleなどを設定する
- Generateボタンで画像を作る
- 生成結果を保存する

今回の画像生成作業ではForgeを使います。

## ComfyUI

ノードをつないで高度な画像生成ワークフローを作るツールです。

強力ですが、初回環境構築では覚えることが多いです。今回は使いません。

## LoRA

特定の絵柄、キャラクター、服装、表現を追加学習して反映するための仕組みです。

将来的にWORLDAWN専用の絵柄を安定させたい場合は候補になりますが、今回は使いません。

## ControlNet

ポーズ、線画、構図、深度などを使って、画像生成の形を強く制御する仕組みです。

便利ですが初回セットアップが複雑になるため、今回は使いません。

## IP-Adapter

参考画像の雰囲気や特徴を反映しやすくする仕組みです。

ベース画像に寄せたい時に役立ちますが、今回は使いません。

## 今回の最小構成

今回の構成は次のとおりです。

```text
Stability Matrix
  └─ Stable Diffusion WebUI Forge
      └─ 画像生成モデル
          └─ Prompt / Negative Promptで生成
```

まずはこの最小構成で1枚生成し、問題なく動くことを確認します。
