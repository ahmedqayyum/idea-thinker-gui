"""Reads idea examples, domains, and schema from the project root and caches them."""

from __future__ import annotations
from pathlib import Path
from typing import Any
import os
import yaml


class DefaultsService:
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self._examples: list[dict[str, str]] | None = None
        self._domains: list[str] | None = None
        self._schema: dict[str, Any] | None = None

    def get_examples(self) -> list[dict[str, str]]:
        if self._examples is None:
            self._examples = []
            examples_dir = self.project_root / "ideas" / "examples"
            if examples_dir.exists():
                for f in sorted(examples_dir.glob("*.yaml")):
                    try:
                        with open(f, "r") as fh:
                            data = yaml.safe_load(fh)
                        idea = data.get("idea", {})
                        self._examples.append({
                            "filename": f.name,
                            "title": idea.get("title", f.stem),
                            "domain": idea.get("domain", "general"),
                            "hypothesis": idea.get("hypothesis", ""),
                        })
                    except Exception:
                        continue
        return self._examples

    def get_domains(self) -> list[str]:
        if self._domains is None:
            config_path = self.project_root / "config" / "domains.yaml"
            if config_path.exists():
                with open(config_path, "r") as f:
                    data = yaml.safe_load(f)
                self._domains = list(data.get("domains", {}).keys())
            else:
                self._domains = ["artificial_intelligence", "machine_learning", "data_science"]
        return self._domains

    def get_schema(self) -> dict[str, Any]:
        if self._schema is None:
            schema_path = self.project_root / "ideas" / "schema.yaml"
            if schema_path.exists():
                with open(schema_path, "r") as f:
                    self._schema = yaml.safe_load(f)
            else:
                self._schema = {}
        return self._schema

    def get_available_providers(self) -> list[str]:
        providers = []
        if os.getenv("ANTHROPIC_API_KEY"):
            providers.append("anthropic")
        if os.getenv("OPENAI_API_KEY"):
            providers.append("openai")
        if os.getenv("GOOGLE_API_KEY"):
            providers.append("google")
        return providers or ["none"]
