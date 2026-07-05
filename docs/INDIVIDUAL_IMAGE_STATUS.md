# WORLDAWN Individual Image Status

## Summary

- Registered normal base species: `80`
- Registered rare images: `8`
- Individual variant slots: `80 x 12 = 960`
- Generated individual images: `0 / 960`
- Source images: static base image entries in `src/assets/monsterImages.ts`
- Current source folder: `assets/characters`
- Excluded folders: `assets/characters/old` and `assets/characters/backup`

Individual variant images are optional. If a variant image is missing, the app falls back to the registered base image for that species.

## Variant Keys

```text
asatsuyu
youkou
tasogare
tsukikage
harukaze
natsuhikari
momiji
yukitomoshi
common
uncommon
rare
legend
```

## Current App Behavior

- The collection goal shown in the app is calculated from `BASE_MONSTER_IMAGE_KEYS.length * INDIVIDUAL_VARIANT_KEYS.length`.
- With the current assets, the goal is `960` individual slots.
- The base character image is shown when a specific individual image does not exist.
