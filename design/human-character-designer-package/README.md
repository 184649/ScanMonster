# Human character designer package — design data only

This directory contains machine-readable mirrors of the Phase 2C human-designer commission documents. It is a non-production handoff and validation area.

- Nothing in this directory is imported by the application, server, catalog generators, seed, database, or production asset manifests.
- Every JSON file declares `designOnly: true`, `runtimeReference: false`, `productionData: false`, `officialCharacterIdsIssued: false`, and `officialImagePathsUsed: false`.
- The files issue no official character ID or name and use no official image path.
- Motif labels and working questions are commission inputs, not production character records.
- These files do not define a production schema or authorize runtime integration.

Human-readable source documents are under `docs/PHASE2C_*.md`, with the Phase 2B stop record at `docs/PHASE2B_AI_SILHOUETTE_STOP_DECISION.md`.
