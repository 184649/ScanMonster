from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
import platform
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
DEFAULT_CONFIG = SCRIPT_DIR / "configs" / "initial_missing_characters.json"
DEFAULT_CANDIDATES = SCRIPT_DIR / "tmp_candidates"
DEFAULT_RECORDS = SCRIPT_DIR / "generation_records"
MODEL_CACHE = SCRIPT_DIR / "models" / "huggingface"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_config(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def selected_characters(config: dict, requested: set[str]) -> list[dict]:
    characters = config["characters"]
    known = {item["id"] for item in characters}
    unknown = requested - known
    if unknown:
        raise SystemExit(f"Unknown character id(s): {', '.join(sorted(unknown))}")

    if requested:
        selected = [item for item in characters if item["id"] in requested]
    else:
        selected = [item for item in characters if item.get("enabled")]
    blocked = [item["id"] for item in selected if not item.get("enabled")]
    if blocked:
        raise SystemExit(
            "Generation blocked by canonical design status: " + ", ".join(blocked)
        )
    return selected


def ensure_targets_absent(characters: list[dict]) -> None:
    collisions = [
        item["finalPath"]
        for item in characters
        if (REPO_ROOT / item["finalPath"]).exists()
    ]
    if collisions:
        raise SystemExit("Refusing to overwrite existing asset(s): " + ", ".join(collisions))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate reproducible SDXL candidates for missing initial characters."
    )
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--character", action="append", default=[])
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--allow-cpu",
        action="store_true",
        help="Allow extremely slow CPU generation. CUDA is required by default.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config_path = args.config.resolve()
    config = load_config(config_path)
    characters = selected_characters(config, set(args.character))
    ensure_targets_absent(characters)

    summary = {
        "config": str(config_path),
        "model": config["model"],
        "generation": config["generation"],
        "characters": [
            {
                "id": item["id"],
                "seeds": item["seeds"],
                "finalPath": item["finalPath"],
            }
            for item in characters
        ],
    }
    if args.dry_run:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return

    try:
        import torch
        from diffusers import DPMSolverMultistepScheduler, StableDiffusionXLPipeline
    except ImportError as error:
        raise SystemExit(
            "Generation dependencies are missing. Run stable_diffusion/setup.ps1 first."
        ) from error

    cuda = torch.cuda.is_available()
    if not cuda and not args.allow_cpu:
        raise SystemExit(
            "CUDA GPU is not available. Refusing impractical SDXL CPU generation; "
            "use a CUDA machine or pass --allow-cpu explicitly."
        )

    if cuda:
        torch.backends.cuda.matmul.allow_tf32 = False
        torch.backends.cudnn.allow_tf32 = False
        torch.backends.cudnn.deterministic = True

    os.environ.setdefault("HF_HOME", str(MODEL_CACHE))
    MODEL_CACHE.mkdir(parents=True, exist_ok=True)
    DEFAULT_CANDIDATES.mkdir(parents=True, exist_ok=True)
    DEFAULT_RECORDS.mkdir(parents=True, exist_ok=True)

    model = config["model"]
    generation = config["generation"]
    dtype = torch.float16 if cuda else torch.float32
    pipe = StableDiffusionXLPipeline.from_pretrained(
        model["id"],
        revision=model["revision"],
        torch_dtype=dtype,
        use_safetensors=True,
        cache_dir=str(MODEL_CACHE),
        add_watermarker=True,
    )
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(
        pipe.scheduler.config,
        algorithm_type="sde-dpmsolver++",
        use_karras_sigmas=True,
    )
    pipe.enable_vae_slicing()
    if cuda:
        pipe.enable_model_cpu_offload()
        generator_device = "cuda"
    else:
        pipe.to("cpu")
        generator_device = "cpu"

    config_hash = sha256(config_path)
    for item in characters:
        character_dir = DEFAULT_CANDIDATES / item["id"]
        character_dir.mkdir(parents=True, exist_ok=True)
        negative = ", ".join(
            part
            for part in [config["commonNegativePrompt"], item["negativePromptAddon"]]
            if part
        )
        for seed in item["seeds"]:
            output = character_dir / f"seed-{seed}.png"
            record_path = DEFAULT_RECORDS / f"{item['id']}-seed-{seed}.json"
            if output.exists() or record_path.exists():
                raise SystemExit(f"Refusing to overwrite candidate or record: {output}")

            generator = torch.Generator(device=generator_device).manual_seed(seed)
            image = pipe(
                prompt=item["prompt"],
                negative_prompt=negative,
                width=generation["width"],
                height=generation["height"],
                num_inference_steps=generation["steps"],
                guidance_scale=generation["cfg"],
                generator=generator,
            ).images[0]
            image.save(output, format="PNG")

            record = {
                "schemaVersion": 1,
                "createdAt": datetime.now(timezone.utc).isoformat(),
                "status": "candidate",
                "character": item,
                "prompt": item["prompt"],
                "negativePrompt": negative,
                "model": model,
                "modelRevision": model["revision"],
                "seed": seed,
                "width": generation["width"],
                "height": generation["height"],
                "sampler": generation["sampler"],
                "scheduler": generation["scheduler"],
                "steps": generation["steps"],
                "cfg": generation["cfg"],
                "vae": model["vae"],
                "backgroundRemoval": None,
                "configSha256": config_hash,
                "candidatePath": str(output.relative_to(REPO_ROOT)).replace("\\", "/"),
                "candidateSha256": sha256(output),
                "environment": {
                    "python": platform.python_version(),
                    "platform": platform.platform(),
                    "torch": torch.__version__,
                    "diffusers": importlib.metadata.version("diffusers"),
                    "transformers": importlib.metadata.version("transformers"),
                    "cuda": torch.version.cuda,
                    "gpu": torch.cuda.get_device_name(0) if cuda else None,
                },
            }
            record_path.write_text(
                json.dumps(record, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            print(f"generated {output}")


if __name__ == "__main__":
    main()
