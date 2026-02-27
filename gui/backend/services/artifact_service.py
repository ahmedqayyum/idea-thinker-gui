"""Read workspace files and list outputs per stage."""

from __future__ import annotations
from pathlib import Path
from typing import Optional


def list_artifacts(workspace: Path, subpath: str = "") -> list[dict]:
    target = workspace / subpath if subpath else workspace
    if not target.exists():
        return []
    items = []
    for p in sorted(target.iterdir()):
        if p.name.startswith(".") and p.name not in (".idea-explorer",):
            continue
        items.append({
            "path": str(p.relative_to(workspace)),
            "name": p.name,
            "is_dir": p.is_dir(),
            "size": p.stat().st_size if p.is_file() else None,
        })
    return items


def resolve_artifact_path(workspace: Path, file_path: str) -> Optional[Path]:
    """Resolve and validate an artifact path, returning the Path if safe and extant."""
    target = (workspace / file_path).resolve()
    if not str(target).startswith(str(workspace.resolve())):
        return None
    if not target.is_file():
        return None
    return target


def read_artifact(workspace: Path, file_path: str, max_bytes: int = 512_000) -> Optional[str]:
    target = resolve_artifact_path(workspace, file_path)
    if target is None:
        return None
    try:
        return target.read_text(encoding="utf-8", errors="replace")[:max_bytes]
    except Exception:
        return None
