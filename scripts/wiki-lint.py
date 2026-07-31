#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path


ITALIAN_MARKERS = re.compile(r"\b(abbreviazioni|verbi|nomi\s+fantasy|compilazione)\b", re.IGNORECASE)


@dataclass
class Issue:
    code: str
    file: str
    message: str


def slugify_heading(text: str) -> str:
    value = text.lower()
    value = "".join(c for c in unicodedata.normalize("NFKD", value) if not unicodedata.combining(c))
    value = re.sub(r"[`*_~\[\]()]", "", value)
    value = re.sub(r"[^a-z0-9\s\-]", "", value)
    value = re.sub(r"\s+", "-", value).strip("-")
    return re.sub(r"-+", "-", value)


def parse_frontmatter(text: str) -> tuple[dict[str, str], str] | None:
    if not text.startswith("---\n"):
        return None
    parts = text.split("\n---\n", 1)
    if len(parts) != 2:
        return None
    frontmatter_raw, body = parts
    frontmatter_raw = frontmatter_raw[4:]
    frontmatter: dict[str, str] = {}
    for line in frontmatter_raw.splitlines():
        if ":" in line and not line.strip().startswith("- "):
            k, v = line.split(":", 1)
            frontmatter[k.strip()] = v.strip()
    return frontmatter, body


def required_fields_for_type(page_type: str) -> list[str]:
    requirements = {
        "source-summary": ["type", "tags", "date_updated"],
        "entity": ["type", "tags", "date_updated", "source_count"],
        "concept": ["type", "tags", "date_updated", "source_count", "confidence"],
        "synthesis": ["type", "tags", "date_updated"],
        "index": ["type", "tags", "date_updated"],
        "log": ["type", "tags"],
    }
    return requirements.get(page_type, ["type", "tags"])


def count_sources_entries(text: str) -> int:
    headings = list(re.finditer(r"^##\s+Sources\s*$", text, re.MULTILINE))
    if not headings:
        return -1
    start = headings[-1].end()
    rest = text[start:]
    next_h2 = re.search(r"^##\s+", rest, re.MULTILINE)
    section = rest[: next_h2.start()] if next_h2 else rest
    return sum(1 for ln in section.splitlines() if re.match(r"^\s*-\s+\[\[.+\]\]", ln))


def collect_anchors(text: str) -> set[str]:
    anchors: set[str] = set()
    for m in re.finditer(r"^(#{1,6})\s+(.+?)\s*$", text, re.MULTILINE):
        anchors.add(slugify_heading(m.group(2)))
    return anchors


def resolve_wikilink_target(target: str, source_file: Path, page_index: dict[str, Path]) -> Path | None:
    page = target.split("|", 1)[0].split("#", 1)[0].strip()
    if not page:
        return source_file

    if page in page_index:
        return page_index[page]

    stem = page.split("/")[-1]
    if stem in page_index:
        return page_index[stem]

    relative_candidate = (source_file.parent / f"{page}.md").resolve()
    if relative_candidate.exists():
        return relative_candidate

    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Lint Flow App wiki consistency rules")
    parser.add_argument("--wiki-root", default="Wiki", help="Path to wiki root (default: Wiki)")
    args = parser.parse_args()

    wiki_root = Path(args.wiki_root).resolve()
    if not wiki_root.exists():
        print(f"[wiki-lint] ERROR: wiki root not found: {wiki_root}")
        return 2

    markdown_files = sorted(wiki_root.rglob("*.md"))
    page_index: dict[str, Path] = {}
    anchors_by_file: dict[Path, set[str]] = {}
    issues: list[Issue] = []

    for file in markdown_files:
        rel = file.relative_to(wiki_root).as_posix()
        page_index[rel.removesuffix(".md")] = file
        page_index[file.stem] = file
        text = file.read_text(encoding="utf-8")
        anchors_by_file[file] = collect_anchors(text)

    for file in markdown_files:
        rel = file.relative_to(wiki_root).as_posix()
        text = file.read_text(encoding="utf-8")

        # Skip schema template artifact.
        if rel == "schema/config.md":
            continue

        fm_parsed = parse_frontmatter(text)
        if fm_parsed is None:
            issues.append(Issue("frontmatter.missing", rel, "Missing or malformed frontmatter"))
            continue

        frontmatter, body = fm_parsed
        page_type = frontmatter.get("type", "").strip()

        for field in required_fields_for_type(page_type):
            if field == "tags":
                if "tags:" not in text.split("---\n", 2)[1]:
                    issues.append(Issue("frontmatter.tags.missing", rel, "Missing `tags` in frontmatter"))
            elif field not in frontmatter:
                issues.append(Issue("frontmatter.field.missing", rel, f"Missing `{field}` for type `{page_type}`"))

        if page_type in {"concept", "entity"}:
            headings = len(re.findall(r"^##\s+Sources\s*$", text, re.MULTILINE))
            if headings != 1:
                issues.append(Issue("sources.heading.count", rel, f"Expected exactly 1 `## Sources` heading, found {headings}"))

            list_count = count_sources_entries(text)
            if list_count < 0:
                issues.append(Issue("sources.section.missing", rel, "Missing `## Sources` section"))
            else:
                try:
                    source_count = int(frontmatter.get("source_count", ""))
                    if source_count != list_count:
                        issues.append(
                            Issue(
                                "sources.count.mismatch",
                                rel,
                                f"source_count={source_count} but listed sources={list_count}",
                            )
                        )
                except ValueError:
                    issues.append(Issue("frontmatter.source_count.invalid", rel, "`source_count` is not an integer"))

        scrubbed_for_links = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
        scrubbed_for_links = re.sub(r"`[^`]*`", "", scrubbed_for_links)

        if rel != "concepts/Centralized Copy Modules.md":
            scrubbed = re.sub(r"```.*?```", "", body, flags=re.DOTALL)
            scrubbed = re.sub(r"`[^`]*`", "", scrubbed)
            if ITALIAN_MARKERS.search(scrubbed):
                issues.append(Issue("language.italian.detected", rel, "Potential Italian prose detected"))

        for raw_target in re.findall(r"\[\[([^\]]+)\]\]", scrubbed_for_links):
            resolved = resolve_wikilink_target(raw_target, file.resolve(), page_index)
            if resolved is None:
                issues.append(Issue("wikilink.broken", rel, f"Broken wikilink target `[[{raw_target}]]`"))
                continue

            if "#" in raw_target:
                anchor = raw_target.split("#", 1)[1].split("|", 1)[0]
                anchor_slug = slugify_heading(anchor)
                if anchor_slug and anchor_slug not in anchors_by_file.get(resolved, set()):
                    target_rel = resolved.relative_to(wiki_root).as_posix()
                    issues.append(
                        Issue(
                            "wikilink.anchor.broken",
                            rel,
                            f"Anchor `{anchor}` not found in `{target_rel}`",
                        )
                    )

    if issues:
        print(f"[wiki-lint] FAILED with {len(issues)} issue(s):")
        for issue in issues:
            print(f"- [{issue.code}] {issue.file}: {issue.message}")
        return 1

    print(f"[wiki-lint] OK - {len(markdown_files)} markdown files validated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
