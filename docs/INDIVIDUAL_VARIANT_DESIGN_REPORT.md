# WORLDAWN Individual Variant Design Report

This report documents how the 12 individual variants are generated from each base species image.

## Source Rules

- The app currently registers 80 normal species from `assets/characters`.
- The generator and manifests must ignore `assets/characters/old` and `assets/characters/backup`.
- The 8 `rare_*` root images are kept as special assets and are not part of the 80 species x 12 individual set.
- Existing base images are never overwritten.
- Individual variant images are optional; missing variants fall back to each species base image.

## Variant Difference Plan

| variantKey | concept | body marking | accessory change | motif |
|---|---|---|---|---|
| asatsuyu | morning dew | dew dots on body | small dew beads and fresh sprout accent | dew |
| youkou | sunlight | sun streaks | gold band, bright crest, and warm charm | sun |
| tasogare | twilight ember | ember stripes | flowing dusk scarf and ember charm | ember |
| tsukikage | moon shadow | moon spots | crescent charm and dark sash | moon |
| harukaze | spring wind | leaf veins | leaf wreath, vine wrap, and petal charm | leaf |
| natsuhikari | summer light | water glints | clear water beads and bright fin-like sash | splash |
| momiji | autumn maple | maple patches | maple cloak, warm ribbon, and leaf charm | maple |
| yukitomoshi | snow lantern | ice speckles | snow scarf, ice cuff, and lantern glow | snow |
| common | common | small natural mark | simple band and one small species charm | soft |
| uncommon | uncommon | clear blue markings | blue badge, extra cuff, and sharper pose | spark |
| rare | rare | crystal runes | asymmetric crystal ornament and bright aura edge | crystal |
| legend | legend | gold runes | gold crest, heroic mantle, and large species emblem | legend |

## Species Interpretation

The table below documents the original 35 hand-designed species. The current app also registers 45 additional species from the present `assets/characters` image set, using shared safe defaults in `src/data/monsterFamilies.ts`.

| speciesKey | interpreted base feature | body pattern | species accessory | species motif |
|---|---|---|---|---|
| dog | loyal canine body, pointed ears, fluffy tail | fur_stripes | collar and tail ribbon | paw badge |
| cat | nimble cat silhouette, tall ears, curling tail | moon_spots | bell collar and tail charm | crescent |
| squirrel | small forest body with oversized curled tail | leaf_veins | acorn pouch and tail band | acorn |
| frog | round amphibian body, big eyes, springy limbs | water_spots | lily pad cap and belly beads | lily |
| bear | soft bear cub mass, round paws, gentle face | fur_patches | paw guards and honey charm | honey |
| fox | sharp fox ears, agile body, plume tail | flame_stripes | ear ribbons and tail flame charm | flame |
| tanuki | round tanuki body, mask-like face, striped tail | leaf_veins | leaf mask and belly sash | leaf |
| lion | mane-forward lion cub silhouette and proud stance | mane_rays | mane beads and small crown | sun |
| elephant | large elephant body, trunk, broad ears | ceremonial_marks | trunk ring and head cloth | gem |
| giraffe | tall neck, ossicones, long legs | patches | neck scarf and horn beads | leaf |
| whale | large ocean body, sweeping fins, gentle curve | waves | fin bands and wave beads | wave |
| dolphin | sleek dolphin body, curved tail, playful leap | waves | dorsal ribbon and splash anklets | splash |
| shark | sharp shark profile, dorsal fin, powerful tail | fin_streaks | fin armor and tooth charm | tooth |
| penguin | small upright penguin, flippers, round belly | ice_dots | scarf and belly badge | ice |
| sparrow | small sparrow body, short beak, quick wings | feather_lines | wing ribbons and feather crest | feather |
| crow | dark crow silhouette, sharp beak, glossy wings | night_feathers | moon cape and wing charms | moon |
| owl | round owl body, wide eyes, layered feathers | feather_lines | brow crest and tiny satchel | star |
| turtle | sturdy turtle shell, short limbs, calm face | shell_segments | shell gems and tail ring | shell |
| crocodile | armored crocodile body, long jaw, low stance | scales | back plates and jaw mark | fang |
| snake | coiled snake body, narrow head, smooth scales | scales | tail jewel and body rings | fang |
| beetle | round beetle shell, horn, segmented legs | carapace | shell gems and wing veining | gem |
| stag_beetle | stag beetle mandibles, hard shell, angular legs | carapace | mandible caps and joint gems | crystal |
| deer | gentle deer body, antlers, slender legs | forest_spots | antler flowers and hoof bands | flower |
| rabbit | soft rabbit body, long ears, round paws | dew_dots | ear bows and carrot charm | carrot |
| jellyfish | translucent bell, dangling tentacles, water glow | glow_beads | bell jewels and tentacle rings | bubble |
| mole | earth mole body, claws, digging posture | earth_marks | goggles and claw cuffs | stone |
| ostrich | runner bird body, long legs, fluffy feathers | runner_streaks | leg bands and plume charm | feather |
| eagle | sky eagle body, broad wings, sharp beak | feather_lines | wing medals and sun crest | sun |
| human | young adventurer silhouette, jacket, confident pose | adventurer_marks | scarf, satchel, and elemental badge | compass |
| gorilla | powerful gorilla body, broad shoulders, large hands | stone_marks | shoulder guards and wrist leaves | stone |
| monkey | nimble monkey body, long tail, playful hands | leaf_veins | headband and tail charm | banana |
| hippo | round river hippo body, big snout, sturdy legs | water_spots | water scarf and tusk gems | wave |
| horse | runner horse body, mane, lifted legs | runner_streaks | mane ribbons and saddle cloth | horseshoe |
| koala | round koala body, large ears, sleepy face | leaf_veins | eucalyptus crown and cheek leaves | leaf |
| hamster | tiny hamster body, cheek puffs, small paws | dew_dots | seed satchel and cheek sparkles | seed |

## Quality Checks

- Every output is validated as `1024x1024` RGBA PNG.
- Canvas corners and a small border are forced transparent.
- Outputs are rejected if the subject is missing or touches the canvas edge.
- Each variant combines pose/scale change, body marking, large costume or armor parts, species accessory, motif charm, and attached particles.
- Large parts intentionally change the readable silhouette: capes, shoulder armor, chest emblems, crests, shell jewels, horns, fins, leaves, or crystal props.
