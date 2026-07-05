from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
DEFAULT_CONFIG = SCRIPT_DIR / "configs" / "initial_missing_characters.json"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def approved_asset_hashes(excluded: set[Path]) -> dict[str, list[str]]:
    hashes: dict[str, list[str]] = {}
    root = REPO_ROOT / "assets" / "characters"
    for path in root.rglob("*.png"):
        resolved = path.resolve()
        if resolved in excluded or "old" in path.parts:
            continue
        hashes.setdefault(sha256(path), []).append(str(path.relative_to(REPO_ROOT)))
    return hashes


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate final WORLDAWN generated character assets."
    )
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--character", action="append", default=[])
    parser.add_argument("--allow-missing", action="store_true")
    parser.add_argument("--json", type=Path, default=None)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = json.loads(args.config.read_text(encoding="utf-8"))
    requested = set(args.character)
    selected = [
        item
        for item in config["characters"]
        if not requested or item["id"] in requested
    ]
    if requested - {item["id"] for item in selected}:
        raise SystemExit("Unknown character id requested")

    final_paths = {item["id"]: (REPO_ROOT / item["finalPath"]).resolve() for item in selected}
    existing_targets = {path for path in final_paths.values() if path.exists()}
    known_hashes = approved_asset_hashes(existing_targets)
    results = []
    errors = []

    for item in selected:
        path = final_paths[item["id"]]
        result = {
            "id": item["id"],
            "path": item["finalPath"],
            "designStatus": item["designStatus"],
            "exists": path.is_file(),
            "errors": [],
        }
        if not path.is_file():
            if not args.allow_missing and item.get("enabled"):
                result["errors"].append("missing enabled final asset")
            results.append(result)
            errors.extend(f"{item['id']}: {message}" for message in result["errors"])
            continue

        try:
            with Image.open(path) as image:
                image.load()
                result.update(
                    {
                        "format": image.format,
                        "width": image.width,
                        "height": image.height,
                        "mode": image.mode,
                        "fileSize": path.stat().st_size,
                    }
                )
                if image.format != "PNG":
                    result["errors"].append("format is not PNG")
                if image.size != (1024, 1024):
                    result["errors"].append("size is not 1024x1024")
                if image.mode != "RGBA":
                    result["errors"].append("mode is not RGBA")
                if image.mode == "RGBA":
                    alpha = image.getchannel("A")
                    extrema = alpha.getextrema()
                    bbox = alpha.getbbox()
                    result["alphaExtrema"] = list(extrema)
                    result["alphaBBox"] = list(bbox) if bbox else None
                    result["transparent"] = extrema[0] < 255
                    if extrema[0] == 255:
                        result["errors"].append("no transparent pixels")
                    if extrema[1] == 0 or bbox is None:
                        result["errors"].append("image is fully transparent")
                    if bbox:
                        left, top, right, bottom = bbox
                        width_ratio = (right - left) / 1024
                        height_ratio = (bottom - top) / 1024
                        max_ratio = max(width_ratio, height_ratio)
                        result["alphaWidthRatio"] = round(width_ratio, 4)
                        result["alphaHeightRatio"] = round(height_ratio, 4)
                        if not 0.65 <= max_ratio <= 0.90:
                            result["errors"].append(
                                "alpha bounding box max dimension is outside 65%-90%"
                            )
                        if min(left, top, 1024 - right, 1024 - bottom) < 8:
                            result["errors"].append("alpha content is clipped at canvas edge")
        except Exception as error:
            result["errors"].append(f"cannot decode image: {error}")

        digest = sha256(path)
        result["sha256"] = digest
        duplicates = known_hashes.get(digest, [])
        result["duplicateOf"] = duplicates
        if duplicates:
            result["errors"].append("exact duplicate of existing asset")

        results.append(result)
        errors.extend(f"{item['id']}: {message}" for message in result["errors"])

    report = {"ok": not errors, "results": results, "errors": errors}
    rendered = json.dumps(report, ensure_ascii=False, indent=2)
    print(rendered)
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(rendered + "\n", encoding="utf-8")
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
