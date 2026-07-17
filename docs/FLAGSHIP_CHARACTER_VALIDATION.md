# Flagship Character Validation

Status: Phase 2A selection and Gate 0 brief. The choices are motif tests, not production character approvals.

## Eligibility source

Candidates were checked against the actual `character_master.json` plus effective rarity and `releaseStatus` from `character-classification.json`. Each selected motif is ground, normal, and initial. Sheep is explicitly excluded.

## Candidate shortlists

### 1. Small, friendly ground animal

| Rank | Existing candidate | Why it is useful | Main risk |
|---:|---|---|---|
| 1 | `ground_hamster` / ハムスター | Compact plush structure, expressive hands and cheek contour, familiar without needing costume. | Can collapse into a generic round mascot. |
| 2 | `ground_hedgehog` / ハリネズミ | Strong outer contour and defensive-to-open behavior. | Spines can become texture or one-note visual shorthand. |
| 3 | `ground_prairie_dog` / プレーリードッグ | Upright alert posture and social behavior offer personality. | Can become overly human or pose-dependent. |

**Selected motif: hamster.** It tests whether affection can come from posture and a compact block structure rather than large eyes, wool, or accessories. Its Gate 0 hook deliberately uses a forward-offering upper-body gesture and a heavy hind-body anchor, not “small and cute” alone.

### 2. Large ground animal with presence

| Rank | Existing candidate | Why it is useful | Main risk |
|---:|---|---|---|
| 1 | `ground_elephant` / ゾウ | Trunk, ears, head mass, and column legs create multiple controllable silhouette variables. | Can become a realistic juvenile elephant or rely only on ear size. |
| 2 | `ground_rhinoceros` / サイ | Strong wedge mass and horn-led direction. | Easy escape into armor, aggression, or muscular realism. |
| 3 | `ground_bison` / バイソン | Distinct front-heavy center of mass and shoulder arc. | Fur and muscle may hide weak construction. |

**Selected motif: elephant.** The trunk and mass distribution support a memorable, toyable body without armor. It provides a large four-legged architecture that clearly contrasts with the hamster and snake.

### 3. Non-mammal

| Rank | Existing candidate | Why it is useful | Main risk |
|---:|---|---|---|
| 1 | `ground_snake` / ヘビ | Limbless architecture is the strongest test that the IP language is not mammal-only. | May read as a generic curve or be hard to stabilize as a toy. |
| 2 | `ground_chameleon` / カメレオン | Grasping feet, head crest, and coiled tail support species-specific construction. | Eye gimmicks and surface color can substitute for silhouette. |
| 3 | `ground_gecko` / ヤモリ | Splayed toes and wall-clinging behavior create a low, wide body language. | A flat pose can lose volume and personality. |

**Selected motif: snake.** The lack of limbs forces posture, head/neck transition, coil mass, and negative space to carry character. Passing this test is stronger evidence that the shared IP system does not depend on mammal faces.

## Final set

| Category | Selected legacy motif row | Prototype identity | Structural test |
|---|---|---|---|
| Small/friendly | `ground_hamster`, No.22 | `prototype_character_hamster_gatherer_v0` | compact body, small forelimbs, large hind anchor |
| Large/presence | `ground_elephant`, No.15 | `prototype_character_elephant_wayfinder_v0` | massive quadruped, trunk bridge, column support |
| Non-mammal | `ground_snake`, No.57 | `prototype_character_snake_listener_v0` | limbless S/coil mass and open negative space |

Prototype IDs and working labels are non-production. They do not replace, alias, or repurpose the three legacy IDs.

## Gate 0 briefs

### Hamster — working codename “Gatherer”

- Primary motif: hamster.
- Supporting motif: offering/sharing behavior; no surface or costume motif.
- Personality: cautious, generous, quietly persistent.
- Typical behavior: secures its hindquarters, leans forward, and offers one found object before retreating.
- Character core: “A small finder who must gather courage before sharing the thing it values.”
- Reason to like: its brave act is tiny but voluntary.
- Silhouette memory point: one forward-projecting joined forepaw block counterbalanced by a broad, low hind-body block.
- Face memory point: a short muzzle tucked under one continuous brow-to-cheek plane; eye size is not the hook.
- Color-plane memory point: one warm face/forepaw bridge crossing a darker body mass.
- Forbidden direction: generic spherical baby animal, oversized-eye dependence, pouch/accessory, or a recognizable existing mascot proportion.
- Toy blocks: 5 — head, trunk/hind mass, paired forepaw block, two foot blocks.

### Elephant — working codename “Wayfinder”

- Primary motif: elephant.
- Supporting motif: pathfinding/memory behavior; no armor or equipment motif.
- Personality: patient, observant, gently decisive.
- Typical behavior: pauses, touches the ground ahead with its trunk, then commits its whole weight to one direction.
- Character core: “A large guide who listens to the path before taking one certain step.”
- Reason to like: strength is expressed as care and certainty rather than dominance.
- Silhouette memory point: the trunk creates a low forward bridge that points back into a high, compact head/shoulder mass.
- Face memory point: forehead, trunk root, and cheek form one species-specific structure instead of a human face placed between ears.
- Color-plane memory point: a light trunk-to-forehead route across one deep main mass.
- Forbidden direction: realistic calf rendering, armor plating, muscular aggression, ear-size-only differentiation, or circus/royal equipment.
- Toy blocks: 7 — head/shoulder mass, body mass, trunk, two front supports, two rear supports.

### Snake — working codename “Listener”

- Primary motif: snake.
- Supporting motif: listening through ground vibration; no jewelry, hood gear, or magic effect.
- Personality: attentive, deliberate, unexpectedly reassuring.
- Typical behavior: rests most weight in a stable low coil while one short section rises and turns toward a vibration.
- Character core: “A quiet listener who makes a safe place by feeling what others miss.”
- Reason to like: stillness reads as attention, not threat.
- Silhouette memory point: one sheltered open space between a low asymmetric coil and a short upright neck.
- Face memory point: wedge-to-neck transition and jaw line carry identity; do not use eyelash or large-eye appeal.
- Color-plane memory point: one uninterrupted light path runs from lower coil to jaw against a dark main body.
- Forbidden direction: generic S-curve, cobra threat display, magical familiar, jewelry, weapon, or facial features borrowed from mammals.
- Toy blocks: 4 — lower coil, counter-coil, neck, head wedge.

## Gate 1 evaluation

Each prompt produces eight independent black shapes in a 4 x 2 arrangement. Treat positions left-to-right, top-to-bottom as A–H; the image itself carries no labels. First verify crop, equal scale, species readability, one hook per option, distinct architecture, 64 px readability, and feasible major toy blocks. Then use `PHASE2_SILHOUETTE_REVIEW_FORM.md` for the user's non-numeric choice.

Do not score rendering quality, because there is no rendering detail at this gate. Do not use the existing official image as a quality reference. AI may report measurable violations, but may not select or rank a final design.

## Stop condition

Advance only when the user can select up to two options per motif that they want to see completed. If the user answers “全部違う”, or cannot find an option that feels likable, worth completing, or plausible beside popular characters, stop this generation method. Do not iterate indefinitely. Escalate to the human-designer or zoological-product branch defined in `CHARACTER_ART_PIPELINE_V2.md`.
