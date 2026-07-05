from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import io
import json
import os
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Remove a selected candidate background and place it on a 1024 RGBA canvas."
    )
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--model", default="u2net")
    parser.add_argument("--max-fill", type=float, default=0.84)
    parser.add_argument("--record", type=Path, default=None)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source = args.input.resolve()
    output = args.output.resolve()
    if not source.is_file():
        raise SystemExit(f"Candidate does not exist: {source}")
    if output.exists():
        raise SystemExit(f"Refusing to overwrite existing asset: {output}")
    if not (0.65 <= args.max_fill <= 0.90):
        raise SystemExit("--max-fill must be between 0.65 and 0.90")

    try:
        from PIL import Image
        from rembg import new_session, remove
    except ImportError as error:
        raise SystemExit(
            "Background-removal dependencies are missing. Run stable_diffusion/setup.ps1 first."
        ) from error

    session = new_session(args.model)
    removed = remove(
        source.read_bytes(),
        session=session,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=5,
    )
    rgba = Image.open(io.BytesIO(removed)).convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        raise SystemExit("Background removal produced a fully transparent image")

    foreground = rgba.crop(bbox)
    max_side = round(1024 * args.max_fill)
    scale = min(max_side / foreground.width, max_side / foreground.height)
    size = (
        max(1, round(foreground.width * scale)),
        max(1, round(foreground.height * scale)),
    )
    foreground = foreground.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    position = ((1024 - size[0]) // 2, (1024 - size[1]) // 2)
    canvas.alpha_composite(foreground, position)

    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_name(output.name + ".tmp.png")
    if temporary.exists():
        raise SystemExit(f"Refusing to overwrite temporary file: {temporary}")
    canvas.save(temporary, format="PNG", optimize=True)
    os.replace(temporary, output)

    record = args.record.resolve() if args.record else (
        SCRIPT_DIR / "generation_records" / f"{output.stem}.final.json"
    )
    if record.exists():
        output.unlink()
        raise SystemExit(f"Refusing to overwrite processing record: {record}")
    record.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schemaVersion": 1,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "status": "finalized",
        "inputPath": str(source),
        "inputSha256": sha256(source),
        "outputPath": str(output),
        "outputSha256": sha256(output),
        "backgroundRemoval": {
            "tool": "rembg",
            "version": importlib.metadata.version("rembg"),
            "model": args.model,
            "modelLicense": "Apache-2.0",
            "alphaMatting": True,
            "maxCanvasFill": args.max_fill,
        },
        "width": 1024,
        "height": 1024,
        "mode": "RGBA",
    }
    record.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {output}")
    print(f"record {record}")


if __name__ == "__main__":
    main()
