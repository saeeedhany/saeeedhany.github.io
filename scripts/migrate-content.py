#!/usr/bin/env python3
"""Copy content out of the old Astro blog into this site's schema.

The old site at ~/gits/websites/saeeed is READ ONLY. Nothing is moved or
modified there; this only reads.

Changes applied:
  - posts: ar/ and en/ collections -> one `writing` collection, `lang` required
    (the old ar posts already carry `lang`; the en ones sometimes don't, so it
    is inferred from the source directory)
  - `cover:` is dropped. It points at photographs that don't exist here and
    would break the two-colour rule; plates replace it.
  - books: copied as-is, minus `cover:`; drafts and stubs are skipped.
"""
import pathlib
import re
import shutil
import sys

OLD = pathlib.Path.home() / "gits/websites/saeeed/src/content"
ROOT = pathlib.Path(__file__).resolve().parent.parent
NEW = ROOT / "src" / "content"

FM = re.compile(r"^---\n(.*?)\n---\n?", re.S)


def split(text):
    m = FM.match(text)
    if not m:
        return None, text
    return m.group(1), text[m.end():]


def drop_keys(fm, keys):
    out = []
    skipping = False
    for line in fm.split("\n"):
        if re.match(r"^\S", line):
            skipping = any(line.startswith(f"{k}:") for k in keys)
        if not skipping:
            out.append(line)
    return "\n".join(out)


def has_key(fm, key):
    return any(re.match(rf"^{key}\s*:", ln) for ln in fm.split("\n"))


def is_draft(fm):
    return bool(re.search(r"^draft\s*:\s*true", fm, re.M))


def main():
    if not OLD.exists():
        sys.exit(f"old content not found at {OLD}")

    copied = skipped = 0

    # ---- posts -------------------------------------------------------------
    for lang in ("ar", "en"):
        src_dir = OLD / lang
        if not src_dir.exists():
            continue
        dest_dir = NEW / "writing" / lang
        dest_dir.mkdir(parents=True, exist_ok=True)

        for src in sorted(src_dir.glob("*.md*")):
            fm, body = split(src.read_text(encoding="utf-8"))
            if fm is None:
                print(f"  ? {src.name}: no frontmatter, skipped")
                skipped += 1
                continue
            if is_draft(fm):
                print(f"  - {src.name}: draft, skipped")
                skipped += 1
                continue

            fm = drop_keys(fm, ["cover"])
            if not has_key(fm, "lang"):
                fm += f"\nlang: {lang}"

            # In-post images are re-encoded as dithered PNGs by
            # scripts/dither.py, so point the markdown at those. Keeps
            # re-running this migration idempotent.
            body = re.sub(r"(/images/[^)\s]+)\.(jpg|jpeg|png|webp)", r"\1.png", body)

            # The source content links two unwritten posts at dead paths
            # (/src/pages/404.html, ./../404.html). Point them at the real 404
            # page so they resolve; replace with real URLs once written.
            body = re.sub(r"\]\((?:\./)*(?:\.\./)*(?:src/pages/)?404\.html\)", "](/404)", body)

            (dest_dir / src.name).write_text(f"---\n{fm.strip()}\n---\n{body}", encoding="utf-8")
            print(f"  + writing/{lang}/{src.name}")
            copied += 1

    # ---- books -------------------------------------------------------------
    for src in sorted((OLD / "books").rglob("*.md*")):
        if src.name.startswith("_"):
            print(f"  - {src.name}: stub, skipped")
            skipped += 1
            continue
        fm, body = split(src.read_text(encoding="utf-8"))
        if fm is None or is_draft(fm):
            print(f"  - {src.name}: draft/no frontmatter, skipped")
            skipped += 1
            continue

        category = src.parent.name
        dest_dir = NEW / "books" / category
        dest_dir.mkdir(parents=True, exist_ok=True)
        fm = drop_keys(fm, ["cover"])
        (dest_dir / src.name).write_text(f"---\n{fm.strip()}\n---\n{body}", encoding="utf-8")
        print(f"  + books/{category}/{src.name}")
        copied += 1

    print(f"\ncopied {copied}, skipped {skipped}")
    print(f"source left untouched: {OLD}")


if __name__ == "__main__":
    main()
