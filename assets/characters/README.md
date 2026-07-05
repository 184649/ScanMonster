# assets/characters

WORLDAWN のキャラクター画像を置くフォルダです。

## 現在のフォルダ構成

`Character.xlsx` のシート名を「世界」として扱い、世界フォルダの下に英名フォルダを置きます。

現在アプリに組み込んでいる画像数:

- 通常キャラクターのベース画像: 80種
- レア画像: 8種
- 合計: 88種
- 個体差枠: 80種 x 12個体差 = 960個体

`Character.xlsx` に合わせて作成済みのフォルダには、まだ画像が未配置の候補も含まれます。アプリで表示されるのは、画像が存在し、`src/assets/monsterImages.ts` と `src/data/monsterFamilies.ts` に登録済みのキャラクターです。

```text
assets/characters/
  Character.xlsx
  動物/
    Dog/
      Dog.png
    Cat/
      Cat.png
    Raccoon Dog/
      Tanuki.png
  魚/
    Shark/
      Shark.png
    Jellyfish/
      Jellyfish.png
  虫/
  植物/
  恐竜/
  城/
  宇宙/
  レア/
```

基本ルール:

- 世界フォルダ名は `Character.xlsx` のシート名に合わせます。
- 各キャラクターフォルダ名は、各行の `英名` に合わせます。
- ベース画像は原則 `assets/characters/<世界>/<英名>/<画像名>.png` に置きます。
- 画像ファイル名は既存コードの静的 `require` に合わせます。
- Metro は動的な画像パスを解決できないため、アプリで使う画像は `src/assets/monsterImages.ts` に静的に追加します。

## ベース種族と別個体候補

`Character.xlsx` の各ワールド100体は、独立したベース種族だけで構成します。

チワワ、柴犬、ブルドッグのように、将来的に `イヌ / Dog` の別個体として扱えるものは、ワールド100体の独立行から外します。削除して捨てるのではなく、将来の別個体候補として `親種族和名` / `親種族英名` / `別個体メモ` で管理します。

推奨列:

```text
カタログ区分
親種族和名
親種族英名
別個体メモ
```

`カタログ区分=base_species` の行だけを、ワールドごとの100体カウント対象にします。

## 直下に残っている素材

一部素材はまだ世界フォルダへ完全移行していないため、直下または直下フォルダに残っています。

```text
assets/characters/Human.png
assets/characters/Beetle/Beetle.png
assets/characters/Stag_beetle/Stag_beetle.png
assets/characters/Rare_alien.png
assets/characters/Rare_dragon.png
assets/characters/Rare_fenrir.png
assets/characters/Rare_ghost.png
assets/characters/Rare_kraken.png
assets/characters/Rare_panda.png
assets/characters/Rare_phoenix.png
assets/characters/Rare_robot.png
```

これらもアプリ側では `src/assets/monsterImages.ts` で実在する場所だけを参照します。

## フォルダ同期

`Character.xlsx` に合わせて世界フォルダと英名フォルダを作る場合は、以下を実行します。

```cmd
cd C:\Users\user\work\git\ScanMonster
scripts\syncCharacterFolders.bat
```

実際に作成・移動せず確認だけする場合:

```cmd
scripts\syncCharacterFolders.bat -DryRun
```

## 対象外フォルダ

以下は退避・過去素材用で、アプリ実装、画像参照、manifest生成、フォルダ同期の参照元として使用しません。

```text
assets/characters/old
assets/characters/backup
```

## アプリ側の参照

ベース画像を移動・追加した場合は、`src/assets/monsterImages.ts` の静的 `require` も更新してください。

個体差画像やモーションフレーム画像がまだ存在しない場合は、manifestを空にしてベース画像へフォールバックさせます。
