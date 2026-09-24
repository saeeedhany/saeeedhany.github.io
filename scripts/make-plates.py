#!/usr/bin/env python3
"""Build the dithered manuscript plates.

Public-domain Islamic scientific manuscript illustrations, reduced to the two
site colors by dithering. This is the reference's image treatment applied to
different source material: where it dithers Renaissance sculpture and European
engravings, this dithers the scientific manuscripts of the tradition the site's
thesis comes from.

Three treatments, matching the three visible in the reference:
  ordered   - o8x8 ordered dither, the default; crisp crosshatch
  halftone  - h8x8a, coarse dots; for large/hero plates
  scanline  - horizontal line dither; for portrait/figure plates

Output is committed, not generated per request. Re-run only when the manifest
changes.

  python3 scripts/make-plates.py            # only missing plates
  python3 scripts/make-plates.py --force    # rebuild everything
"""
import json
import pathlib
import subprocess
import sys
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "plates"
CACHE = ROOT / ".cache" / "plate-sources"
CREDITS = ROOT / "src" / "data" / "plates.json"

# Plates are stored as 1-bit MASKS: black where the ink goes, white where the
# paper goes. The site colours them live per theme (see .duo in base.css), so
# baking a colour in here would make them ignore the theme switch.
INK = "black"
PAPER = "white"

UA = "saeed-site-plate-builder/1.0 (personal website build script)"

# slug, Commons filename, treatment, credit line
PLATES = [
    (
        "optics",
        "Kitab al-Manazir, Abu Ali Al-Hasan, 1572 (24357882068).jpg",
        "ordered",
        "Ibn al-Haytham, Kitāb al-Manāẓir (Book of Optics), 1572 copy — Wikimedia Commons, public domain",
    ),
    (
        "elephant-clock",
        '"The Elephant Clock", Folio from a Book of the Knowledge of Ingenious Mechanical Devices by al-Jazari MET 57.51.23.jpg',
        "ordered",
        "al-Jazari, The Book of Knowledge of Ingenious Mechanical Devices — Metropolitan Museum of Art, public domain",
    ),
    (
        "fixed-stars",
        "Al Sufi - Book of Fixed Stars - Ursa Major (The Great Bear) - Bodleian Library - Marsh 144.jpg",
        "halftone",
        "al-Ṣūfī, Kitāb suwar al-kawākib al-thābita (Book of Fixed Stars) — Bodleian Library, Marsh 144, public domain",
    ),
    (
        "astrolabe",
        "Iranian Astrolabe 14.jpg",
        "scanline",
        "Persian astrolabe — Wikimedia Commons, public domain",
    ),
    (
        "anatomy",
        "Muscular system, Avicenna, Canon of Medicine Wellcome L0013313.jpg",
        "scanline",
        "Ibn Sīnā, al-Qānūn fī al-Ṭibb (Canon of Medicine) — Wellcome Collection, public domain",
    ),
    (
        "optics-diagram",
        "Autograph by Kamāl al-Dīn al-Fārisī 3.jpg",
        "ordered",
        "Kamāl al-Dīn al-Fārisī, commentary on Ibn al-Haytham's Optics — Wikimedia Commons, public domain",
    ),
    (
        "observatory",
        "Taqi al din.jpg",
        "ordered",
        "Astronomers at the observatory of Taqī al-Dīn, Istanbul, c. 1577 — Wikimedia Commons, public domain",
    ),
    (
        "pharmacy",
        "Pharmacy, canon of avicenna manuscript.jpg",
        "ordered",
        "Ibn Sīnā, al-Qānūn fī al-Ṭibb — pharmacy scene — Wikimedia Commons, public domain",
    ),
]

SIZE = 1024


def fetch(filename, dest):
    """Download the original via Commons Special:FilePath."""
    if dest.exists() and dest.stat().st_size > 60_000:
        return True
    url = (
        "https://commons.wikimedia.org/wiki/Special:FilePath/"
        + urllib.parse.quote(filename.replace(" ", "_"))
        + f"?width={SIZE * 2}"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        data = urllib.request.urlopen(req, timeout=120).read()
    except Exception as exc:
        print(f"    ! download failed: {exc}")
        return False
    if len(data) < 60_000:
        print(f"    ! suspiciously small ({len(data)} bytes), skipping")
        return False
    dest.write_bytes(data)
    return True


def dither(src, dest, treatment):
    """Reduce to the two site colors.

    Two things here are easy to get wrong:

    1. The mapping is INVERTED. Manuscript scans are mostly light page, so a
       direct black->ink map yields a washed-out plate. The reference's look is
       a light figure on a saturated field, so dark manuscript ink maps to
       PAPER and the light page maps to INK.
    2. `+level-colors` is used rather than `-fill/-opaque`. Ordered dithering
       leaves three tones, not two, and an -opaque swap on a Gray-colorspace
       image silently collapses the hue to its luminance. +level-colors maps
       the black and white points in one step and returns real color.
    """
    pre = [
        "magick", str(src) + "[0]",
        "-auto-orient",
        "-colorspace", "Gray",
        "-normalize",
        "-sigmoidal-contrast", "5x48%",
        "-resize", f"{SIZE}x{SIZE}^",
        "-gravity", "center",
        "-extent", f"{SIZE}x{SIZE}",
    ]

    if treatment == "halftone":
        mid = ["-ordered-dither", "h8x8a"]
    elif treatment == "scanline":
        # squeeze vertically, dither, stretch back -> horizontal line texture
        mid = [
            "-resize", f"{SIZE}x{SIZE // 4}!",
            "-ordered-dither", "o4x4",
            "-resize", f"{SIZE}x{SIZE}!",
        ]
    else:
        mid = ["-ordered-dither", "o8x8"]

    # 1-bit PNG, not WebP. A dithered bitmap is pure high-frequency detail:
    # lossy WebP smears it at ~10x the size; a bilevel PNG stores it exactly.
    post = [
        "+level-colors", f"{PAPER},{INK}",
        "-colorspace", "gray",
        "-threshold", "50%",
        "-type", "bilevel",
        f"PNG:{dest}",
    ]

    subprocess.run(pre + mid + post, check=True, capture_output=True)


def main():
    force = "--force" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    CREDITS.parent.mkdir(parents=True, exist_ok=True)

    credits = {}
    built = skipped = 0

    for slug, filename, treatment, credit in PLATES:
        dest = OUT / f"{slug}.png"
        credits[slug] = credit

        if dest.exists() and not force:
            print(f"  = {slug}")
            skipped += 1
            continue

        print(f"  + {slug} ({treatment})")
        src = CACHE / f"{slug}{pathlib.Path(filename).suffix}"
        if not fetch(filename, src):
            credits.pop(slug)
            continue
        try:
            dither(src, dest, treatment)
            built += 1
        except subprocess.CalledProcessError as exc:
            print(f"    ! magick failed: {exc.stderr.decode()[:200]}")
            credits.pop(slug, None)

    CREDITS.write_text(json.dumps(credits, indent=2, ensure_ascii=False) + "\n")

    print(f"\nbuilt {built}, kept {skipped}")
    for p in sorted(OUT.glob("*.png")):
        print(f"  {p.name:22} {p.stat().st_size / 1024:6.1f} KB")
    print(f"\ncredits -> {CREDITS.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
