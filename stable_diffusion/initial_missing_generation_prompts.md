# Initial Release Missing Character Prompts

対象一覧は `docs/MISSING_CHARACTER_ASSETS.md` を正本とする。これらは生成準備用であり、2026-07-11時点では生成未実施。

## 共通要件

- 1024 x 1024 PNG、透明背景、1体のみ、全身、中央配置
- 細めから中程度の線、2〜3段陰影、セル塗りと厚塗りの中間
- 上質な瞳、生命感、やわらかな曲線、静かな神秘、控えめな夜明け色
- 主要部位を切らない。地面、影、風景、文字、ロゴ、UI、枠を入れない
- 装飾、小物、武器、宝石、ペンダント、共通制服を加えない
- 既存キャラのポーズ、顔、装飾をコピーしない

共通negative prompt:

```text
multiple characters, duplicate, collage, grid, text, logo, watermark, UI, frame, scenery, landscape, floor, ground plane, grass, rocks, water background, opaque background, cast shadow, cropped body, cut off ears, cut off tail, cut off feet, cut off limbs, extra limbs, extra paws, missing limbs, fused anatomy, malformed anatomy, human clothing, armor, weapon, crown, necklace, pendant, gemstone accessory, backpack, explorer outfit, adventurer outfit, generic standing pose, identical pose, oversized round baby eyes, photorealistic, cheap mascot, chibi blob, low quality, blurry
```

## White Tiger

- id: `ground_rare_white_tiger`
- personality: 静かな好奇心
- key species traits: 白から淡い象牙色の被毛、濃い虎縞、幅広い虎の頭部と短い丸耳、強い肩と大きな四肢、長い縞尾
- pose: 横向きに歩き出しながら前脚を一歩上げ、頭だけこちらへ向ける。尾を反対側へ流して重心を取る
- differentiation: 神話の四神や白い大型猫ではなく、実在する白変種のトラとして扱う
- accessory: なし
- final path: `assets/characters/ground/rare/White Tiger.png`

```text
WORLDAWN original premium game character, one full-body white tiger only, recognizable real leucistic tiger anatomy, powerful quadruped feline body, broad tiger head, short rounded ears, strong shoulders, large paws, long naturally banded tail, ivory-white coat with clear charcoal tiger stripes, warm amber eyes with an observant purposeful gaze, quiet curiosity, captured mid-step in a clean side-oriented pose, one front paw lifted, head turned toward the viewer, tail counterbalancing the body, asymmetrical natural movement, refined expressive face, species identity carried by anatomy and markings, no accessories, no clothing, subtle dawn-peach rim accent only, fine-to-medium clean linework, two-to-three-stage shading, polished blend of cel shading and painterly rendering, soft curves, restrained mystery, single character, full body fully inside canvas, centered, isolated on transparent background, no text, no logo, no frame, no floor, no shadow, 1024x1024 PNG
```

追加negative:

```text
white lion, snow leopard, domestic cat, mythic Baihu, Chinese guardian beast, wings, horns, armor, blue gems, glowing magic circle, golden aura, fantasy stripes
```

## Tsuchinoko

- id: `ground_rare_tsuchinoko`
- personality: 気まぐれ
- key species traits: 極端に太く短い蛇胴、首と尾へ急に細くなる輪郭、扁平で幅広い蛇の頭、鱗と腹板、四肢なし
- pose: 太い胴を低くS字にひねり、頭を少し持ち上げ、細い尾先だけ反対方向へ跳ねる
- differentiation: 通常の長いヘビ、トカゲ、ドラゴンへ置き換えない
- accessory: なし
- final path: `assets/characters/ground/legendary/Tsuchinoko.png`

```text
WORLDAWN original premium legendary game character, one full-body tsuchinoko only, unmistakable Japanese cryptid silhouette, extremely short and thick snake body, broad flattened serpent head, body narrowing abruptly into a short neck and thin tail tip, visible refined scales and belly scutes, absolutely no legs, no wings, no horns, compact low center of gravity, capricious watchful personality, thick body twisting in a low asymmetrical S curve, head raised slightly with a sideways assessing gaze, thin tail tip flicking in the opposite direction, restrained moss-brown and muted copper natural palette with a very subtle dawn-coral accent in the eyes, quiet dignity and mystery, refined expressive face without baby proportions, fine-to-medium clean linework, two-to-three-stage shading, polished blend of cel shading and painterly rendering, single character, full body fully inside canvas, centered, isolated on transparent background, no text, no logo, no frame, no floor, no shadow, 1024x1024 PNG
```

追加negative:

```text
long ordinary snake, cobra hood, rattlesnake, lizard, dragon, salamander, legs, arms, wings, horns, jewelry, magic circle, giant aura
```

## Yeti

- id: `ground_rare_yeti`
- personality: 慎重
- key species traits: 大型霊長類型の骨格、長い腕と大きな手、幅広い肩、巨大な素足、密生した長い淡色の毛、毛の薄い顔
- pose: 低く身をかがめて大きな一歩を踏み出す直前、片手を前へ下げ、肩越しに静かに振り返る
- differentiation: 白いクマ、ゴリラの色違い、毛皮を着た人間にしない
- accessory: なし
- final path: `assets/characters/ground/legendary/Yeti.png`

```text
WORLDAWN original premium legendary game character, one full-body yeti only, unmistakable cryptid primate anatomy, broad shoulders, powerful slightly hunched torso, very long arms, large expressive hands, enormous bare feet, dense layered off-white and cool-gray shaggy fur, darker hairless face and palms, cautious intelligent eyes, restrained mouth, cautious personality, body lowered just before taking a heavy step, one long hand reaching down for balance, head turning back over one shoulder, asymmetrical weight and natural primate movement, quiet strength rather than aggression, no accessories, no clothing, no weapon, subtle pale dawn-rose light at fur edges only, fine-to-medium clean linework, two-to-three-stage shading, polished blend of cel shading and painterly rendering, soft but weighty silhouette, restrained mystery and dignity, single character, full body fully inside canvas, centered, isolated on transparent background, no text, no logo, no frame, no floor, no snow scene, no shadow, 1024x1024 PNG
```

追加negative:

```text
polar bear, white gorilla recolor, human in fur suit, snowman, horned monster, ogre, armor, explorer, backpack, weapon, roaring attack pose, snow mountain background, blizzard
```

## Underground Dweller

- id: `ground_rare_underground_dweller`
- status: BLOCKED
- final path: `assets/characters/ground/legendary/Underground Dweller.png`

マスターには名称しかなく、外見・生態・身体構造の定義がない。現状では「種固有特徴を最低3つ維持」と「既存キャラクターを勝手に再デザインしない」を同時に満たせないため、プロンプトを捏造しない。

生成前に最低限、次を canonical source へ追加する必要がある。

1. 身体構造（人型か、四足か、別の構造か）
2. 地底適応を示す固有特徴を3つ以上
3. 顔・目・皮膚または被毛の定義
4. 性格と代表的な仕草
5. WORLDAWN内で近縁になる既存キャラとの差別化

## 実行前チェック

現行の `stable_diffusion/` はForgeの手動手順であり、モデル名、再現可能なworkflow、透過背景化の後処理が固定されていない。生成前に以下を確定する。

- 使用checkpoint名とhash
- sampler / scheduler / steps / CFG / seed
- 1024 x 1024を直接生成するか、upscaleするか
- alphaを持つ透明PNGへ変換する承認済み手順
- 最大再試行回数
- 出力前の同名ファイル存在チェック
