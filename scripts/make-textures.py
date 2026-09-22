#!/usr/bin/env python3
"""Generate the two noise tiles the design needs.

grain.png  - coarse monochrome noise, tiled over the whole viewport at ~3.5%.
             Replaces the reference's WebGL2 canvas, which ran at 2% opacity;
             indistinguishable at that strength and costs no GL context.
noise.png  - finer noise, tiled per-plate and composited with color-burn.
"""
import pathlib
import random

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "img"


def noise_tile(size, lo, hi, seed):
    """Seamless-enough uniform noise. Tiles are large relative to their
    visibility, so edge continuity is not perceptible at these opacities."""
    rnd = random.Random(seed)
    img = Image.new("L", (size, size))
    img.putdata([rnd.randint(lo, hi) for _ in range(size * size)])
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    # coarse global grain: full-range so it reads as film grain at low opacity
    noise_tile(180, 0, 255, 0xC0FFEE).save(OUT / "grain.png", optimize=True)

    # per-plate noise: narrower range so color-burn darkens without crushing
    noise_tile(256, 90, 255, 0xBADA55).save(OUT / "noise.png", optimize=True)

    for f in ("grain.png", "noise.png"):
        p = OUT / f
        print(f"{f:12} {p.stat().st_size / 1024:6.1f} KB")


if __name__ == "__main__":
    main()
