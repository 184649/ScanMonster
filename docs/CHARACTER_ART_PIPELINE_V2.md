# Character Art Pipeline V2

Status: Phase 2A proposal. No image is generated or promoted by this phase.

## Operating rule

The pipeline moves from intent to silhouette, face, color, model sheet, final illustration, and cross-character validation. Passing a technical check never means the design is attractive. Human choice is mandatory after Gate 1 and Gate 3, and bulk production is blocked until all three flagships pass Gate 6.

| Gate | Required artifact | Decision owner | Exit condition |
|---|---|---|---|
| 0 | Character brief | Product/IP owner | Brief has one core and one memory point per channel. |
| 1 | Eight black silhouettes | User | User chooses 1–2, or “全部違う”. |
| 2 | Face/head construction | User + character designer | Species-specific face works in required views/expressions. |
| 3 | Three or four large color regions | User | User chooses a color direction. |
| 4 | Model sheet | Character/art lead | Construction is reproducible at all required views/sizes. |
| 5 | Production illustration | Art + technical QA | Art intent and PNG requirements both pass. |
| 6 | Three-character lineup | User + IP/art leads | The set reads as one IP without sharing one face/body. |

## Gate 0 — Character brief

No image is made. Record:

- primary species motif and up to two purposeful supporting motifs;
- personality, typical behavior, and one-sentence character core;
- the reason someone may like it;
- exactly one silhouette memory point, one face memory point, and one color-plane memory point;
- concrete forbidden similarities to be checked without naming a target style as an instruction;
- a target count of major toy blocks.

Reject the brief if it is just a species name plus adjectives, needs costume/gear to be recognizable, has more than three motif relations, or asks one channel to carry several competing hooks.

## Gate 1 — Black silhouette

Generate at least eight independent concepts per motif on a 4 x 2 board. Use a single black character shape on white, equal scale and sufficient spacing. Vary head/body ratio, center of mass, limb length, species-specific parts, contour, posture, one memory point, and toy block arrangement. Do not make pose variants of one design.

Forbidden at this gate: eyes, facial rendering, fur/scales/texture, internal detail, color, shading, background effects, ground, cast shadow, equipment, lettering, cropped parts, or written explanation in the image.

Automated checks may verify dimensions, grid count, foreground/background values, margins, crop, absence of alpha surprises, and a 64 px downsample. They may not declare a concept lovable, memorable, commercially viable, or preferred. The user selects one or two options. No selection means no Gate 2.

## Gate 2 — Face, expression, and front construction

For each selected silhouette, design front, three-quarter, and side head views plus neutral, joy, alert, and puzzled expressions. Test whether the face belongs to this body and cannot be pasted onto another animal. Avoid human-like acting that overrides animal structure. Eyes and mouth must remain legible on a small screen, but neither may become the sole identity hook.

The output is a construction study, not a final illustration.

## Gate 3 — Color-plane design

Apply three or four large color regions to the approved construction. Confirm grayscale separation, 128 px recognition, accessibility beyond hue alone, merchandise reproducibility, and normal-rarity restraint. Avoid a palette or marking arrangement strongly associated with a specific existing character.

Automated checks may measure region count, luminance separation, file size, and small-size legibility proxies. Only the user can select the preferred color direction. No selection means no Gate 4.

## Gate 4 — Model sheet

Produce front, side, rear, and three-quarter views; expression set; lineup scale; color specification; construction notes; prohibited deformations; 64 px and 128 px proofs; and a simplified figure/plush block model. Every view must preserve the approved silhouette hook and body architecture. The sheet becomes the reproduction contract for Gate 5, not production art itself.

## Gate 5 — Production illustration

Only a model-sheet-approved design may enter. Technical requirements:

- 1024 x 1024 transparent PNG with a real alpha channel;
- no checkerboard painted into the image;
- no background, ground, or foot shadow;
- no cropped major part;
- valid PNG structure including IEND;
- enough clear margin and contrast to generate a thumbnail;
- deterministic asset version and eligibility for the production manifest.

Technical QA and art approval are separate. A valid PNG is not an approved character, and an attractive image with invalid alpha/IEND does not pass.

## Gate 6 — Cross-character coherence

Review the hamster, elephant, and snake flagships together at full size, 128 px, and 64 px. The set must look like one IP while not sharing the same face, eyes, body type, or reason to like it. The language must work beyond mammals, remain toyetic, and avoid concrete imitation of an existing IP. Failure by any one character returns only the affected construction decision to the earliest relevant gate.

Bulk production remains blocked until all three pass.

## Human intervention and automation boundary

Human choice is mandatory at:

1. **Gate 1:** select up to two silhouettes for each motif or answer “全部違う”.
2. **Gate 3:** select the color-plane direction; no default or AI fallback is allowed.

Automation is appropriate for file structure, dimensions, PNG chunks/alpha, crop/margin, number of deliverables, downsample generation, manifest/schema consistency, ID collision, and regression tests. It may flag measurable non-compliance.

Automation must not decide affection, charisma, personality fit, memorability, commercial appeal, similarity risk as a final legal conclusion, user preference, or final approval. AI may describe observations and risks but must not rank a winner on the user's behalf.

## Stop condition

In Phase 2B, stop AI-only character design if the user cannot choose any silhouette for all three questions: “好きになれそう”, “完成形を見たい”, and “人気キャラクターと並べても可能性を感じる”. “全部違う” is a valid outcome. Do not indefinitely re-prompt or regenerate the same method.

Then choose one explicit branch:

- **A — human character designer:** commission 3–5 reference characters and restart from human-authored silhouette principles.
- **B — zoological product:** reduce the IP-character scope and strengthen the high-quality real-species dex/discovery experience, using `zoological` or `hybrid` presentation without disturbing scan/history/numbering.

## Human-designer handoff

Request 3–5 completed reference model sheets with front, side, rear, and three-quarter views; expression range; color specification; silhouette rules; eye/face rules; line and shading rules; prohibited transformations; and reference material suitable for controlled AI-assisted expansion.

The engagement also needs written confirmation of authorship/rights, permitted media and territories, modification and AI-training/reference permissions, sublicensing, credit, source-file delivery, and termination/archival handling. These are contract review topics, not legal conclusions; qualified review and explicit agreement are required before production use.
