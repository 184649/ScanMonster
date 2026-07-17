# Character IP Architecture V2

Status: Phase 2A design proposal / non-production / 2026-07-17

## 1. Decision

WORLDAWN ends the workflow that treats one real species as one finished character and generates the final illustration directly from a long prompt. Biological knowledge and IP identity are separated, and character development starts from a brief and black silhouette. This phase changes no runtime, production data, database, UI, release status, official art, or existing identifier.

The core product remains a discovery application: barcode/QR scanning, server-side draw, duplicate prevention by user + `sourceHash` + `localDate`, official per-character discovery numbers, certificates, dex, history, calendar, rediscovery, titles, worlds, rarity, legendary unlocks, secret concealment, no new discovery while offline, and the policy not to retain raw code, product data, OCR text, or precise location.

## 2. Repository facts measured at start

Source of measurement: `origin/main` at `8fb31949bff0c627b83d1f58ee0aece0bb71353f`.

| Metric | Measured value |
|---|---:|
| Character master total | 461 |
| Current `initial` total | 89 |
| `initial` by world | ground 74 / sky 15 / waterside 0 / bug 0 / phantom 0 / planet 0 |
| `initial` by effective rarity | normal 84 / rare 1 / legendary 4 / secret 0 |
| Initial ground normal | 69 |
| Production image manifest entries | 89 |
| Production thumbnail manifest entries | 88 |
| Corrupt production assets | 1: `ground_sheep` original PNG has no IEND |
| Duplicate master IDs | 0 |

The 461 effective-rarity population is normal 426 / rare 14 / legendary 21. By world it is ground 107, waterside 130, sky 102, bug 109, phantom 11, and planet 2. Every current master ID matched `^(ground|waterside|sky|bug|phantom|planet)_[a-z0-9]+(?:_[a-z0-9]+)*$`. Historical tokens such as `_rare_` are permanent identifier text, not a live rarity rule.

The generated application catalog and server seed each contain the same 89 initial entries. The image manifest has 89 originals; the thumbnail manifest has 88 entries because the corrupt `assets/characters/ground/Sheep/Sheep.png` cannot produce a thumbnail. `validateReleaseAssets.js` reports that file as 787,456 bytes, 1024 x 1024 RGBA, and truncated before IEND. Phase 2A records but does not repair it.

## 3. Present canonical and reference flow

| Layer | Present responsibility |
|---|---|
| `assets/characters/Character.xlsx` | Human-edited workbook. Its permanent `id` column and six export sheets are the editing source for the biological/catalog roster. It does not own `releaseStatus`. |
| `assets/characters/character_master.json` | Generated workbook export used as the base roster; not hand-edited. It carries ID, world row, number, names, base rarity, status, and description. |
| `assets/characters/character-classification.json` | Canonical effective-rarity overrides and explicit `releaseStatus`. Status resolution is `byId[id]` then `worldDefault[world]` then `future`; all world defaults are `future`. Images never demote an initial row. |
| `scripts/catalogBuild.js` | Combines master, classification, and resolved assets. It preserves master IDs and separates normal, rare, legendary, and secret buckets. |
| `scripts/generateCharacterData.js` | Emits the initial, asset-ready application catalog and static original/thumbnail manifest. |
| `scripts/generateServerSeed.js` | Emits the server seed from the same build result and same initial, asset-ready population. |
| `server/src/seed.ts` | Upserts generated IDs into `character_masters`; legendary is scan-available but hidden before unlock. |

The status guard fixes the current explicit set at 89 unless `WORLDAWN_ALLOW_INITIAL_CHANGE=1` is intentionally supplied. Phase 2A does not supply it.

### Stored identity and official numbering

- `scan_history` prevents duplicate valid scans with a unique index on `(user_id, source_hash, local_date)`.
- `discovery_records.character_id` stores the selected `character_masters.id`. `character_records.character_id` stores the same ID for the user's aggregate history.
- The official number is issued with counter key `character:<characterId>`, then stored as `discovery_records.character_discovery_no`. Uniqueness is enforced on `(character_id, character_discovery_no)`.
- Certificates, history, representative discovery, rediscovery count, badges, and titles therefore transitively depend on the permanent legacy character ID.
- The server legendary condition does not hard-code a legendary character ID. It computes completion from scan-available `normal` rows in a world and the user's discovered `character_id` values, then records the unlocked `world_group`. The application mirrors this with owned catalog IDs and the world's image-ready normal catalog.

Renaming or repurposing an existing ID would consequently rewrite the meaning of history and official numbers. It is prohibited.

## 4. New conceptual model

### SpeciesMotif

A real organism or biological motif, not automatically a game character. It owns biological names, taxonomy, real/fantasy status, world candidates, rarity observations, body features, behaviors, usable shape/color cues, and provenance back to legacy master rows. Its namespace is `motif_species_*`; legacy character IDs are only references.

One motif may inspire several characters. A motif may also remain zoological content without any IP character.

### CharacterIdentity

A stable WORLDAWN IP persona with a unique name, behavior, character core, visual and silhouette hooks, body/face/color language, toy structure, art status, asset version, and release candidacy. It is independent of a species label.

Phase 2 prototypes use `prototype_character_*`. A future production namespace is proposed as `wdchar_*`, but no production ID is minted in this phase. Display names in examples are working labels only.

### CharacterMotifRelation

An explicit relation between a character and a motif. Roles are `primary`, `secondary`, `behavior`, `surface`, `color`, and `silhouette`. A character has exactly one primary relation, at most three relations total, and normally no more than one relation whose only purpose is surface or color. Weights are guidance and must total no more than 1.0. Adding a relation must improve the one-sentence core or the single silhouette memory point; otherwise it is rejected.

This allows one-to-many and many-to-many design without turning a character into an undirected collage.

### CharacterForm

A controlled variation of one `CharacterIdentity`: standard, regional, seasonal, growth, behavior, or event. A form cannot own discovery history or replace the identity ID. It has a separate `formId` and asset version. The first implementation is future-only; no form is imported by the current runtime.

### LegacyCharacterMapping

A migration ledger that keeps `legacyCharacterId`, motif, optional new identity, policy, preservation flags, and evidence. A legacy entry can be motif-only, parallel to an approved identity, or deliberately remain legacy. Mapping never silently changes what `ground_sheep` or any other old ID means.

## 5. PresentationMode separation

`presentationMode` is a future display-layer choice, not a scan or history rule:

| Mode | Display responsibility | Stable core key |
|---|---|---|
| `character` | Show approved IP identity and approved character art. | Legacy discovery binding remains resolvable through mapping. |
| `zoological` | Show real-species profile and zoological imagery. | Same discovery record and official number. |
| `hybrid` | Show both, with relation/provenance made explicit. | Same discovery record and official number. |

The scan service returns a stable discovered entity and proof. A future presentation resolver chooses view data after discovery; it does not change draw weights, deduplication, official numbering, ownership, or secret visibility. Phase 2A only supplies the schema proposal.

## 6. Non-destructive implementation sequence

1. **Phase 2A — design only:** schemas, samples, mapping policy, Gate 0 briefs, and silhouette prompts in isolated directories.
2. **Phase 2B — flagship silhouette validation:** generate three 8-option boards outside production assets; user selects up to two per motif or answers “全部違う”.
3. **Phase 2C — reference-character validation:** Gates 2–6 for only the three flagships. No bulk roster work.
4. **Phase 2D — isolated resolver prototype:** an off-by-default, non-production module may read approved V2 data; no database migration or catalog replacement.
5. **Phase 2E — migration rehearsal:** snapshot legacy IDs and counts, dry-run mappings, compare discovery/number joins, and demonstrate rollback in a disposable database.
6. **Production decision:** only after human approval, legal/contract review where applicable, data migration plan, release plan, and rollback approval.

At every stage, the old ID remains the authoritative key for existing discoveries and official numbers. The new model is additive until a separately approved production migration proves equivalence.

## 7. Lessons retained from sheep exploration

The existing remote art refs were inspected without rewriting them. `art/sheep-style-exploration` and `art/sheep-character-concepts` both pointed to `9a7b8bd8be8eef8a4ad56e4a1361e1a1c698600a` at audit time. The style ref contains six technically coherent sheep style studies, a comparison board, `style_notes.md`, Phase 1A.6 prompts, the Phase 1A.6 design document, and a refinement README; no Phase 1A.6 refinement image is present. The remote concept ref contains no committed `assets/characters/_pilot/ip-concept-exploration/sheep/` path.

The work demonstrated that recognizability, pose variation, and game-ready rendering are achievable, while long prompts and finished rendering can average the design and hide a weak silhouette. Repetition on one sheep motif also creates local overfitting, and AI compliance checks cannot stand in for user preference. These are research records only: nothing is deleted, overwritten, promoted, or registered in a production manifest.
