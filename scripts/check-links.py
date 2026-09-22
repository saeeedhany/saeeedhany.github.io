#!/usr/bin/env python3
"""Crawl every internal link in dist/ and fail on any that doesn't resolve.

This exists because an earlier verification pass checked that every built page
returned 200 and that every CSS/font/image asset resolved -- and still missed
that EVERY post and book link 404'd, because the hrefs and getStaticPaths
computed their slugs independently and drifted apart.

Checking that pages exist is not the same as checking that the links to them
are right. This checks the links.

  python3 scripts/check-links.py
"""
import pathlib
import re
import sys
from html.parser import HTMLParser
from urllib.parse import unquote, urldefrag

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

SKIP_SCHEMES = ("http://", "https://", "mailto:", "tel:", "data:", "javascript:", "#")


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.found: list[tuple[str, str]] = []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        for attr in ("href", "src"):
            v = d.get(attr)
            if v:
                self.found.append((tag, v))


def resolves(target: str) -> bool:
    """Mirror how a static host serves dist/: exact file, or dir/index.html."""
    rel = unquote(target.lstrip("/"))
    if rel == "":
        rel = "index.html"
    p = DIST / rel
    if p.is_file():
        return True
    if (DIST / rel / "index.html").is_file():
        return True
    if (DIST / (rel.rstrip("/") + ".html")).is_file():
        return True
    return False


def main() -> int:
    if not DIST.is_dir():
        sys.exit("dist/ not found — run `pnpm build` first")

    pages = sorted(DIST.rglob("*.html"))
    broken: list[tuple[str, str, str]] = []
    checked = 0

    for page in pages:
        parser = Links()
        parser.feed(page.read_text(encoding="utf-8", errors="ignore"))
        src = page.relative_to(DIST).as_posix()
        for tag, raw in parser.found:
            link, _frag = urldefrag(raw.strip())
            if not link or link.startswith(SKIP_SCHEMES):
                continue
            if not link.startswith("/"):
                continue  # this build emits only root-relative internal links
            checked += 1
            if not resolves(link):
                broken.append((src, tag, link))

    print(f"pages scanned : {len(pages)}")
    print(f"links checked : {checked}")

    if broken:
        print(f"\nBROKEN ({len(broken)}):")
        seen = set()
        for src, tag, link in broken:
            key = (tag, link)
            if key in seen:
                continue
            seen.add(key)
            print(f"  <{tag}> {link}")
            print(f"        first seen in /{src}")
        return 1

    print("\nall internal links resolve")
    return 0


if __name__ == "__main__":
    sys.exit(main())
