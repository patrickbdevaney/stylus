#!/usr/bin/env python3
"""Write repo_list.md: full tree, per-file provenance, and file contents."""

from __future__ import annotations

import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "repo_list.md"

LANG_BY_SUFFIX = {
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".js": "javascript",
    ".mjs": "javascript",
    ".json": "json",
    ".md": "markdown",
    ".css": "css",
    ".html": "html",
    ".sh": "bash",
    ".yml": "yaml",
    ".yaml": "yaml",
}


def run_git(root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=root,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return ""
    return result.stdout.strip()


def git_visible_files(root: Path) -> list[str]:
    result = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
        cwd=root,
        capture_output=True,
        text=True,
        check=True,
    )
    paths = sorted(line.strip() for line in result.stdout.splitlines() if line.strip())
    return [p for p in paths if p != OUTPUT.name]


def git_provenance(root: Path, relpath: str) -> dict[str, str]:
    meta: dict[str, str] = {}

    staged = run_git(root, "ls-files", "--stage", "--", relpath)
    if staged:
        parts = staged.split(maxsplit=3)
        if len(parts) >= 2:
            meta["git_mode"] = parts[0]
            meta["git_blob"] = parts[1]
        meta["git_index"] = "tracked"
    else:
        meta["git_index"] = "untracked"

    status_line = run_git(root, "status", "--porcelain", "--", relpath)
    if status_line:
        code = status_line[:2]
        status_map = {
            "??": "untracked",
            " M": "modified ( unstaged )",
            "M ": "modified ( staged )",
            "MM": "modified ( staged + unstaged )",
            "A ": "added ( staged )",
            " D": "deleted ( unstaged )",
            "D ": "deleted ( staged )",
        }
        meta["git_worktree"] = status_map.get(code, code.strip() or "clean")
    elif meta.get("git_index") == "tracked":
        meta["git_worktree"] = "clean"

    log_line = run_git(
        root,
        "log",
        "-1",
        "--format=%H|%h|%ai|%an|%s",
        "--",
        relpath,
    )
    if log_line:
        full_hash, short_hash, date, author, subject = log_line.split("|", 4)
        meta["last_commit_full"] = full_hash
        meta["last_commit"] = short_hash
        meta["last_commit_date"] = date
        meta["last_commit_author"] = author
        meta["last_commit_subject"] = subject
    else:
        meta["last_commit"] = "(none — never committed)"

    head_blob = run_git(root, "rev-parse", f"HEAD:{relpath}")
    if head_blob:
        meta["head_blob"] = head_blob

    return meta


def read_file_payload(path: Path) -> tuple[str, str, bool]:
    """Return (fence_lang, body, is_binary)."""
    data = path.read_bytes()
    if b"\0" in data:
        return "text", f"(binary file, {len(data)} bytes — contents omitted)", True

    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        return "text", f"(non-UTF-8 file, {len(data)} bytes — contents omitted)", True

    suffix = path.suffix.lower()
    lang = LANG_BY_SUFFIX.get(suffix, "")
    return lang, text, False


def build_tree(paths: list[str]) -> dict:
    tree: dict = {}
    for path in paths:
        parts = path.split("/")
        node = tree
        for part in parts[:-1]:
            node = node.setdefault(part + "/", {})
        node[parts[-1]] = None
    return tree


def render_tree(node: dict, prefix: str = "") -> list[str]:
    lines: list[str] = []
    dirs = sorted(k for k in node if k.endswith("/"))
    files = sorted(k for k in node if not k.endswith("/"))
    entries = [(d, node[d], True) for d in dirs] + [(f, None, False) for f in files]

    for i, (name, child, is_dir) in enumerate(entries):
        last = i == len(entries) - 1
        branch = "└── " if last else "├── "
        lines.append(f"{prefix}{branch}{name.rstrip('/')}{'/' if is_dir else ''}")
        if is_dir and child:
            extension = "    " if last else "│   "
            lines.extend(render_tree(child, prefix + extension))
    return lines


def render_provenance_table(
    meta: dict[str, str],
    abs_path: Path,
    relpath: str,
    line_count: int,
) -> list[str]:
    size = abs_path.stat().st_size
    lines = [
        "| Provenance | Value |",
        "|---|---|",
        f"| Repository path | `{relpath}` |",
        f"| Absolute path | `{abs_path}` |",
        f"| Size | {size:,} bytes |",
        f"| Lines | {line_count:,} |",
    ]

    keys = [
        ("git_index", "Git index"),
        ("git_worktree", "Git worktree"),
        ("git_blob", "Index blob"),
        ("head_blob", "HEAD blob"),
        ("last_commit", "Last commit"),
        ("last_commit_full", "Last commit (full)"),
        ("last_commit_date", "Last commit date"),
        ("last_commit_author", "Last commit author"),
        ("last_commit_subject", "Last commit subject"),
    ]
    for key, label in keys:
        if key in meta:
            val = meta[key].replace("|", "\\|")
            lines.append(f"| {label} | {val} |")

    return lines


def main() -> None:
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    paths = git_visible_files(ROOT)
    tree = build_tree(paths)

    sections: list[str] = [
        "# Repository listing",
        "",
        "Auto-generated provenance artifact. Non-gitignored files only.",
        "",
        "| Field | Value |",
        "|---|---|",
        f"| Generated at | {generated_at} |",
        f"| Generator | `list_repo.py` |",
        f"| Repository root | `{ROOT}` |",
        f"| File count | {len(paths)} |",
        "",
        "## Directory tree",
        "",
        "```",
        "./",
        *render_tree(tree),
        "```",
        "",
        "## File contents (in tree order)",
        "",
    ]

    for relpath in paths:
        abs_path = ROOT / relpath
        if not abs_path.is_file():
            continue

        meta = git_provenance(ROOT, relpath)
        lang, body, is_binary = read_file_payload(abs_path)
        line_count = 0 if is_binary else body.count("\n") + (1 if body else 0)

        sections.extend(
            [
                f"### `{relpath}`",
                "",
                *render_provenance_table(meta, abs_path, relpath, line_count),
                "",
            ]
        )

        fence = lang or "text"
        sections.extend([f"```{fence}", body.rstrip("\n"), "```", ""])

    OUTPUT.write_text("\n".join(sections), encoding="utf-8")
    print(
        f"Wrote {len(paths)} files ({OUTPUT.stat().st_size:,} bytes) "
        f"to {OUTPUT.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    main()
