#!/usr/bin/env python3
"""Add a photo to the gallery.

    python3 scripts/add-photo.py ~/Pictures/harbour.jpg --alt "Boats at dusk"

Writes three files:
    src/assets/gallery/<slug>.jpg        the photo for the web: upright, at most
                                         2400 px, EVERY metadata tag stripped
                                         (phones embed GPS — it would publish
                                         where you took it)
    src/assets/gallery/<slug>-mask.png   the dither the site colours in the theme ink
    src/content/gallery/<slug>.md        title, place, story… all optional but alt

Then open the .md and write the story under the --- line (or leave it empty).
Never overwrites an existing .md. Requires ImageMagick 7 (`magick`).
"""
import argparse, datetime, json, pathlib, re, subprocess, sys

sys.dont_write_bytecode = True  # no __pycache__ next to the scripts
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from dither import INK, PAPER, run as dither  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent
WEB_EDGE = 2400
MASK_WIDTH = 800


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "photo"


def magick(*args: str) -> str:
    p = subprocess.run(["magick", *args], capture_output=True, text=True)
    if p.returncode != 0:
        sys.exit(f"magick failed: {p.stderr[:400]}")
    return p.stdout


def exif_date(src: pathlib.Path) -> str | None:
    raw = magick("identify", "-format", "%[EXIF:DateTimeOriginal]", f"{src}[0]").strip()
    m = re.match(r"(\d{4}):(\d{2}):(\d{2})", raw)
    return f"{m[1]}-{m[2]}-{m[3]}" if m else None


def q(s: str) -> str:
    """A YAML double-quoted string (JSON strings are valid YAML)."""
    return json.dumps(s, ensure_ascii=False)


def main() -> None:
    ap = argparse.ArgumentParser(description="Add a photo to the gallery.")
    ap.add_argument("src", type=pathlib.Path)
    ap.add_argument("--slug", help="name in URLs (default: from the file name)")
    ap.add_argument("--date", help="YYYY-MM-DD (default: when it was taken, else today)")
    ap.add_argument("--title")
    ap.add_argument("--lang", choices=("en", "ar"), default="en", help="language of title and story")
    ap.add_argument("--alt", help="what a screen reader says; required before the site builds")
    ap.add_argument("--root", type=pathlib.Path, default=REPO, help=argparse.SUPPRESS)
    a = ap.parse_args()

    if not a.src.is_file():
        sys.exit(f"no such file: {a.src}")
    slug = a.slug or slugify(a.src.stem)
    assets = a.root / "src/assets/gallery"
    notes = a.root / "src/content/gallery"
    note = notes / f"{slug}.md"
    if note.exists():
        sys.exit(f"{note} already exists — pick another --slug or edit that file")
    assets.mkdir(parents=True, exist_ok=True)
    notes.mkdir(parents=True, exist_ok=True)

    date = a.date or exif_date(a.src) or datetime.date.today().isoformat()

    web = assets / f"{slug}.jpg"
    magick(f"{a.src}[0]", "-auto-orient", "-resize", f"{WEB_EDGE}x{WEB_EDGE}>", "-strip",
           "-quality", "82", f"JPEG:{web}")
    left = magick("identify", "-format", "%[EXIF:*]", str(web)).strip()
    if left:
        web.unlink()
        sys.exit(f"metadata survived stripping, refusing to continue:\n{left[:300]}")

    # the mask is made from the clean, upright copy, 800 px wide whatever the shape
    w, h = (int(n) for n in magick("identify", "-format", "%w %h", str(web)).split())
    longest = max(MASK_WIDTH, round(MASK_WIDTH * h / w))
    # positive: dark areas take the ink, so fading to colour reveals the photo
    # rather than inverting it (the manuscript plates use the negative on purpose)
    dither(web, assets / f"{slug}-mask.png", treatment="ordered", width=longest, square=False,
           contrast=4.0, ink=INK, paper=PAPER, positive=True)

    lines = [
        "---",
        f"image: ../../assets/gallery/{slug}.jpg",
        f"mask: ../../assets/gallery/{slug}-mask.png",
        f"alt: {q(a.alt or 'TODO')}  # what a screen reader says — describe the photo",
        f"date: {date}",
        f"title: {q(a.title)}" if a.title else '# title: ""       # optional',
        '# place: ""       # optional',
        f"lang: {a.lang}          # en or ar: the language of the title and story",
        "# draft: true     # uncomment to hide it",
        "---",
        "",
    ]
    note.write_text("\n".join(lines))
    print(f"added {slug}:\n  {web}\n  {assets / f'{slug}-mask.png'}\n  {note}  <- write the story here (optional)")
    if not a.alt:
        print("  note: replace alt \"TODO\" before building — the site refuses it")


if __name__ == "__main__":
    main()
