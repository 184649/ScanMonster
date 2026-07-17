# Legacy Character Migration Policy

Status: Phase 2A policy only. No production migration has been run.

## Invariants

1. Existing character IDs are permanent. Do not rename, recycle, recompute, or change their meaning.
2. Existing `discovery_records.character_id`, `character_records.character_id`, and `character_masters.id` bindings remain valid.
3. Official per-character numbers remain scoped to the original character ID. The counter key `character:<legacyCharacterId>` is never moved or merged implicitly.
4. Certificate, rediscovery, title, calendar, dex ownership, and representative-discovery history remain addressable by the same old key.
5. `SpeciesMotif` IDs and `CharacterIdentity` IDs are different namespaces. Neither may reuse `ground_sheep` or another legacy ID.
6. Mapping is additive and reversible until a separately approved production cutover.

## Proposed namespaces

| Entity | Proposal | Example | Phase 2A use |
|---|---|---|---|
| Species motif | `motif_species_<slug>` | `motif_species_hamster` | Sample only |
| Prototype identity | `prototype_character_<slug>_v<n>` | `prototype_character_hamster_gatherer_v0` | Sample only |
| Future production identity | `wdchar_<stable-slug>` | `wdchar_hamster_gatherer` | Reserved proposal; no ID minted |
| Form | `prototype_form_<slug>_v<n>` / future `wdform_<slug>` | `prototype_form_hamster_gatherer_standard_v0` | Schema only |

All new IDs use lower snake case and are rarity- and world-independent. The proposed prefixes do not match the measured legacy six-world prefix format, so prototypes cannot collide with the 461 current IDs. A production naming decision still requires a dedicated registry and collision check.

## Mapping states

| State | Meaning | Runtime effect |
|---|---|---|
| `unmapped` | Legacy row reviewed only as legacy. | None |
| `motif_only` | Legacy row points to a SpeciesMotif; no IP identity approved. | None |
| `prototype_linked` | A non-production identity is being tested. | None |
| `approved_parallel` | An approved new identity may be presented alongside legacy content in a future flagged resolver. | None until separately released |
| `migrated` | A later production migration has explicit data, compatibility, and rollback approval. | Outside Phase 2A |
| `retired` | New presentation is withdrawn; legacy remains authoritative. | Resolver falls back to legacy |

The default policy is `preserve_legacy_identity`: the old ID continues to own history and number scope. A future `parallel_identity` policy may display a new identity while retaining the legacy discovery key. Many-to-one or one-to-many behavior must be explicit; it is never inferred from species name.

## Staged migration

1. **Inventory:** freeze a report of legacy IDs, current number counters, discovery counts, roster counts, and generated catalogs.
2. **Motif mapping:** add only `legacyCharacterId -> motifId`, with provenance to the exact master row. No runtime reader.
3. **Prototype validation:** attach optional prototype identity after Gates 0–6. Keep all assets outside production paths.
4. **Parallel resolver rehearsal:** in an isolated environment, resolve legacy discovery key to character, zoological, or hybrid view data. The stored discovery key remains unchanged.
5. **Dry-run database proof:** use a disposable snapshot to verify count parity, orphan-free joins, unchanged `(character_id, character_discovery_no)` uniqueness, legendary progress, and secret visibility.
6. **Flagged production candidate:** only a separately approved, default-off feature may read an approved mapping. Existing mode remains the fallback.
7. **Controlled release:** monitor mismatch/orphan metrics and retain legacy rendering for rollback.

No step authorizes bulk update of `character_id`, number counters, the 89 release statuses, seed/catalog IDs, or official art.

## Rollback

Rollback is presentation-level first:

- disable the future mapping resolver/feature flag;
- render the legacy catalog and assets by the stored legacy ID;
- stop writing any new mapping-version metadata;
- retain mapping audit records for diagnosis rather than deleting history;
- verify discovery, number, certificate, legendary, and secret-visibility parity against the pre-release snapshot.

Because Phase 2A makes no runtime import, database migration, or canonical data change, its rollback is simply removal/ignoring of the isolated design files. Existing user data needs no reversal.

## Approval evidence required for any future production migration

- zero duplicate and orphan IDs in both directions;
- a written decision for each one-to-many/many-to-one case;
- unchanged official-number scope and counter values;
- unchanged discovery/certificate/history counts;
- unchanged legendary completion semantics or an explicitly versioned product decision;
- secret entries remain concealed;
- reversible presentation fallback tested on a production-like snapshot;
- product, data, security/privacy, art, and legal/contract review where relevant.
