"""Build compact, labelled GIF previews for the README.

The script only reads the canonical PNG files under ``images`` and writes the
three generated animations under ``docs/showcases``.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "showcases"
SIZE = (600, 400)
LABEL_HEIGHT = 48
COLORS = 96


SHOWCASES = (
    {
        "folder": ROOT / "images" / "weather",
        "output": OUTPUT / "weather-scenes.gif",
        "prefix": "Weather",
        "duration": 850,
    },
    {
        "folder": ROOT / "images" / "holidays" / "us",
        "output": OUTPUT / "us-holidays.gif",
        "prefix": "US holidays",
        "duration": 1400,
    },
    {
        "folder": ROOT / "images" / "holidays" / "nl",
        "output": OUTPUT / "nl-holidays.gif",
        "prefix": "Dutch holidays",
        "duration": 1200,
    },
)


DISPLAY_NAMES = {
    "legacy-new-years": "Legacy New Year",
    "kings": "King's Day",
    "remembrance": "Remembrance Day",
    "liberation": "Liberation Day",
    "sinterklaas": "Sinterklaas",
    "independence": "Independence Day",
    "memorial": "Memorial Day",
    "thanksgiving": "Thanksgiving",
    "partly-cloudy": "Partly Cloudy",
    "snowy-rainy": "Snow and Rain",
}


def load_font(size: int):
    candidates = (
        Path("C:/Windows/Fonts/segoeuib.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
    )
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


FONT = load_font(23)


def cover(image: Image.Image) -> Image.Image:
    source = image.convert("RGB")
    scale = max(SIZE[0] / source.width, SIZE[1] / source.height)
    resized = source.resize(
        (round(source.width * scale), round(source.height * scale)),
        Image.Resampling.LANCZOS,
    )
    left = (resized.width - SIZE[0]) // 2
    top = (resized.height - SIZE[1]) // 2
    return resized.crop((left, top, left + SIZE[0], top + SIZE[1]))


def frame_label(path: Path, prefix: str) -> str:
    stem = path.stem
    time_of_day = "Day" if stem.endswith("-day") else "Night"
    scene = stem.removesuffix("-day").removesuffix("-night")
    display = DISPLAY_NAMES.get(scene, scene.replace("-", " ").title())
    return f"{prefix}  ·  {display}  ·  {time_of_day}"


def make_frame(path: Path, prefix: str) -> Image.Image:
    with Image.open(path) as source:
        frame = cover(source)
    draw = ImageDraw.Draw(frame, "RGBA")
    top = SIZE[1] - LABEL_HEIGHT
    draw.rectangle((0, top, SIZE[0], SIZE[1]), fill=(4, 18, 31, 218))
    label = frame_label(path, prefix)
    box = draw.textbbox((0, 0), label, font=FONT)
    text_height = box[3] - box[1]
    draw.text(
        (22, top + (LABEL_HEIGHT - text_height) // 2 - box[1]),
        label,
        font=FONT,
        fill=(255, 255, 255, 255),
    )
    return frame


def build_showcase(config: dict) -> None:
    paths = sorted(config["folder"].glob("*.png"))
    if not paths:
        raise RuntimeError(f'No PNG images found in {config["folder"]}')

    rgb_frames = [make_frame(path, config["prefix"]) for path in paths]
    palette_source = Image.new("RGB", (SIZE[0], SIZE[1] * len(rgb_frames)))
    for index, frame in enumerate(rgb_frames):
        palette_source.paste(frame, (0, index * SIZE[1]))
    palette = palette_source.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT)
    frames = [
        frame.quantize(palette=palette, dither=Image.Dither.FLOYDSTEINBERG)
        for frame in rgb_frames
    ]

    config["output"].parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        config["output"],
        save_all=True,
        append_images=frames[1:],
        duration=config["duration"],
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(f'{config["output"].relative_to(ROOT)}: {len(frames)} frames')


if __name__ == "__main__":
    for showcase in SHOWCASES:
        build_showcase(showcase)
