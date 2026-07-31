#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path


REQUIRED_KEYS = {
    "wiki_refs",
    "bounded_context",
    "aggregate",
    "invariants_changed",
    "domain_events_changed",
    "api_contract_changed",
    "migration_required",
}

YES_NO_KEYS = {
    "invariants_changed",
    "domain_events_changed",
    "api_contract_changed",
    "migration_required",
}


def extract_traceability_block(text: str) -> str | None:
    m = re.search(r"^##\s+Architecture Traceability\s*$", text, re.MULTILINE)
    if not m:
        return None
    tail = text[m.end() :]
    stop = re.search(r"^##\s+", tail, re.MULTILINE)
    return tail[: stop.start()] if stop else tail


def parse_key_values(block: str) -> dict[str, str]:
    data: dict[str, str] = {}
    for line in block.splitlines():
        m = re.match(r"^\s*-\s*([a-zA-Z_]+)\s*:\s*(.*)\s*$", line)
        if m:
            key = m.group(1).strip()
            value = m.group(2).strip()
            data[key] = value
    return data


def collect_wiki_refs(block: str) -> list[str]:
    refs: list[str] = []
    in_wiki_refs = False
    for line in block.splitlines():
        if re.match(r"^\s*-\s*wiki_refs\s*:\s*$", line):
            in_wiki_refs = True
            continue
        if in_wiki_refs:
            if re.match(r"^\s*-\s*[a-zA-Z_]+\s*:", line):
                break
            m = re.match(r"^\s*-\s*\[\[(.+)\]\]\s*$", line)
            if m:
                refs.append(m.group(1).strip())
    return refs


def read_input_text(args: argparse.Namespace) -> str | None:
    if args.file:
        path = Path(args.file)
        if not path.exists():
            print(f"[traceability-check] ERROR: file not found: {path}")
            return None
        return path.read_text(encoding="utf-8")

    env_body = os.getenv("PR_BODY")
    if env_body:
        return env_body

    github_event = os.getenv("GITHUB_EVENT_PATH")
    if github_event and Path(github_event).exists():
        raw = Path(github_event).read_text(encoding="utf-8")
        m = re.search(r'"body"\s*:\s*"((?:\\.|[^"\\])*)"', raw)
        if m:
            body_escaped = m.group(1)
            return bytes(body_escaped, "utf-8").decode("unicode_escape")

    return None


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate PR Architecture Traceability block against Project Constitution"
    )
    parser.add_argument("--file", help="Path to markdown file containing PR body", default=None)
    args = parser.parse_args()

    text = read_input_text(args)
    if not text:
        print(
            "[traceability-check] ERROR: no input provided. Use --file, PR_BODY env, or GITHUB_EVENT_PATH in CI."
        )
        return 2

    block = extract_traceability_block(text)
    if block is None:
        print("[traceability-check] FAILED: missing `## Architecture Traceability` section")
        return 1

    data = parse_key_values(block)
    missing = sorted(REQUIRED_KEYS - set(data.keys()))
    if missing:
        print("[traceability-check] FAILED: missing required keys:")
        for key in missing:
            print(f"- {key}")
        return 1

    wiki_refs = collect_wiki_refs(block)
    if not wiki_refs:
        print("[traceability-check] FAILED: `wiki_refs` must include at least one [[WikiReference]] entry")
        return 1

    for key in YES_NO_KEYS:
        if data.get(key) not in {"yes", "no"}:
            print(f"[traceability-check] FAILED: `{key}` must be `yes` or `no` (found `{data.get(key)}`)")
            return 1

    if not data.get("bounded_context"):
        print("[traceability-check] FAILED: `bounded_context` cannot be empty")
        return 1
    if not data.get("aggregate"):
        print("[traceability-check] FAILED: `aggregate` cannot be empty")
        return 1

    print("[traceability-check] OK - Architecture Traceability section is valid")
    return 0


if __name__ == "__main__":
    sys.exit(main())
