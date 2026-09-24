#!/usr/bin/env python3
"""Turn any image into the site's two-colour dither.

This is the effect on every image on the site. It reduces a picture to exactly
two tones using an ordered dither, so the midtones survive as a visible
crosshatch or dot pattern instead of being crushed to flat shapes.

OUTPUT IS A BLACK-AND-WHITE MASK, NOT A COLOURED IMAGE. Black marks where the
theme's ink goes, white where the paper goes; the site colours it live (see
.duo in src/styles/base.css), so it follows the theme switch — lapis, saffron
or malachite. Opened on its own it looks black and white. That is correct.
Pass --bake to burn a colour in instead, for use outside the site.

QUICK START

    python3 scripts/dither.py ~/Pictures/me.jpg
        -> public/plates/me.png

    python3 scripts/dither.py photo.jpg --out portrait --treatment scanline
        -> public/plates/portrait.png

    python3 scripts/dither.py photo.jpg --compare
        -> writes photo-ordered.png, photo-halftone.png, photo-scanline.png
           side by side so you can pick, without touching public/

TREATMENTS

    ordered   (default)  fine 8x8 crosshatch. Best for diagrams, manuscripts,
                         text, anything with line detail.
    halftone             coarse dots, like newsprint. Best for large images
                         and for a more printed, graphic feel.
    scanline             horizontal lines, like a CRT or a fax. Best for
                         faces and figures — it flatters portraits.

DIRECTION

    By default the mapping is INVERTED: dark parts of your image become the
    light paper colour and light parts become indigo. That is what produces a
    glowing figure on a saturated field, which is the look of the site.

    Pass --positive for the opposite (dark stays dark) — better for images
    that are mostly dark already, like a night photo or a screenshot with a
    dark background.

TUNING

    --contrast N   default 4. Raise it (6-10) if the result looks muddy or
                   flat; lower it (2-3) if detail is being blown out.
    --width N      default 1400 (longest edge). Plates in the writing grid
                   are 1024.
    --square       centre-crop to a square, for grid plates.
    --aspect W:H   crop to an arbitrary ratio, e.g. 4:5 for a portrait.
    --gravity G    which part to keep when cropping: north, center, south...
                   Use north for a portrait so the crop doesn't cut the head.
    --bake         burn colours in (--hue / --paper) instead of writing a mask.
                   Only for images used OUTSIDE the site: a baked image
                   ignores the theme switch.
    --hue '#hex'   ink colour for --bake (default lapis #7900f2).

Requires ImageMagick 7 (`magick`).
"""
import argparse
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OLD_SITE = pathlib.Path.home() / "gits/websites/saeeed/public"

# In-post images referenced by the migrated markdown. Rebuilt with
# --post-images; a raw photograph in a post would break the two-colour rule.
POST_IMAGES = [
    ("images/desk/laptop.jpg", "images/desk", "laptop"),
    ("images/desk/New.jpg", "images/desk", "New"),
    ("images/desk/Old.jpg", "images/desk", "Old"),
    ("images/desk/old-but-new.jpg", "images/desk", "old-but-new"),
]

INK = "#7900f2"
PAPER = "#f2f2f2"
TREATMENTS = ("ordered", "halftone", "scanline")


def build_args(src, dest, treatment, width, square, contrast, ink, paper,
               positive, aspect=None, gravity="center", bake=False):
    pre = [
        "magick", f"{src}[0]",
        "-auto-orient",
        "-colorspace", "Gray",
        "-normalize",
        "-sigmoidal-contrast", f"{contrast}x50%",
    ]

    if aspect:
        w_r, h_r = (float(x) for x in aspect.split(":"))
        h = round(width * h_r / w_r)
        pre += [
            "-resize", f"{width}x{h}^",
            "-gravity", gravity,
            "-extent", f"{width}x{h}",
        ]
    elif square:
        pre += [
            "-resize", f"{width}x{width}^",
            "-gravity", gravity,
            "-extent", f"{width}x{width}",
        ]
    else:
        # ">" means only shrink, never upscale a small source
        pre += ["-resize", f"{width}x{width}>"]

    if treatment == "halftone":
        mid = ["-ordered-dither", "h8x8a"]
    elif treatment == "scanline":
        # squeeze vertically, dither, stretch back -> horizontal line texture
        mid = ["-resize", "100%x25%!", "-ordered-dither", "o4x4", "-resize", "100%x400%!"]
    else:
        mid = ["-ordered-dither", "o8x8"]

    # +level-colors maps the black point to the first colour and the white
    # point to the second, in one step and in real colour. Do NOT use
    # -fill/-opaque here: ordered dithering leaves three tones rather than two,
    # and an -opaque swap on a Gray-colorspace image silently collapses the hue
    # to its luminance, which produces a grey image.
    if not bake:
        # the site's mask: black = ink, white = paper
        ink, paper = "black", "white"
    lo, hi = (ink, paper) if positive else (paper, ink)
    if bake:
        # PNG8 with a 2-colour palette. A dither is pure high-frequency detail:
        # lossy WebP smears it and is ~10x larger, lossless WebP is ~20x larger.
        post = ["-colorspace", "sRGB", "+level-colors", f"{lo},{hi}",
                "-colors", "2", "-depth", "8", f"PNG8:{dest}"]
    else:
        post = ["+level-colors", f"{lo},{hi}", "-colorspace", "gray",
                "-threshold", "50%", "-type", "bilevel", f"PNG:{dest}"]
    return pre + mid + post


def run(src, dest, **kw):
    dest.parent.mkdir(parents=True, exist_ok=True)
    args = build_args(src, dest, **kw)
    proc = subprocess.run(args, capture_output=True)
    if proc.returncode != 0:
        sys.exit(f"magick failed:\n{proc.stderr.decode()[:400]}")
    return dest


def main():
    if not shutil.which("magick"):
        sys.exit("ImageMagick 7 not found — install it, then re-run (needs `magick`).")

    ap = argparse.ArgumentParser(
        description="Turn an image into the site's indigo two-colour dither.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Run with no options for sensible defaults. See the top of this "
               "file for the full guide.",
    )
    ap.add_argument("src", type=pathlib.Path, nargs="?", help="source image")
    ap.add_argument("--post-images", action="store_true",
                    help="rebuild the in-post images carried over from the old blog")
    ap.add_argument("--out", help="output name (no extension). Default: source name")
    ap.add_argument("--dir", default="plates",
                    help="destination folder under public/ (default: plates)")
    ap.add_argument("--treatment", choices=TREATMENTS, default="ordered")
    ap.add_argument("--compare", action="store_true",
                    help="write all three treatments next to the source, for picking")
    ap.add_argument("--width", type=int, default=1400, help="longest edge (default 1400)")
    ap.add_argument("--square", action="store_true", help="centre-crop to a square")
    ap.add_argument("--aspect", help="crop to a ratio, e.g. 4:5 (overrides --square)")
    ap.add_argument("--gravity", default="center",
                    help="crop anchor: north, center, south, ... (default center)")
    ap.add_argument("--contrast", type=float, default=4.0,
                    help="sigmoidal contrast, default 4. Raise if muddy.")
    ap.add_argument("--bake", action="store_true",
                    help="burn colours in instead of writing a theme mask (for use outside the site)")
    ap.add_argument("--hue", default=INK, help=f"ink colour for --bake (default {INK})")
    ap.add_argument("--paper", default=PAPER, help=f"paper colour (default {PAPER})")
    ap.add_argument("--positive", action="store_true",
                    help="do not invert: dark stays dark")
    a = ap.parse_args()

    if a.post_images:
        for rel_src, out_dir, name in POST_IMAGES:
            src = OLD_SITE / rel_src
            if not src.is_file():
                print(f"  ! missing source: {src}")
                continue
            dest = ROOT / "public" / out_dir / f"{name}.png"
            run(src, dest, treatment="ordered", width=1400, square=False,
                contrast=4.0, ink=INK, paper=PAPER, positive=False,
                aspect=None, gravity="center")
            print(f"  + {dest.relative_to(ROOT)}  {dest.stat().st_size / 1024:.0f} KB")
        return

    if a.src is None:
        ap.error("a source image is required (or pass --post-images)")
    if not a.src.is_file():
        sys.exit(f"no such file: {a.src}")

    common = dict(
        width=a.width, square=a.square, contrast=a.contrast,
        ink=a.hue, paper=a.paper, positive=a.positive,
        aspect=a.aspect, gravity=a.gravity, bake=a.bake,
    )

    if a.compare:
        stem = a.src.with_suffix("")
        for t in TREATMENTS:
            dest = pathlib.Path(f"{stem}-{t}.png")
            run(a.src, dest, treatment=t, **common)
            print(f"  {dest}  {dest.stat().st_size / 1024:.0f} KB")
        print("\nPick one, then re-run without --compare using --treatment <name>.")
        return

    name = a.out or a.src.stem
    dest = ROOT / "public" / a.dir.strip("/") / f"{name}.png"
    run(a.src, dest, treatment=a.treatment, **common)
    print(f"  {dest.relative_to(ROOT)}  {dest.stat().st_size / 1024:.0f} KB")
    print(f"  reference it as /{a.dir.strip('/')}/{name}.png")
    if a.dir.strip("/") == "plates":
        print(f"  or in a component:  <Plate name=\"{name}\" lang={{lang}} />")


if __name__ == "__main__":
    main()
