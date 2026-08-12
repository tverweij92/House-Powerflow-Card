"""Build the lightweight README animation from all supplied house scenes."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "images"
OUTPUT = ROOT / "docs" / "house-scenes.gif"
SIZE = (640, 427)
FRAME_DURATION_MS = 750

SCENES = [
    "zon",
    "bewolkt",
    "regen",
    "sneeuw",
    "-5",
    "25plus",
    "nieuwjaar",
    "pasen",
    "koningsdag",
    "dodenherdenking",
    "bevrijdingsdag",
    "moederdag",
    "hemelvaart",
    "pinksteren",
    "vaderdag",
    "sinterklaas",
    "kerst",
]


def build_frame(path: Path) -> Image.Image:
    with Image.open(path) as source:
        resized = source.convert("RGB").resize(SIZE, Image.Resampling.LANCZOS)
    return resized.quantize(colors=96, method=Image.Quantize.MEDIANCUT)


def main() -> None:
    expected = [SOURCE / f"{scene} {time}.png" for scene in SCENES for time in ("overdag", "avond")]
    missing = [path.name for path in expected if not path.is_file()]
    if missing:
        raise FileNotFoundError(f"Missing scene images: {', '.join(missing)}")

    frames = [build_frame(path) for path in expected]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        OUTPUT,
        save_all=True,
        append_images=frames[1:],
        duration=FRAME_DURATION_MS,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(f"Created {OUTPUT.relative_to(ROOT)} with {len(frames)} frames")


if __name__ == "__main__":
    main()
