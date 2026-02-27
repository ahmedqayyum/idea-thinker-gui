"""Wraps the existing idea-explorer IdeaManager, Runner, and Orchestrator."""

from __future__ import annotations
from pathlib import Path
from typing import Any, Optional
import json
import threading

from core.idea_manager import IdeaManager
from core.config_loader import ConfigLoader

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent


class PipelineService:
    def __init__(self):
        self.idea_manager = IdeaManager(PROJECT_ROOT / "ideas")
        self._config = ConfigLoader()
        self._workspace_dir = self._config.get_workspace_parent_dir()

    def submit_idea(self, idea_spec: dict) -> str:
        return self.idea_manager.submit_idea(idea_spec, validate=True)

    def get_idea(self, idea_id: str) -> Optional[dict]:
        return self.idea_manager.get_idea(idea_id)

    def list_ideas(self, status: Optional[str] = None) -> list[dict]:
        return self.idea_manager.list_ideas(status=status)

    def get_pipeline_state(self, idea_id: str) -> dict[str, Any]:
        idea = self.get_idea(idea_id)
        if not idea:
            return {"error": "idea not found"}

        repo_name = idea.get("idea", {}).get("metadata", {}).get("github_repo_name")
        workspace = self._resolve_workspace(idea_id, repo_name)
        if not workspace:
            return {"idea_id": idea_id, "stages": {}, "completed": False}

        state_file = workspace / ".idea-explorer" / "pipeline_state.json"
        if state_file.exists():
            with open(state_file) as f:
                return json.load(f)
        return {"idea_id": idea_id, "stages": {}, "completed": False}

    def run_pipeline_async(
        self,
        idea_id: str,
        provider: str = "claude",
        timeout: int = 3600,
        full_permissions: bool = True,
        write_paper: bool = False,
        paper_style: Optional[str] = None,
    ) -> dict:
        """Start pipeline in a background thread. Returns immediately."""
        def _run():
            try:
                from core.runner import ResearchRunner
                runner = ResearchRunner(use_github=True)
                runner.run_research(
                    idea_id=idea_id,
                    provider=provider,
                    timeout=timeout,
                    full_permissions=full_permissions,
                    write_paper=write_paper,
                    paper_style=paper_style,
                )
            except Exception as e:
                print(f"Pipeline error for {idea_id}: {e}")

        t = threading.Thread(target=_run, daemon=True)
        t.start()
        return {"idea_id": idea_id, "status": "started"}

    def _resolve_workspace(self, idea_id: str, repo_name: Optional[str] = None) -> Optional[Path]:
        if not self._workspace_dir.exists():
            return None
        if repo_name:
            ws = self._workspace_dir / repo_name
            if ws.exists():
                return ws
        for d in self._workspace_dir.iterdir():
            if d.is_dir() and idea_id in d.name:
                return d
        return None

    def fork_from_stage(self, idea_id: str, stage: str, provider: str = "claude") -> dict:
        """Fork pipeline from a given stage. Copies workspace, creates new idea."""
        import shutil
        from datetime import datetime

        idea = self.get_idea(idea_id)
        if not idea:
            raise ValueError("Idea not found")

        workspace = self.get_workspace_path(idea_id)
        idea_spec = idea.get("idea", {})

        fork_title = f"Fork of {idea_spec.get('title', idea_id)} (from {stage})"
        fork_spec = {
            "idea": {
                "title": fork_title,
                "domain": idea_spec.get("domain", "artificial_intelligence"),
                "hypothesis": idea_spec.get("hypothesis", ""),
                "metadata": {
                    "source": "fork",
                    "forked_from": idea_id,
                    "forked_stage": stage,
                    "forked_at": datetime.utcnow().isoformat(),
                },
            }
        }

        fork_id = self.submit_idea(fork_spec)

        if workspace and workspace.exists():
            fork_workspace = self._workspace_dir / f"fork-{fork_id}"
            shutil.copytree(workspace, fork_workspace, dirs_exist_ok=True)

            state_file = fork_workspace / ".idea-explorer" / "pipeline_state.json"
            if state_file.exists():
                import json as _json
                with open(state_file) as f:
                    state = _json.load(f)
                from core.config_loader import ConfigLoader
                stage_order = ["idea", "resource_finder", "human_review",
                               "experiment_runner", "paper_writer", "paper_revision",
                               "quality_evaluation"]
                try:
                    stage_idx = stage_order.index(stage)
                except ValueError:
                    stage_idx = 0
                for s in stage_order[stage_idx + 1:]:
                    if s in state.get("stages", {}):
                        state["stages"][s] = {"status": "pending"}
                state["completed"] = False
                state["current_stage"] = stage
                with open(state_file, "w") as f:
                    _json.dump(state, f, indent=2)

        return {"fork_id": fork_id, "title": fork_title, "forked_from": idea_id, "stage": stage}

    def get_workspace_path(self, idea_id: str) -> Optional[Path]:
        idea = self.get_idea(idea_id)
        if not idea:
            return None
        repo_name = idea.get("idea", {}).get("metadata", {}).get("github_repo_name")
        return self._resolve_workspace(idea_id, repo_name)
