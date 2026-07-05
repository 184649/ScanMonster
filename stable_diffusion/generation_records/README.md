# Generation Records

`generate_missing_initial_characters.py` records every candidate's prompt, negative prompt, model revision, seed, scheduler, dimensions, environment and SHA-256 here. `remove_background.py` adds a separate finalization record for the selected candidate.

Records are evidence of an actual run. Do not create a success record by hand and do not commit `tmp_candidates/` or model weights.
