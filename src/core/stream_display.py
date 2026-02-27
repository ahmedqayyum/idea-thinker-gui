"""
Human-friendly live stream display for agent CLI output.

Keeps raw JSON logs on disk while presenting concise progress updates in terminal.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional, Dict, Any
import json
import threading
import time


class LiveStreamDisplay:
    """Render concise, human-readable progress from mixed CLI streams."""

    def __init__(self, stage: str, work_dir: Optional[Path] = None):
        self.stage = stage
        self.work_dir = Path(work_dir) if work_dir else None
        self._stop_event = threading.Event()
        self._ticker_thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        self._start_ts = time.time()
        self._last_activity_ts = self._start_ts
        self._last_resource_counts: Dict[str, int] = {}
        self._last_status_line = ""

    def start(self) -> None:
        """Start periodic status updates."""
        self._ticker_thread = threading.Thread(target=self._ticker_loop, daemon=True)
        self._ticker_thread.start()

    def stop(self) -> None:
        """Stop periodic status updates and print final snapshot."""
        self._stop_event.set()
        if self._ticker_thread and self._ticker_thread.is_alive():
            self._ticker_thread.join(timeout=1.0)

        if self.stage == "resource_finder":
            self._print_resource_counts(force=True)

    def consume_line(self, line: str) -> None:
        """Consume one line of stream output and print readable updates."""
        stripped = line.strip()
        if not stripped:
            return

        with self._lock:
            self._last_activity_ts = time.time()

        event = self._parse_json_line(stripped)
        if event is not None:
            self._render_event(event)
            return

        # Keep non-JSON plain-text events visible, suppress raw JSON-like blobs.
        if not self._looks_like_json(stripped):
            self._print_status(f"ℹ️  {stripped}")

        # Detect common fatal messages even if wrapped in plain text.
        self._render_known_errors(stripped)

    def _ticker_loop(self) -> None:
        while not self._stop_event.is_set():
            time.sleep(8)
            if self._stop_event.is_set():
                return

            elapsed = int(time.time() - self._start_ts)
            idle_for = int(time.time() - self._last_activity_ts)
            mm, ss = divmod(elapsed, 60)

            if self.stage == "resource_finder":
                self._print_resource_counts(force=False)
                self._print_status(f"⏳ Resource finder running... {mm:02d}:{ss:02d} elapsed")
            else:
                self._print_status(
                    f"⏳ Experiment runner working... {mm:02d}:{ss:02d} elapsed (idle {idle_for}s)"
                )

    def _render_event(self, event: Dict[str, Any]) -> None:
        event_type = str(event.get("type", ""))
        text = self._extract_text(event)

        if event_type == "result" and event.get("is_error"):
            result_msg = str(event.get("result", "")).strip()
            if result_msg:
                self._print_status(f"⚠️  Agent reported: {result_msg}")
                self._render_known_errors(result_msg)
            return

        if event_type == "assistant" and event.get("error"):
            err = str(event.get("error", "")).strip()
            if err:
                self._print_status(f"⚠️  Agent error: {err}")
            if text:
                self._print_status(f"⚠️  {text}")
                self._render_known_errors(text)
            return

        if text:
            compact = " ".join(text.split())
            if compact:
                if len(compact) > 220:
                    compact = compact[:217] + "..."
                self._print_status(f"🤖 {compact}")
                self._render_known_errors(compact)

    def _extract_text(self, event: Dict[str, Any]) -> str:
        message = event.get("message")
        if not isinstance(message, dict):
            return ""

        content = message.get("content")
        if not isinstance(content, list):
            return ""

        parts = []
        for item in content:
            if not isinstance(item, dict):
                continue
            if item.get("type") == "text":
                text = str(item.get("text", "")).strip()
                if text:
                    parts.append(text)
        return "\n".join(parts).strip()

    def _render_known_errors(self, text: str) -> None:
        lowered = text.lower()
        if "hit your limit" in lowered or "rate_limit" in lowered:
            self._print_status(
                "⚠️  Provider rate limit reached. You can retry later with --skip-resource-finder."
            )
        elif "not logged in" in lowered:
            self._print_status("⚠️  Provider is not authenticated in this runtime context.")

    def _print_resource_counts(self, force: bool) -> None:
        if not self.work_dir:
            return

        papers_dir = self.work_dir / "papers"
        datasets_dir = self.work_dir / "datasets"
        code_dir = self.work_dir / "code"

        def count_files(path: Path) -> int:
            if not path.exists():
                return 0
            if path.is_file():
                return 1
            return sum(1 for p in path.rglob("*") if p.is_file())

        counts = {
            "papers": count_files(papers_dir),
            "datasets": count_files(datasets_dir),
            "code_files": count_files(code_dir),
        }

        if not force and counts == self._last_resource_counts:
            return

        self._last_resource_counts = counts

        # Soft progress bar uses papers count as a user-friendly proxy.
        paper_target = 20
        progress = min(1.0, counts["papers"] / paper_target) if paper_target else 0.0
        filled = int(progress * 20)
        bar = "#" * filled + "-" * (20 - filled)
        pct = int(progress * 100)

        self._print_status(
            f"📚 Resource progress [{bar}] {pct}% | papers={counts['papers']} datasets={counts['datasets']} code_files={counts['code_files']}"
        )

    def _print_status(self, line: str) -> None:
        # De-duplicate repeated ticker lines to reduce noise.
        if line == self._last_status_line:
            return
        self._last_status_line = line
        print(line)

    @staticmethod
    def _looks_like_json(text: str) -> bool:
        return text.startswith("{") and text.endswith("}")

    @staticmethod
    def _parse_json_line(text: str) -> Optional[Dict[str, Any]]:
        try:
            data = json.loads(text)
            if isinstance(data, dict):
                return data
            return None
        except json.JSONDecodeError:
            return None
