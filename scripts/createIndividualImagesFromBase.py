from __future__ import annotations

import hashlib
import math
import random
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
MONSTER_DIR = ROOT / "assets" / "monsters"
OUTPUT_DIR = MONSTER_DIR / "individuals"
DOCS_DIR = ROOT / "docs"
SIZE = 1024
TRANSPARENT = (0, 0, 0, 0)

Color = tuple[int, int, int]


SPECIES_KEYS = [
    "dog",
    "cat",
    "squirrel",
    "frog",
    "bear",
    "fox",
    "tanuki",
    "lion",
    "elephant",
    "giraffe",
    "whale",
    "dolphin",
    "shark",
    "penguin",
    "sparrow",
    "crow",
    "owl",
    "turtle",
    "crocodile",
    "snake",
    "beetle",
    "stag_beetle",
    "deer",
    "rabbit",
    "jellyfish",
    "mole",
    "ostrich",
    "eagle",
    "human",
    "gorilla",
    "monkey",
    "hippo",
    "horse",
    "koala",
    "hamster",
]


@dataclass(frozen=True)
class SpeciesProfile:
    feature: str
    group: str
    pattern: str
    accessory: str
    motif: str
    palette: tuple[Color, Color]
    fit: int = 790
    y_offset: int = 10


@dataclass(frozen=True)
class VariantSpec:
    label: str
    primary: Color
    secondary: Color
    marking: str
    accessory: str
    motif: str
    rotation: float
    scale: float
    dx: int
    dy: int
    saturation: float
    brightness: float
    contrast: float
    tint_strength: float
    rarity: str


SPECIES: dict[str, SpeciesProfile] = {
    "dog": SpeciesProfile(
        "loyal canine body, pointed ears, fluffy tail",
        "mammal",
        "fur_stripes",
        "collar and tail ribbon",
        "paw badge",
        ((74, 164, 236), (255, 211, 92)),
    ),
    "cat": SpeciesProfile(
        "nimble cat silhouette, tall ears, curling tail",
        "mammal",
        "moon_spots",
        "bell collar and tail charm",
        "crescent",
        ((130, 87, 210), (255, 216, 94)),
    ),
    "squirrel": SpeciesProfile(
        "small forest body with oversized curled tail",
        "forest",
        "leaf_veins",
        "acorn pouch and tail band",
        "acorn",
        ((104, 174, 75), (219, 127, 55)),
        fit=770,
    ),
    "frog": SpeciesProfile(
        "round amphibian body, big eyes, springy limbs",
        "amphibian",
        "water_spots",
        "lily pad cap and belly beads",
        "lily",
        ((60, 190, 122), (80, 207, 230)),
    ),
    "bear": SpeciesProfile(
        "soft bear cub mass, round paws, gentle face",
        "heavy",
        "fur_patches",
        "paw guards and honey charm",
        "honey",
        ((155, 112, 67), (255, 190, 65)),
    ),
    "fox": SpeciesProfile(
        "sharp fox ears, agile body, plume tail",
        "mammal",
        "flame_stripes",
        "ear ribbons and tail flame charm",
        "flame",
        ((244, 116, 43), (255, 218, 88)),
    ),
    "tanuki": SpeciesProfile(
        "round tanuki body, mask-like face, striped tail",
        "forest",
        "leaf_veins",
        "leaf mask and belly sash",
        "leaf",
        ((86, 164, 82), (164, 116, 74)),
    ),
    "lion": SpeciesProfile(
        "mane-forward lion cub silhouette and proud stance",
        "heavy",
        "mane_rays",
        "mane beads and small crown",
        "sun",
        ((224, 131, 37), (255, 216, 75)),
    ),
    "elephant": SpeciesProfile(
        "large elephant body, trunk, broad ears",
        "heavy",
        "ceremonial_marks",
        "trunk ring and head cloth",
        "gem",
        ((94, 160, 206), (255, 196, 76)),
        fit=760,
    ),
    "giraffe": SpeciesProfile(
        "tall neck, ossicones, long legs",
        "tall",
        "patches",
        "neck scarf and horn beads",
        "leaf",
        ((226, 155, 63), (102, 185, 93)),
        fit=820,
    ),
    "whale": SpeciesProfile(
        "large ocean body, sweeping fins, gentle curve",
        "aquatic",
        "waves",
        "fin bands and wave beads",
        "wave",
        ((46, 147, 224), (114, 223, 246)),
        fit=770,
    ),
    "dolphin": SpeciesProfile(
        "sleek dolphin body, curved tail, playful leap",
        "aquatic",
        "waves",
        "dorsal ribbon and splash anklets",
        "splash",
        ((48, 162, 229), (167, 235, 252)),
    ),
    "shark": SpeciesProfile(
        "sharp shark profile, dorsal fin, powerful tail",
        "aquatic",
        "fin_streaks",
        "fin armor and tooth charm",
        "tooth",
        ((36, 105, 188), (139, 216, 244)),
    ),
    "penguin": SpeciesProfile(
        "small upright penguin, flippers, round belly",
        "bird",
        "ice_dots",
        "scarf and belly badge",
        "ice",
        ((65, 160, 219), (220, 248, 255)),
    ),
    "sparrow": SpeciesProfile(
        "small sparrow body, short beak, quick wings",
        "bird",
        "feather_lines",
        "wing ribbons and feather crest",
        "feather",
        ((76, 173, 95), (245, 182, 71)),
    ),
    "crow": SpeciesProfile(
        "dark crow silhouette, sharp beak, glossy wings",
        "bird",
        "night_feathers",
        "moon cape and wing charms",
        "moon",
        ((92, 74, 186), (196, 210, 255)),
    ),
    "owl": SpeciesProfile(
        "round owl body, wide eyes, layered feathers",
        "bird",
        "feather_lines",
        "brow crest and tiny satchel",
        "star",
        ((151, 104, 62), (255, 210, 94)),
    ),
    "turtle": SpeciesProfile(
        "sturdy turtle shell, short limbs, calm face",
        "reptile",
        "shell_segments",
        "shell gems and tail ring",
        "shell",
        ((67, 168, 93), (67, 186, 222)),
    ),
    "crocodile": SpeciesProfile(
        "armored crocodile body, long jaw, low stance",
        "reptile",
        "scales",
        "back plates and jaw mark",
        "fang",
        ((58, 158, 83), (229, 174, 68)),
        fit=760,
    ),
    "snake": SpeciesProfile(
        "coiled snake body, narrow head, smooth scales",
        "reptile",
        "scales",
        "tail jewel and body rings",
        "fang",
        ((111, 178, 74), (215, 91, 178)),
    ),
    "beetle": SpeciesProfile(
        "round beetle shell, horn, segmented legs",
        "insect",
        "carapace",
        "shell gems and wing veining",
        "gem",
        ((42, 159, 96), (247, 197, 58)),
    ),
    "stag_beetle": SpeciesProfile(
        "stag beetle mandibles, hard shell, angular legs",
        "insect",
        "carapace",
        "mandible caps and joint gems",
        "crystal",
        ((57, 116, 202), (238, 198, 74)),
        fit=780,
    ),
    "deer": SpeciesProfile(
        "gentle deer body, antlers, slender legs",
        "tall",
        "forest_spots",
        "antler flowers and hoof bands",
        "flower",
        ((88, 172, 91), (245, 181, 93)),
    ),
    "rabbit": SpeciesProfile(
        "soft rabbit body, long ears, round paws",
        "mammal",
        "dew_dots",
        "ear bows and carrot charm",
        "carrot",
        ((238, 128, 173), (109, 208, 121)),
    ),
    "jellyfish": SpeciesProfile(
        "translucent bell, dangling tentacles, water glow",
        "aquatic",
        "glow_beads",
        "bell jewels and tentacle rings",
        "bubble",
        ((71, 178, 229), (164, 223, 255)),
    ),
    "mole": SpeciesProfile(
        "earth mole body, claws, digging posture",
        "heavy",
        "earth_marks",
        "goggles and claw cuffs",
        "stone",
        ((119, 90, 66), (235, 177, 76)),
    ),
    "ostrich": SpeciesProfile(
        "runner bird body, long legs, fluffy feathers",
        "bird",
        "runner_streaks",
        "leg bands and plume charm",
        "feather",
        ((229, 126, 70), (255, 221, 113)),
        fit=820,
    ),
    "eagle": SpeciesProfile(
        "sky eagle body, broad wings, sharp beak",
        "bird",
        "feather_lines",
        "wing medals and sun crest",
        "sun",
        ((60, 135, 218), (246, 196, 67)),
    ),
    "human": SpeciesProfile(
        "young adventurer silhouette, jacket, confident pose",
        "humanoid",
        "adventurer_marks",
        "scarf, satchel, and elemental badge",
        "compass",
        ((67, 150, 226), (245, 185, 71)),
        fit=820,
    ),
    "gorilla": SpeciesProfile(
        "powerful gorilla body, broad shoulders, large hands",
        "heavy",
        "stone_marks",
        "shoulder guards and wrist leaves",
        "stone",
        ((91, 132, 95), (197, 157, 82)),
        fit=760,
    ),
    "monkey": SpeciesProfile(
        "nimble monkey body, long tail, playful hands",
        "forest",
        "leaf_veins",
        "headband and tail charm",
        "banana",
        ((93, 171, 83), (255, 199, 72)),
    ),
    "hippo": SpeciesProfile(
        "round river hippo body, big snout, sturdy legs",
        "heavy",
        "water_spots",
        "water scarf and tusk gems",
        "wave",
        ((72, 151, 206), (211, 160, 214)),
        fit=760,
    ),
    "horse": SpeciesProfile(
        "runner horse body, mane, lifted legs",
        "tall",
        "runner_streaks",
        "mane ribbons and saddle cloth",
        "horseshoe",
        ((222, 127, 58), (80, 170, 224)),
    ),
    "koala": SpeciesProfile(
        "round koala body, large ears, sleepy face",
        "forest",
        "leaf_veins",
        "eucalyptus crown and cheek leaves",
        "leaf",
        ((92, 169, 105), (169, 202, 218)),
    ),
    "hamster": SpeciesProfile(
        "tiny hamster body, cheek puffs, small paws",
        "mammal",
        "dew_dots",
        "seed satchel and cheek sparkles",
        "seed",
        ((230, 151, 77), (255, 214, 104)),
    ),
}


VARIANTS: dict[str, VariantSpec] = {
    "asatsuyu": VariantSpec(
        "morning dew",
        (95, 200, 154),
        (171, 232, 255),
        "dew dots on body",
        "small dew beads and fresh sprout accent",
        "dew",
        -3.0,
        0.98,
        -18,
        8,
        1.08,
        1.06,
        1.02,
        0.15,
        "season",
    ),
    "youkou": VariantSpec(
        "sunlight",
        (255, 181, 55),
        (255, 237, 126),
        "sun streaks",
        "gold band, bright crest, and warm charm",
        "sun",
        2.5,
        1.02,
        18,
        -6,
        1.13,
        1.12,
        1.05,
        0.18,
        "season",
    ),
    "tasogare": VariantSpec(
        "twilight ember",
        (237, 92, 52),
        (255, 161, 91),
        "ember stripes",
        "flowing dusk scarf and ember charm",
        "ember",
        -5.0,
        1.01,
        -8,
        0,
        1.14,
        1.05,
        1.08,
        0.2,
        "season",
    ),
    "tsukikage": VariantSpec(
        "moon shadow",
        (111, 86, 207),
        (205, 214, 255),
        "moon spots",
        "crescent charm and dark sash",
        "moon",
        4.0,
        0.99,
        12,
        6,
        0.98,
        0.96,
        1.12,
        0.24,
        "season",
    ),
    "harukaze": VariantSpec(
        "spring wind",
        (81, 185, 91),
        (208, 245, 177),
        "leaf veins",
        "leaf wreath, vine wrap, and petal charm",
        "leaf",
        -2.0,
        1.0,
        -12,
        -4,
        1.15,
        1.07,
        1.03,
        0.16,
        "season",
    ),
    "natsuhikari": VariantSpec(
        "summer light",
        (52, 176, 239),
        (166, 240, 255),
        "water glints",
        "clear water beads and bright fin-like sash",
        "splash",
        3.0,
        1.03,
        15,
        -2,
        1.16,
        1.12,
        1.05,
        0.18,
        "season",
    ),
    "momiji": VariantSpec(
        "autumn maple",
        (222, 91, 42),
        (255, 190, 69),
        "maple patches",
        "maple cloak, warm ribbon, and leaf charm",
        "maple",
        -4.0,
        1.01,
        -16,
        8,
        1.12,
        1.04,
        1.08,
        0.22,
        "season",
    ),
    "yukitomoshi": VariantSpec(
        "snow lantern",
        (124, 213, 248),
        (255, 255, 255),
        "ice speckles",
        "snow scarf, ice cuff, and lantern glow",
        "snow",
        2.0,
        0.99,
        10,
        4,
        0.9,
        1.08,
        1.04,
        0.16,
        "season",
    ),
    "common": VariantSpec(
        "common",
        (151, 163, 181),
        (238, 242, 247),
        "small natural mark",
        "simple band and one small species charm",
        "soft",
        0.0,
        0.96,
        0,
        12,
        1.0,
        1.0,
        1.0,
        0.06,
        "rarity",
    ),
    "uncommon": VariantSpec(
        "uncommon",
        (70, 145, 231),
        (190, 224, 255),
        "clear blue markings",
        "blue badge, extra cuff, and sharper pose",
        "spark",
        2.0,
        1.03,
        14,
        -6,
        1.1,
        1.06,
        1.05,
        0.16,
        "rarity",
    ),
    "rare": VariantSpec(
        "rare",
        (159, 91, 230),
        (101, 222, 244),
        "crystal runes",
        "asymmetric crystal ornament and bright aura edge",
        "crystal",
        -3.5,
        1.05,
        -12,
        -10,
        1.18,
        1.08,
        1.1,
        0.24,
        "rarity",
    ),
    "legend": VariantSpec(
        "legend",
        (245, 172, 43),
        (255, 242, 153),
        "gold runes",
        "gold crest, heroic mantle, and large species emblem",
        "legend",
        3.5,
        1.08,
        8,
        -16,
        1.22,
        1.14,
        1.12,
        0.3,
        "rarity",
    ),
}


VARIANT_ORDER = list(VARIANTS.keys())


def rgba(color: Color, alpha: int) -> tuple[int, int, int, int]:
    return (*color, max(0, min(255, alpha)))


def deterministic_random(*parts: str) -> random.Random:
    digest = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()
    return random.Random(int(digest[:16], 16))


def is_edge_background(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a < 16:
        return True
    bright = r >= 224 and g >= 224 and b >= 224
    nearly_neutral = max(r, g, b) - min(r, g, b) <= 28
    return bright and nearly_neutral


def remove_edge_background(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    alpha_bbox = image.getchannel("A").getbbox()
    corners_are_clear = all(
        image.getpixel(point)[3] < 16
        for point in ((0, 0), (image.width - 1, 0), (0, image.height - 1), (image.width - 1, image.height - 1))
    )
    if alpha_bbox and corners_are_clear:
        return image

    width, height = image.size
    pixels = image.load()
    visited = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        idx = y * width + x
        if visited[idx]:
            return
        if is_edge_background(pixels[x, y]):
            visited[idx] = 1
            queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height:
                enqueue(nx, ny)

    mask = Image.new("L", image.size, 0)
    mask_pixels = mask.load()
    for y in range(height):
        row = y * width
        for x in range(width):
            if not visited[row + x]:
                mask_pixels[x, y] = 255

    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(radius=0.45))
    result = image.copy()
    result.putalpha(mask)
    return result


def prepare_subject(base_image: Image.Image, profile: SpeciesProfile) -> Image.Image:
    cutout = remove_edge_background(base_image)
    bbox = cutout.getchannel("A").getbbox()
    if not bbox:
        raise ValueError("Base image has no visible subject after background removal.")

    pad = 28
    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(cutout.width, bbox[2] + pad)
    bottom = min(cutout.height, bbox[3] + pad)
    subject = cutout.crop((left, top, right, bottom))

    scale = min(profile.fit / subject.width, profile.fit / subject.height)
    new_size = (max(1, int(subject.width * scale)), max(1, int(subject.height * scale)))
    subject = subject.resize(new_size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (SIZE, SIZE), TRANSPARENT)
    x = (SIZE - subject.width) // 2
    y = (SIZE - subject.height) // 2 + profile.y_offset
    canvas.alpha_composite(subject, (x, y))
    return canvas


def pose_subject(subject: Image.Image, variant: VariantSpec) -> Image.Image:
    bbox = subject.getchannel("A").getbbox()
    if not bbox:
        return subject

    crop = subject.crop(bbox)
    if variant.scale != 1:
        new_size = (
            max(1, int(crop.width * variant.scale)),
            max(1, int(crop.height * variant.scale)),
        )
        crop = crop.resize(new_size, Image.Resampling.LANCZOS)

    crop = crop.rotate(variant.rotation, expand=True, resample=Image.Resampling.BICUBIC)
    if variant.rotation < -4 and variant.rarity == "season":
        crop = ImageOps.mirror(crop)

    canvas = Image.new("RGBA", (SIZE, SIZE), TRANSPARENT)
    x = (SIZE - crop.width) // 2 + variant.dx
    y = (SIZE - crop.height) // 2 + variant.dy
    canvas.alpha_composite(crop, (x, y))
    return canvas


def tint_subject(image: Image.Image, color: Color, strength: float) -> Image.Image:
    tint = Image.new("RGBA", image.size, rgba(color, 255))
    tint.putalpha(image.getchannel("A").point(lambda value: int(value * strength)))
    return Image.alpha_composite(image, tint)


def clipped_layer(layer: Image.Image, mask: Image.Image, multiplier: float = 1.0) -> Image.Image:
    alpha = ImageChops.multiply(
        layer.getchannel("A"),
        mask.point(lambda value: max(0, min(255, int(value * multiplier)))),
    )
    layer = layer.copy()
    layer.putalpha(alpha)
    return layer


def draw_star(draw: ImageDraw.ImageDraw, x: int, y: int, radius: int, color: tuple[int, int, int, int]) -> None:
    points = []
    for i in range(10):
        angle = -math.pi / 2 + i * math.pi / 5
        r = radius if i % 2 == 0 else radius * 0.45
        points.append((x + math.cos(angle) * r, y + math.sin(angle) * r))
    draw.polygon(points, fill=color)


def draw_leaf(draw: ImageDraw.ImageDraw, x: int, y: int, size: int, color: tuple[int, int, int, int]) -> None:
    draw.ellipse((x - size, y - size // 2, x + size, y + size // 2), fill=color)
    draw.line((x - size, y, x + size, y), fill=rgba((255, 255, 255), min(190, color[3] + 40)), width=max(1, size // 8))


def draw_drop(draw: ImageDraw.ImageDraw, x: int, y: int, size: int, color: tuple[int, int, int, int]) -> None:
    points = [(x, y - size), (x + size, y + size // 4), (x, y + size), (x - size, y + size // 4)]
    draw.polygon(points, fill=color)
    draw.ellipse((x - size, y, x + size, y + size * 2), fill=color)


def draw_diamond(draw: ImageDraw.ImageDraw, x: int, y: int, size: int, color: tuple[int, int, int, int]) -> None:
    draw.polygon([(x, y - size), (x + size, y), (x, y + size), (x - size, y)], fill=color)
    draw.line((x, y - size, x, y + size), fill=rgba((255, 255, 255), 160), width=max(1, size // 5))


def draw_flame(draw: ImageDraw.ImageDraw, x: int, y: int, size: int, color: tuple[int, int, int, int]) -> None:
    points = [
        (x, y - size),
        (x + size // 2, y - size // 4),
        (x + size // 3, y + size),
        (x, y + size // 2),
        (x - size // 3, y + size),
        (x - size // 2, y - size // 5),
    ]
    draw.polygon(points, fill=color)


def add_body_markings(
    subject: Image.Image,
    mask: Image.Image,
    bbox: tuple[int, int, int, int],
    profile: SpeciesProfile,
    variant: VariantSpec,
    rnd: random.Random,
) -> Image.Image:
    layer = Image.new("RGBA", subject.size, TRANSPARENT)
    draw = ImageDraw.Draw(layer)
    left, top, right, bottom = bbox
    width = right - left
    height = bottom - top
    c1 = rgba(variant.primary, 64 if variant.rarity == "season" else 82)
    c2 = rgba(variant.secondary, 58 if variant.rarity == "season" else 76)

    pattern = profile.pattern
    if variant.motif in {"crystal", "legend"}:
        pattern = "crystal_runes"
    elif variant.motif in {"snow", "dew"} and profile.group not in {"insect", "reptile"}:
        pattern = "glow_beads"

    if pattern in {"fur_stripes", "flame_stripes", "fin_streaks", "runner_streaks"}:
        for i in range(8):
            y = top + int(height * (0.22 + i * 0.07)) + rnd.randint(-10, 10)
            x0 = left + int(width * rnd.uniform(0.08, 0.28))
            x1 = right - int(width * rnd.uniform(0.08, 0.22))
            draw.line((x0, y, x1, y + rnd.randint(-28, 28)), fill=c1, width=rnd.randint(7, 13))
            draw.line((x0 + 18, y + 14, x1 - 18, y + rnd.randint(-12, 22)), fill=c2, width=rnd.randint(2, 5))
    elif pattern in {"moon_spots", "dew_dots", "water_spots", "ice_dots", "glow_beads"}:
        for _ in range(24):
            x = rnd.randint(left + width // 8, right - width // 8)
            y = rnd.randint(top + height // 8, bottom - height // 8)
            r = rnd.randint(7, 20)
            draw.ellipse((x - r, y - r, x + r, y + r), fill=rnd.choice([c1, c2]))
            if r > 13:
                draw.ellipse((x - r // 3, y - r // 3, x, y), fill=rgba((255, 255, 255), 120))
    elif pattern in {"leaf_veins", "forest_spots"}:
        for _ in range(14):
            x = rnd.randint(left + width // 6, right - width // 6)
            y = rnd.randint(top + height // 5, bottom - height // 8)
            draw_leaf(draw, x, y, rnd.randint(14, 28), rnd.choice([c1, c2]))
    elif pattern in {"patches", "fur_patches", "ceremonial_marks", "earth_marks", "stone_marks"}:
        for _ in range(13):
            x = rnd.randint(left + width // 7, right - width // 7)
            y = rnd.randint(top + height // 7, bottom - height // 7)
            rx = rnd.randint(18, 42)
            ry = rnd.randint(10, 28)
            draw.ellipse((x - rx, y - ry, x + rx, y + ry), fill=rnd.choice([c1, c2]))
    elif pattern in {"feather_lines", "night_feathers", "mane_rays"}:
        cx = (left + right) // 2
        cy = top + height // 2
        for i in range(18):
            angle = -math.pi * 0.85 + i * math.pi * 1.7 / 17
            length = rnd.randint(width // 8, width // 3)
            x = int(cx + math.cos(angle) * length)
            y = int(cy + math.sin(angle) * length)
            draw.line((cx, cy, x, y), fill=rnd.choice([c1, c2]), width=rnd.randint(3, 7))
    elif pattern in {"shell_segments", "scales", "carapace"}:
        step_x = max(28, width // 9)
        step_y = max(24, height // 10)
        for y in range(top + height // 5, bottom - height // 8, step_y):
            shift = 0 if ((y - top) // step_y) % 2 == 0 else step_x // 2
            for x in range(left + width // 7 + shift, right - width // 7, step_x):
                if pattern == "carapace":
                    draw_diamond(draw, x, y, rnd.randint(8, 16), rnd.choice([c1, c2]))
                else:
                    draw.arc((x - 18, y - 12, x + 18, y + 24), 200, 340, fill=rnd.choice([c1, c2]), width=4)
    elif pattern == "waves":
        for row in range(6):
            y = top + int(height * (0.25 + row * 0.1))
            points = []
            for i in range(8):
                x = left + int(width * (0.14 + i * 0.1))
                points.append((x, y + int(math.sin(i * 1.4 + row) * 18)))
            draw.line(points, fill=rnd.choice([c1, c2]), width=7)
    elif pattern == "adventurer_marks":
        for i in range(5):
            x = left + int(width * (0.35 + i * 0.07))
            y = top + int(height * (0.35 + i * 0.04))
            draw_diamond(draw, x, y, 14, rnd.choice([c1, c2]))
    elif pattern == "crystal_runes":
        for _ in range(18):
            x = rnd.randint(left + width // 7, right - width // 7)
            y = rnd.randint(top + height // 7, bottom - height // 7)
            draw_diamond(draw, x, y, rnd.randint(9, 20), rnd.choice([c1, c2]))

    return Image.alpha_composite(subject, clipped_layer(layer, mask, 1.7))


def add_glow(canvas: Image.Image, mask: Image.Image, variant: VariantSpec) -> Image.Image:
    blur_radius = 16 if variant.rarity == "season" else 22
    glow_alpha = mask.filter(ImageFilter.GaussianBlur(radius=blur_radius))
    strength = 0.18 if variant.rarity == "season" else 0.28
    if variant.motif == "legend":
        strength = 0.38
    glow_alpha = glow_alpha.point(lambda value: int(value * strength))
    glow = Image.new("RGBA", canvas.size, rgba(variant.secondary, 0))
    glow.putalpha(glow_alpha)

    outline_alpha = ImageChops.subtract(mask.filter(ImageFilter.MaxFilter(13)), mask)
    outline_alpha = outline_alpha.filter(ImageFilter.GaussianBlur(radius=1.2))
    outline_alpha = outline_alpha.point(lambda value: int(value * (0.55 if variant.motif == "legend" else 0.38)))
    outline = Image.new("RGBA", canvas.size, rgba(variant.primary, 0))
    outline.putalpha(outline_alpha)

    return Image.alpha_composite(Image.alpha_composite(canvas, glow), outline)


def draw_group_silhouette(
    bbox: tuple[int, int, int, int],
    profile: SpeciesProfile,
    variant: VariantSpec,
    rnd: random.Random,
) -> Image.Image:
    layer = Image.new("RGBA", (SIZE, SIZE), TRANSPARENT)
    draw = ImageDraw.Draw(layer)
    left, top, right, bottom = bbox
    width = right - left
    height = bottom - top
    cx = (left + right) // 2
    primary = rgba(variant.primary, 92)
    secondary = rgba(variant.secondary, 84)

    if profile.group == "aquatic":
        for side in (-1, 1):
            x = cx + side * width // 3
            y = top + height // 2
            points = [
                (x, y),
                (x + side * 120, y - 70),
                (x + side * 150, y + 40),
                (x + side * 50, y + 70),
            ]
            draw.polygon(points, fill=secondary)
        for _ in range(7):
            x = rnd.randint(left, right)
            y = rnd.randint(top + height // 8, bottom - height // 8)
            draw.ellipse((x - 16, y - 16, x + 16, y + 16), outline=rgba(variant.secondary, 115), width=3)
    elif profile.group == "bird":
        for side in (-1, 1):
            base_x = cx + side * width // 4
            base_y = top + height // 2
            for i in range(4):
                tip = (base_x + side * (85 + i * 22), base_y + i * 28 - 40)
                draw.polygon([(base_x, base_y), tip, (base_x + side * 30, base_y + i * 36 + 40)], fill=rgba(variant.primary, 58))
    elif profile.group == "insect":
        for side in (-1, 1):
            x0 = cx + side * width // 12
            x_left = x0 - side * width // 2 - 20
            x_right = x0 + side * width // 3
            draw.ellipse(
                (
                    min(x_left, x_right),
                    top + height // 10,
                    max(x_left, x_right),
                    bottom - height // 8,
                ),
                fill=rgba(variant.secondary, 52),
                outline=secondary,
                width=4,
            )
    elif profile.group == "reptile":
        count = 7
        for i in range(count):
            x = left + int(width * (0.18 + i * 0.1))
            y = top + int(height * (0.17 + math.sin(i) * 0.05))
            draw.polygon([(x - 18, y + 20), (x, y - 30), (x + 18, y + 20)], fill=primary)
    elif profile.group == "humanoid":
        draw.pieslice((left + width // 10, top + height // 5, right - width // 10, bottom + 80), 200, 340, fill=rgba(variant.primary, 58))
    elif profile.group == "tall":
        draw.line((cx - 130, top + height // 3, cx + 120, bottom - height // 5), fill=secondary, width=18)
        draw.line((cx - 90, top + height // 3 + 28, cx + 150, bottom - height // 5 + 18), fill=primary, width=7)
    elif profile.group == "heavy":
        for side in (-1, 1):
            x = cx + side * width // 3
            y = top + height // 2
            draw.ellipse((x - 58, y - 58, x + 58, y + 58), fill=rgba(variant.primary, 62))
            draw_diamond(draw, x, y, 22, rgba(variant.secondary, 110))
    else:
        for side in (-1, 1):
            x = cx + side * width // 3
            y = top + height // 3
            draw_leaf(draw, x, y, 42, rgba(variant.secondary, 88))

    if variant.motif == "legend":
        draw.ellipse((cx - 160, top - 40, cx + 160, top + 42), outline=rgba(variant.secondary, 148), width=10)
    elif variant.motif == "crystal":
        draw_diamond(draw, right - width // 6, top + height // 5, 45, rgba(variant.secondary, 132))
    elif variant.motif == "moon":
        draw.ellipse((left + 20, top + 20, left + 100, top + 100), fill=rgba(variant.secondary, 92))
        draw.ellipse((left + 52, top + 10, left + 128, top + 92), fill=TRANSPARENT)

    return layer.filter(ImageFilter.GaussianBlur(radius=0.2))


def draw_neck_band(
    draw: ImageDraw.ImageDraw,
    bbox: tuple[int, int, int, int],
    variant: VariantSpec,
    rnd: random.Random,
) -> None:
    left, top, right, bottom = bbox
    width = right - left
    height = bottom - top
    y = top + int(height * rnd.uniform(0.42, 0.54))
    x0 = left + int(width * 0.34)
    x1 = right - int(width * 0.34)
    cx = (left + right) // 2
    curve_drop = max(8, height // 42)
    band_w = max(5, height // 70)
    draw.line((x0, y, cx, y + curve_drop, x1, y), fill=rgba(variant.primary, 176), width=band_w, joint="curve")
    draw.line((x0 + 10, y - 3, cx, y + curve_drop - 2, x1 - 10, y - 3), fill=rgba(variant.secondary, 190), width=max(2, band_w // 2), joint="curve")
    draw_diamond(draw, cx, y + curve_drop + 18, max(10, band_w + 4), rgba(variant.secondary, 210))


def draw_top_accessory(
    draw: ImageDraw.ImageDraw,
    bbox: tuple[int, int, int, int],
    profile: SpeciesProfile,
    variant: VariantSpec,
) -> None:
    left, top, right, bottom = bbox
    width = right - left
    cx = (left + right) // 2
    color = rgba(variant.primary, 190)
    highlight = rgba(variant.secondary, 210)

    if profile.group in {"bird", "mammal", "forest", "tall"}:
        for offset in (-36, 0, 36):
            draw_leaf(draw, cx + offset, top + 20 + abs(offset) // 4, 30, color if offset else highlight)
    elif profile.group == "aquatic":
        for offset in (-44, 0, 44):
            draw_drop(draw, cx + offset, top + 28, 22, highlight if offset == 0 else color)
    elif profile.group == "insect":
        draw_diamond(draw, cx - 38, top + 26, 28, color)
        draw_diamond(draw, cx + 38, top + 26, 28, highlight)
    elif profile.group == "reptile":
        for offset in (-48, 0, 48):
            draw.polygon(
                [(cx + offset - 20, top + 44), (cx + offset, top - 8), (cx + offset + 20, top + 44)],
                fill=color if offset else highlight,
            )
    elif profile.group == "humanoid":
        draw.rounded_rectangle((cx - 88, top + 20, cx + 88, top + 58), radius=18, fill=color)
        draw_diamond(draw, cx, top + 38, 20, highlight)
    else:
        draw_diamond(draw, cx, top + 28, 30, highlight)

    if variant.motif == "legend":
        crown_y = top - 8
        crown = [
            (cx - 82, crown_y + 60),
            (cx - 58, crown_y + 10),
            (cx - 30, crown_y + 56),
            (cx, crown_y),
            (cx + 30, crown_y + 56),
            (cx + 58, crown_y + 10),
            (cx + 82, crown_y + 60),
        ]
        draw.polygon(crown, fill=rgba(variant.secondary, 210))
        draw.line((cx - 82, crown_y + 60, cx + 82, crown_y + 60), fill=rgba(variant.primary, 230), width=8)


def draw_species_charm(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    profile: SpeciesProfile,
    variant: VariantSpec,
) -> None:
    color = rgba(variant.secondary, 220)
    accent = rgba(variant.primary, 210)
    motif = profile.motif

    if motif in {"leaf", "lily", "flower"}:
        for angle in range(0, 360, 60):
            dx = int(math.cos(math.radians(angle)) * 18)
            dy = int(math.sin(math.radians(angle)) * 10)
            draw_leaf(draw, x + dx, y + dy, 18, color)
    elif motif in {"wave", "splash", "bubble"}:
        draw_drop(draw, x, y, 20, color)
        draw.ellipse((x - 34, y - 34, x + 34, y + 34), outline=accent, width=4)
    elif motif in {"flame", "sun"}:
        draw_flame(draw, x, y, 28, color)
        draw_star(draw, x + 22, y - 22, 15, accent)
    elif motif in {"moon", "crescent"}:
        draw.ellipse((x - 30, y - 30, x + 30, y + 30), fill=color)
        draw.ellipse((x - 12, y - 36, x + 38, y + 20), fill=TRANSPARENT)
    elif motif in {"gem", "crystal", "stone", "shell"}:
        draw_diamond(draw, x, y, 32, color)
    elif motif in {"feather"}:
        draw.ellipse((x - 12, y - 38, x + 24, y + 38), fill=color)
        draw.line((x, y - 32, x, y + 32), fill=accent, width=4)
    elif motif in {"acorn", "seed", "banana", "carrot", "honey"}:
        draw.ellipse((x - 28, y - 18, x + 28, y + 30), fill=color)
        draw.rounded_rectangle((x - 28, y - 26, x + 28, y - 4), radius=10, fill=accent)
    elif motif in {"fang", "tooth"}:
        draw.polygon([(x - 18, y - 26), (x + 18, y - 26), (x, y + 34)], fill=color)
    elif motif == "compass":
        draw.ellipse((x - 34, y - 34, x + 34, y + 34), outline=color, width=7)
        draw.line((x, y - 26, x, y + 26), fill=accent, width=4)
        draw.line((x - 26, y, x + 26, y), fill=accent, width=4)
    elif motif == "horseshoe":
        draw.arc((x - 36, y - 36, x + 36, y + 36), 20, 340, fill=color, width=9)
    else:
        draw_star(draw, x, y, 30, color)


def ordered_box(x0: float, y0: float, x1: float, y1: float) -> tuple[int, int, int, int]:
    left = int(min(x0, x1))
    top = int(min(y0, y1))
    right = int(max(x0, x1))
    bottom = int(max(y0, y1))
    return left, top, right, bottom


def draw_large_costume(
    bbox: tuple[int, int, int, int],
    profile: SpeciesProfile,
    variant_key: str,
    variant: VariantSpec,
    rnd: random.Random,
) -> tuple[Image.Image, Image.Image]:
    behind = Image.new("RGBA", (SIZE, SIZE), TRANSPARENT)
    front = Image.new("RGBA", (SIZE, SIZE), TRANSPARENT)
    back = ImageDraw.Draw(behind)
    draw = ImageDraw.Draw(front)

    left, top, right, bottom = bbox
    width = right - left
    height = bottom - top
    cx = (left + right) // 2
    shoulder_y = top + int(height * 0.36)
    chest_y = top + int(height * 0.52)
    waist_y = top + int(height * 0.68)
    cape_top = top + int(height * 0.25)
    cape_bottom = min(SIZE - 12, bottom + int(height * 0.08))

    primary = rgba(variant.primary, 178)
    primary_soft = rgba(variant.primary, 118)
    secondary = rgba(variant.secondary, 202)
    secondary_soft = rgba(variant.secondary, 126)
    dark_trim = rgba((30, 41, 59), 120)

    cape_left = left - int(width * 0.16)
    cape_right = right + int(width * 0.16)
    if variant_key in {"tasogare", "momiji", "tsukikage", "rare", "legend"}:
        cape_points = [
            (cx - int(width * 0.34), cape_top),
            (cx + int(width * 0.34), cape_top),
            (cape_right, cape_bottom - int(height * 0.1)),
            (cx + int(width * 0.16), cape_bottom),
            (cx, cape_bottom - int(height * 0.05)),
            (cx - int(width * 0.16), cape_bottom),
            (cape_left, cape_bottom - int(height * 0.1)),
        ]
        cape_color = rgba(variant.primary, 88 if variant_key != "legend" else 122)
        back.polygon(cape_points, fill=cape_color)
        back.line(cape_points + [cape_points[0]], fill=rgba(variant.secondary, 150), width=max(5, width // 95))
    elif variant_key in {"harukaze", "asatsuyu", "yukitomoshi"}:
        for side in (-1, 1):
            base_x = cx + side * int(width * 0.18)
            for i in range(5):
                x = base_x + side * (i * 24)
                y = cape_top + i * int(height * 0.055)
                if variant_key == "yukitomoshi":
                    draw_diamond(back, x, y, max(18, width // 32), secondary_soft)
                else:
                    draw_leaf(back, x, y, max(24, width // 28), secondary_soft)
    elif variant_key == "natsuhikari":
        for side in (-1, 1):
            fin = [
                (cx + side * int(width * 0.18), cape_top),
                (cx + side * int(width * 0.58), top + int(height * 0.45)),
                (cx + side * int(width * 0.28), bottom - int(height * 0.1)),
            ]
            back.polygon(fin, fill=rgba(variant.secondary, 92), outline=rgba(variant.primary, 152))
    elif variant_key == "youkou":
        for i in range(14):
            angle = -math.pi * 0.95 + i * math.pi * 1.9 / 13
            x0 = cx + int(math.cos(angle) * width * 0.2)
            y0 = shoulder_y + int(math.sin(angle) * height * 0.14)
            x1 = cx + int(math.cos(angle) * width * 0.52)
            y1 = shoulder_y + int(math.sin(angle) * height * 0.36)
            back.line((x0, y0, x1, y1), fill=rgba(variant.secondary, 104), width=max(7, width // 80))

    shoulder_w = max(46, min(128, width // 5))
    shoulder_h = max(28, min(86, height // 10))
    for side in (-1, 1):
        sx = cx + side * int(width * 0.29)
        box = ordered_box(sx - shoulder_w, shoulder_y - shoulder_h, sx + shoulder_w, shoulder_y + shoulder_h)
        if variant_key in {"rare", "legend", "yukitomoshi"}:
            draw_diamond(draw, sx, shoulder_y, max(34, shoulder_w // 2), secondary)
            draw.line((sx - shoulder_w, shoulder_y, sx + shoulder_w, shoulder_y), fill=primary, width=max(6, width // 90))
        elif variant_key in {"harukaze", "momiji", "asatsuyu"}:
            draw_leaf(draw, sx, shoulder_y, max(40, shoulder_w // 2), secondary)
            draw_leaf(draw, sx + side * 26, shoulder_y + 12, max(28, shoulder_w // 3), primary)
        elif variant_key in {"tasogare", "youkou"}:
            draw_flame(draw, sx, shoulder_y, max(42, shoulder_w // 2), secondary)
            draw.ellipse(box, outline=primary, width=max(5, width // 100))
        elif variant_key == "natsuhikari":
            draw_drop(draw, sx, shoulder_y, max(34, shoulder_w // 2), secondary)
            draw.arc(box, 20, 320, fill=primary, width=max(6, width // 90))
        else:
            draw.rounded_rectangle(box, radius=max(10, shoulder_h // 2), fill=primary_soft, outline=secondary, width=max(4, width // 120))

    armor_w = max(70, min(190, width // 4))
    armor_h = max(60, min(160, height // 5))
    sash_w = max(10, width // 45)

    if variant_key in {"asatsuyu", "harukaze", "momiji"}:
        # Organic harness: readable as leaves/vines instead of a generic plate.
        draw.line((cx - armor_w, chest_y - armor_h // 2, cx + armor_w, chest_y + armor_h // 2), fill=primary, width=sash_w)
        draw.line((cx + armor_w, chest_y - armor_h // 2, cx - armor_w, chest_y + armor_h // 2), fill=rgba(variant.secondary, 170), width=max(5, sash_w // 2))
        for side in (-1, 1):
            draw_leaf(draw, cx + side * armor_w // 2, chest_y, max(28, width // 15), secondary)
    elif variant_key in {"youkou", "legend"}:
        # Hero breastplate with sun/gold shape, close to old bear's readable armor.
        plate = [
            (cx, chest_y - armor_h),
            (cx + armor_w, chest_y - armor_h // 5),
            (cx + armor_w // 2, chest_y + armor_h),
            (cx, chest_y + armor_h // 2),
            (cx - armor_w // 2, chest_y + armor_h),
            (cx - armor_w, chest_y - armor_h // 5),
        ]
        draw.polygon(plate, fill=rgba(variant.primary, 178), outline=secondary)
        draw_star(draw, cx, chest_y, max(24, width // 16), secondary)
    elif variant_key in {"tasogare"}:
        draw.line((cx - armor_w, chest_y + armor_h // 2, cx, chest_y - armor_h, cx + armor_w, chest_y + armor_h // 2), fill=rgba(variant.primary, 180), width=sash_w + 4)
        draw_flame(draw, cx, chest_y + armor_h // 3, max(30, width // 13), secondary)
    elif variant_key in {"tsukikage"}:
        draw.arc(ordered_box(cx - armor_w, chest_y - armor_h, cx + armor_w, chest_y + armor_h), 35, 325, fill=primary, width=sash_w + 4)
        draw.ellipse(ordered_box(cx - 34, chest_y - 34, cx + 34, chest_y + 34), fill=secondary)
        draw.ellipse(ordered_box(cx - 10, chest_y - 42, cx + 46, chest_y + 14), fill=TRANSPARENT)
    elif variant_key in {"natsuhikari", "yukitomoshi"}:
        for side in (-1, 1):
            draw_drop(draw, cx + side * armor_w // 2, chest_y, max(26, width // 16), secondary)
        draw.arc(ordered_box(cx - armor_w, chest_y - armor_h // 2, cx + armor_w, chest_y + armor_h // 2), 15, 345, fill=primary, width=sash_w)
    elif variant_key in {"rare"}:
        for side in (-1, 0, 1):
            draw_diamond(draw, cx + side * armor_w // 2, chest_y + abs(side) * 18, max(28, width // 14), secondary if side == 0 else primary)
    elif variant_key == "uncommon":
        shield = ordered_box(cx - armor_w // 2, chest_y - armor_h // 2, cx + armor_w // 2, chest_y + armor_h)
        draw.rounded_rectangle(shield, radius=max(18, width // 35), fill=rgba(variant.primary, 164), outline=secondary, width=max(5, width // 100))
        draw_star(draw, cx, chest_y + armor_h // 8, max(20, width // 18), secondary)
    else:
        # Common keeps a smaller practical pouch and clasp rather than a full panel.
        draw.rounded_rectangle(ordered_box(cx - armor_w // 2, chest_y - armor_h // 3, cx + armor_w // 2, chest_y + armor_h // 3), radius=max(14, width // 40), fill=rgba((92, 71, 58), 132), outline=secondary, width=4)
        draw_diamond(draw, cx, chest_y, max(18, width // 20), secondary)

    belt_h = max(10, height // 58)
    if variant_key in {"common", "uncommon", "rare", "legend"}:
        belt_left = left + int(width * 0.28)
        belt_right = right - int(width * 0.28)
    else:
        belt_left = left + int(width * 0.34)
        belt_right = right - int(width * 0.34)
    draw.rounded_rectangle(
        ordered_box(belt_left, waist_y - belt_h, belt_right, waist_y + belt_h),
        radius=belt_h,
        fill=rgba((25, 37, 61), 118),
    )
    draw_diamond(draw, cx, waist_y, max(10, width // 50), secondary)

    # Strong variant-specific props. These are intentionally large enough to read at card size.
    if variant_key == "asatsuyu":
        draw_drop(draw, right - width // 7, top + int(height * 0.58), max(34, width // 15), secondary)
        draw_leaf(draw, left + width // 7, bottom - height // 5, max(42, width // 12), primary)
    elif variant_key == "youkou":
        draw_star(draw, right - width // 7, top + int(height * 0.3), max(42, width // 12), secondary)
        back.ellipse(ordered_box(cx - width * 0.3, top - height * 0.03, cx + width * 0.3, top + height * 0.1), outline=rgba(variant.secondary, 168), width=max(6, width // 80))
    elif variant_key == "tasogare":
        draw_flame(draw, left + width // 7, bottom - height // 5, max(48, width // 11), secondary)
        draw_flame(draw, right - width // 7, bottom - height // 5, max(48, width // 11), primary)
    elif variant_key == "tsukikage":
        draw.ellipse(ordered_box(left + width * 0.04, top + height * 0.18, left + width * 0.24, top + height * 0.38), fill=secondary)
        draw.ellipse(ordered_box(left + width * 0.12, top + height * 0.14, left + width * 0.32, top + height * 0.34), fill=TRANSPARENT)
        draw_diamond(draw, right - width // 6, bottom - height // 4, max(26, width // 18), primary)
    elif variant_key == "harukaze":
        for offset in (-2, -1, 0, 1, 2):
            draw_leaf(draw, cx + offset * width // 11, bottom - height // 5, max(34, width // 14), secondary if offset % 2 else primary)
    elif variant_key == "natsuhikari":
        for side in (-1, 1):
            draw_drop(draw, cx + side * width // 3, bottom - height // 5, max(34, width // 14), secondary)
            draw.ellipse(ordered_box(cx + side * width // 3 - 34, bottom - height // 4, cx + side * width // 3 + 34, bottom - height // 4 + 68), outline=primary, width=5)
    elif variant_key == "momiji":
        for side in (-1, 1):
            draw_leaf(draw, cx + side * width // 3, shoulder_y + 32, max(54, width // 10), rgba(variant.primary, 190))
    elif variant_key == "yukitomoshi":
        for side in (-1, 1):
            draw_diamond(draw, cx + side * width // 3, bottom - height // 5, max(42, width // 12), secondary)
    elif variant_key == "common":
        draw.rounded_rectangle(ordered_box(right - width * 0.22, waist_y + height * 0.05, right - width * 0.02, waist_y + height * 0.24), radius=18, fill=rgba((122, 83, 51), 150), outline=secondary, width=4)
    elif variant_key == "uncommon":
        draw.rounded_rectangle(ordered_box(left + width * 0.04, top + height * 0.42, left + width * 0.24, top + height * 0.64), radius=22, fill=primary, outline=secondary, width=5)
        draw_star(draw, right - width // 7, top + height // 3, max(28, width // 16), secondary)
    elif variant_key == "rare":
        for side in (-1, 1):
            draw_diamond(draw, cx + side * width // 3, top + height // 5, max(46, width // 10), secondary)
            draw_diamond(draw, cx + side * width // 4, bottom - height // 4, max(34, width // 14), primary)
    elif variant_key == "legend":
        draw.ellipse(ordered_box(cx - width * 0.32, top - height * 0.08, cx + width * 0.32, top + height * 0.06), outline=secondary, width=max(8, width // 70))
        for side in (-1, 1):
            draw_star(draw, cx + side * width // 3, shoulder_y - height // 10, max(42, width // 11), secondary)
            draw_diamond(draw, cx + side * width // 4, bottom - height // 5, max(36, width // 13), primary)

    if profile.group == "aquatic":
        draw.line((left + width // 7, waist_y, right - width // 7, waist_y - height // 18), fill=rgba(variant.secondary, 190), width=max(12, width // 40))
    elif profile.group == "bird":
        for side in (-1, 1):
            draw.ellipse(ordered_box(cx + side * width * 0.28 - 24, shoulder_y + 10, cx + side * width * 0.28 + 24, shoulder_y + 58), fill=secondary)
    elif profile.group == "insect":
        horn_y = max(18, top - int(height * 0.12))
        if variant_key in {"rare", "legend", "tsukikage"}:
            horn_points = [
                (cx - int(width * 0.1), top + int(height * 0.1)),
                (cx - int(width * 0.32), horn_y),
                (cx - int(width * 0.2), top + int(height * 0.22)),
                (cx, top + int(height * 0.02)),
                (cx + int(width * 0.2), top + int(height * 0.22)),
                (cx + int(width * 0.32), horn_y),
                (cx + int(width * 0.1), top + int(height * 0.1)),
            ]
            draw.line(horn_points, fill=secondary, width=max(14, width // 42), joint="curve")
            draw.line(horn_points, fill=rgba((24, 33, 58), 180), width=max(5, width // 110), joint="curve")
        else:
            for side in (-1, 1):
                horn = [
                    (cx + side * int(width * 0.08), top + int(height * 0.16)),
                    (cx + side * int(width * 0.36), horn_y + int(height * 0.08)),
                    (cx + side * int(width * 0.22), top + int(height * 0.24)),
                ]
                draw.polygon(horn, fill=secondary)
                draw.line(horn + [horn[0]], fill=rgba((24, 33, 58), 160), width=max(4, width // 120))
        for side in (-1, 1):
            draw_diamond(draw, cx + side * width // 4, top + height // 4, max(30, width // 16), rgba(variant.secondary, 180))
            for i in range(3):
                leg_x = cx + side * int(width * (0.24 + i * 0.08))
                leg_y = bottom - int(height * (0.26 - i * 0.04))
                draw.line((leg_x, leg_y, leg_x + side * int(width * 0.18), leg_y + int(height * 0.08)), fill=primary, width=max(8, width // 70))
                draw_diamond(draw, leg_x + side * int(width * 0.12), leg_y + int(height * 0.05), max(14, width // 32), secondary)
    elif profile.group == "reptile":
        for i in range(4):
            draw.polygon(
                [
                    (left + width // 4 + i * width // 8, top + height // 6),
                    (left + width // 4 + i * width // 8 + width // 18, top + height // 14),
                    (left + width // 4 + i * width // 8 + width // 9, top + height // 6),
                ],
                fill=primary,
            )

    return behind.filter(ImageFilter.GaussianBlur(radius=0.25)), front.filter(ImageFilter.GaussianBlur(radius=0.12))


def draw_front_accessories(
    bbox: tuple[int, int, int, int],
    profile: SpeciesProfile,
    variant: VariantSpec,
    rnd: random.Random,
) -> Image.Image:
    layer = Image.new("RGBA", (SIZE, SIZE), TRANSPARENT)
    draw = ImageDraw.Draw(layer)
    left, top, right, bottom = bbox
    width = right - left
    height = bottom - top
    cx = (left + right) // 2

    if profile.group == "insect":
        for side in (-1, 1):
            medallion_x = cx + side * width // 5
            medallion_y = top + int(height * 0.44)
            draw_diamond(draw, medallion_x, medallion_y, max(18, width // 24), rgba(variant.secondary, 210))
    else:
        draw_neck_band(draw, bbox, variant, rnd)
    draw_top_accessory(draw, bbox, profile, variant)

    charm_x = right - width // 6
    charm_y = top + int(height * 0.68)
    if profile.group in {"aquatic", "reptile"}:
        charm_x = left + width // 6
        charm_y = top + int(height * 0.62)
    elif profile.group == "bird":
        charm_y = top + int(height * 0.48)
    elif profile.group == "humanoid":
        charm_x = right - width // 4
        charm_y = top + int(height * 0.48)
    draw_species_charm(draw, charm_x, charm_y, profile, variant)

    if variant.motif in {"snow", "dew", "splash"}:
        for i in range(7):
            x = left + int(width * (0.2 + i * 0.1))
            y = bottom - int(height * rnd.uniform(0.18, 0.34))
            draw_drop(draw, x, y, rnd.randint(8, 16), rgba(variant.secondary, 155))
    elif variant.motif in {"leaf", "maple"}:
        for i in range(6):
            x = left + int(width * (0.15 + i * 0.14))
            y = top + int(height * rnd.uniform(0.25, 0.82))
            draw_leaf(draw, x, y, rnd.randint(14, 25), rgba(variant.primary, 160))
    elif variant.motif in {"ember", "sun"}:
        for i in range(5):
            x = left + int(width * (0.2 + i * 0.13))
            y = top + int(height * rnd.uniform(0.3, 0.8))
            draw_flame(draw, x, y, rnd.randint(15, 28), rgba(variant.primary, 150))
    elif variant.motif in {"crystal", "legend"}:
        for i in range(6):
            x = left + int(width * (0.16 + i * 0.14))
            y = top + int(height * rnd.uniform(0.2, 0.78))
            draw_diamond(draw, x, y, rnd.randint(12, 22), rgba(variant.secondary, 170))
    elif variant.motif == "moon":
        for i in range(6):
            draw_star(
                draw,
                left + int(width * rnd.uniform(0.18, 0.82)),
                top + int(height * rnd.uniform(0.18, 0.72)),
                rnd.randint(8, 16),
                rgba(variant.secondary, 155),
            )

    # Cheek/expression hint near the upper face area, intentionally small and decorative.
    cheek_y = top + int(height * 0.34)
    for side in (-1, 1):
        x = cx + side * width // 8
        draw.ellipse((x - 12, cheek_y - 7, x + 12, cheek_y + 7), fill=rgba(variant.primary, 75))

    return layer.filter(ImageFilter.GaussianBlur(radius=0.15))


def add_attached_particles(
    image: Image.Image,
    bbox: tuple[int, int, int, int],
    variant: VariantSpec,
    rnd: random.Random,
) -> Image.Image:
    layer = Image.new("RGBA", image.size, TRANSPARENT)
    draw = ImageDraw.Draw(layer)
    left, top, right, bottom = bbox
    width = right - left
    height = bottom - top
    count = 10 if variant.rarity == "season" else 14
    if variant.motif == "legend":
        count = 20

    for _ in range(count):
        x = rnd.randint(max(24, left - 42), min(SIZE - 24, right + 42))
        y = rnd.randint(max(24, top - 30), min(SIZE - 24, bottom + 30))
        # Keep particles close to the character, not spread as a background pattern.
        if rnd.random() < 0.65:
            x = rnd.choice([rnd.randint(left, right), rnd.randint(max(24, left - 52), left + width // 4), rnd.randint(right - width // 4, min(SIZE - 24, right + 52))])
            y = rnd.randint(top + height // 8, bottom - height // 12)
        size = rnd.randint(7, 18)
        color = rgba(rnd.choice([variant.primary, variant.secondary]), rnd.randint(100, 170))
        if variant.motif in {"leaf", "maple"}:
            draw_leaf(draw, x, y, size, color)
        elif variant.motif in {"dew", "snow", "splash"}:
            draw_drop(draw, x, y, size, color)
        elif variant.motif in {"crystal", "legend"}:
            draw_diamond(draw, x, y, size, color)
        elif variant.motif in {"ember", "sun"}:
            draw_flame(draw, x, y, size, color)
        else:
            draw_star(draw, x, y, size, color)

    return Image.alpha_composite(image, layer)


def clear_canvas_border(image: Image.Image, border: int = 10) -> Image.Image:
    if border <= 0:
        return image
    image = image.copy()
    alpha = image.getchannel("A")
    draw = ImageDraw.Draw(alpha)
    draw.rectangle((0, 0, SIZE, border), fill=0)
    draw.rectangle((0, SIZE - border, SIZE, SIZE), fill=0)
    draw.rectangle((0, 0, border, SIZE), fill=0)
    draw.rectangle((SIZE - border, 0, SIZE, SIZE), fill=0)
    image.putalpha(alpha)
    return image


def create_variant(species_key: str, variant_key: str, prepared_subject: Image.Image) -> Image.Image:
    profile = SPECIES[species_key]
    variant = VARIANTS[variant_key]
    rnd = deterministic_random(species_key, variant_key)

    subject = pose_subject(prepared_subject, variant)
    mask = subject.getchannel("A")
    bbox = mask.getbbox()
    if not bbox:
        raise ValueError(f"{species_key}_{variant_key} has no visible subject.")

    subject = ImageEnhance.Color(subject).enhance(variant.saturation)
    subject = ImageEnhance.Brightness(subject).enhance(variant.brightness)
    subject = ImageEnhance.Contrast(subject).enhance(variant.contrast)
    subject = tint_subject(subject, variant.primary, variant.tint_strength)
    subject = add_body_markings(subject, mask, bbox, profile, variant, rnd)

    canvas = Image.new("RGBA", (SIZE, SIZE), TRANSPARENT)
    behind = draw_group_silhouette(bbox, profile, variant, rnd)
    costume_behind, costume_front = draw_large_costume(bbox, profile, variant_key, variant, rnd)
    canvas = Image.alpha_composite(canvas, behind)
    canvas = Image.alpha_composite(canvas, costume_behind)
    canvas = add_glow(canvas, mask, variant)
    canvas = Image.alpha_composite(canvas, subject)
    canvas = Image.alpha_composite(canvas, costume_front)
    canvas = Image.alpha_composite(canvas, draw_front_accessories(bbox, profile, variant, rnd))
    canvas = add_attached_particles(canvas, bbox, variant, rnd)
    return clear_canvas_border(canvas)


def validate_output(image: Image.Image, path: Path) -> None:
    if image.size != (SIZE, SIZE):
        raise ValueError(f"{path}: invalid size {image.size}")
    if image.mode != "RGBA":
        raise ValueError(f"{path}: invalid mode {image.mode}")
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        raise ValueError(f"{path}: output is transparent.")
    corners = [
        alpha.getpixel((0, 0)),
        alpha.getpixel((SIZE - 1, 0)),
        alpha.getpixel((0, SIZE - 1)),
        alpha.getpixel((SIZE - 1, SIZE - 1)),
    ]
    if any(value != 0 for value in corners):
        raise ValueError(f"{path}: background is not transparent at corners.")
    visible_pixels = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
    if not visible_pixels:
        raise ValueError(f"{path}: alpha coverage too low.")
    left, top, right, bottom = bbox
    if left < 4 or top < 4 or right > SIZE - 4 or bottom > SIZE - 4:
        raise ValueError(f"{path}: subject is too close to the canvas edge.")


def ensure_base_images(species_keys: Iterable[str]) -> None:
    missing = [key for key in species_keys if not (MONSTER_DIR / f"{key}.png").is_file()]
    if missing:
        raise FileNotFoundError(f"Missing base images: {', '.join(missing)}")


def write_status_doc(generated_paths: list[Path], failed: list[str]) -> None:
    DOCS_DIR.mkdir(exist_ok=True)
    total = len(SPECIES_KEYS) * len(VARIANT_ORDER)
    generated_set = {path.as_posix() for path in generated_paths}
    rows = []
    for species_key in SPECIES_KEYS:
        expected = [
            OUTPUT_DIR / species_key / f"{species_key}_{variant_key}.png"
            for variant_key in VARIANT_ORDER
        ]
        count = sum(1 for path in expected if path.as_posix() in generated_set or path.is_file())
        missing = [path.stem.rsplit("_", 1)[-1] for path in expected if not path.is_file()]
        rows.append(f"| {species_key} | {count} / 12 | {', '.join(missing) if missing else '-'} |")

    content = "\n".join(
        [
            "# WORLDAWN Individual Image Status",
            "",
            "## Summary",
            f"- Generated individual images: `{len(generated_paths)} / {total}`",
            "- Source images: only direct PNG files under `assets/monsters/{speciesKey}.png`",
            "- Excluded sources: `assets/monsters/old`, `assets/monsters/individuals`, `docs/sample_variants`, and `rare_*` images",
            "- Visual style references inspected only: `assets/monsters/old/bear` and `assets/monsters/old/beetle`",
            "- Output path: `assets/monsters/individuals/{speciesKey}/{speciesKey}_{variantKey}.png`",
            "- Format: `1024x1024` RGBA PNG with transparent background",
            "",
            "## Variant Keys",
            "",
            "```text",
            *VARIANT_ORDER,
            "```",
            "",
            "## Species Progress",
            "",
            "| speciesKey | generated | missing |",
            "|---|---:|---|",
            *rows,
            "",
            "## Failed Outputs",
            "",
            *(["- None"] if not failed else [f"- {item}" for item in failed]),
            "",
        ]
    )
    (DOCS_DIR / "INDIVIDUAL_IMAGE_STATUS.md").write_text(content, encoding="utf-8")


def write_design_report() -> None:
    DOCS_DIR.mkdir(exist_ok=True)
    variant_rows = [
        f"| {key} | {spec.label} | {spec.marking} | {spec.accessory} | {spec.motif} |"
        for key, spec in VARIANTS.items()
    ]
    species_rows = [
        f"| {key} | {profile.feature} | {profile.pattern} | {profile.accessory} | {profile.motif} |"
        for key, profile in SPECIES.items()
    ]
    content = "\n".join(
        [
            "# WORLDAWN Individual Variant Design Report",
            "",
            "This report documents how the 12 individual variants are generated from each base species image.",
            "",
            "## Source Rules",
            "",
            "- The generator reads only `assets/monsters/{speciesKey}.png` for the 35 normal species.",
            "- It does not read `assets/monsters/old`, `assets/monsters/individuals`, `docs/sample_variants`, or any previously generated variant image.",
            "- The 8 `rare_*` root images are kept as special assets and are not part of the 35 species x 12 individual set.",
            "- Existing base images are never overwritten.",
            "- `assets/monsters/old/bear` and `assets/monsters/old/beetle` were inspected only as style references for stronger individuality.",
            "",
            "## Variant Difference Plan",
            "",
            "| variantKey | concept | body marking | accessory change | motif |",
            "|---|---|---|---|---|",
            *variant_rows,
            "",
            "## Species Interpretation",
            "",
            "| speciesKey | interpreted base feature | body pattern | species accessory | species motif |",
            "|---|---|---|---|---|",
            *species_rows,
            "",
            "## Quality Checks",
            "",
            "- Every output is validated as `1024x1024` RGBA PNG.",
            "- Canvas corners and a small border are forced transparent.",
            "- Outputs are rejected if the subject is missing or touches the canvas edge.",
            "- Each variant combines pose/scale change, body marking, large costume or armor parts, species accessory, motif charm, and attached particles.",
            "- Large parts intentionally change the readable silhouette: capes, shoulder armor, chest emblems, crests, shell jewels, horns, fins, leaves, or crystal props.",
            "",
        ]
    )
    (DOCS_DIR / "INDIVIDUAL_VARIANT_DESIGN_REPORT.md").write_text(content, encoding="utf-8")


def main() -> None:
    ensure_base_images(SPECIES_KEYS)
    generated_paths: list[Path] = []
    failed: list[str] = []

    for species_key in SPECIES_KEYS:
        source_path = MONSTER_DIR / f"{species_key}.png"
        base_image = Image.open(source_path).convert("RGBA")
        prepared_subject = prepare_subject(base_image, SPECIES[species_key])
        out_dir = OUTPUT_DIR / species_key
        out_dir.mkdir(parents=True, exist_ok=True)

        for variant_key in VARIANT_ORDER:
            output_path = out_dir / f"{species_key}_{variant_key}.png"
            try:
                output = create_variant(species_key, variant_key, prepared_subject)
                validate_output(output, output_path)
                output.save(output_path, format="PNG", compress_level=5)
                generated_paths.append(output_path)
            except Exception as exc:  # noqa: BLE001 - report all asset generation failures together.
                failed.append(f"{species_key}_{variant_key}: {exc}")

        print(f"Generated {species_key}: {len([p for p in generated_paths if p.parent.name == species_key])}/12")

    write_status_doc(generated_paths, failed)
    write_design_report()

    expected_total = len(SPECIES_KEYS) * len(VARIANT_ORDER)
    print(f"Generated individual images: {len(generated_paths)}/{expected_total}")
    print(f"Output: {OUTPUT_DIR}")
    print("Reference source: assets/monsters/{speciesKey}.png only")
    if failed:
        print("Failed outputs:")
        for item in failed:
            print(f"- {item}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
