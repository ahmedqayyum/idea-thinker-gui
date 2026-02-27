"""
Post-run quality evaluator for research workspaces.

Generates a human-readable quality report with category scores and actionable gaps.
"""

from pathlib import Path
from typing import Dict, List, Any
import json
import os
import re


class QualityEvaluator:
    """Evaluate run outputs and emit a quality_report.md file."""
    CONFERENCE_CATEGORIES = [
        "novelty_significance",
        "technical_soundness",
        "experimental_rigor",
        "clarity_presentation",
        "reproducibility",
    ]

    REQUIRED_FILES = [
        "README.md",
        "REPORT.md",
        "planning.md",
        "resources.md",
        "literature_review.md",
    ]

    STAT_TEST_PATTERNS = [
        r"\bp[\s\-]?value\b",
        r"\bconfidence interval\b",
        r"\bt[-\s]?test\b",
        r"\banova\b",
        r"\bmann[-\s]?whitney\b",
        r"\bchi[-\s]?square\b",
        r"\bcohen'?s d\b",
        r"\beffect size\b",
        r"\bbootstrap\b",
    ]

    STOPWORDS = {
        "the", "and", "for", "that", "with", "this", "from", "were", "have", "has",
        "are", "our", "using", "into", "their", "they", "than", "show", "shows",
        "between", "about", "after", "before", "under", "over", "into", "your", "you",
        "will", "would", "could", "should", "been", "being", "also", "across", "within",
        "which", "while", "these", "those", "such", "more", "most", "less", "some",
        "many", "much", "into", "through", "based", "model", "models", "data", "results",
    }

    def __init__(self, work_dir: Path, idea: Dict[str, Any]):
        self.work_dir = Path(work_dir)
        self.idea = idea

    def evaluate(self) -> Dict[str, Any]:
        """Run quality checks and write quality_report.md.

        Primary mode: LLM-as-judge.
        Fallback mode: deterministic heuristics when LLM evaluation is unavailable.
        """
        llm_report = self._evaluate_with_llm()
        if llm_report:
            self._write_report(llm_report)
            return llm_report

        return self._evaluate_with_heuristics()

    def _evaluate_with_heuristics(self) -> Dict[str, Any]:
        """Fallback deterministic evaluator using conference-style categories."""
        hypothesis_score, hypothesis_notes = self._score_hypothesis_alignment()
        stats_score, stats_notes = self._score_statistical_tests()
        reproducibility_score, reproducibility_notes = self._score_reproducibility()
        files_score, files_notes = self._score_required_files()

        category_scores = {
            "novelty_significance": max(0, min(25, int((hypothesis_score + stats_score) / 2))),
            "technical_soundness": hypothesis_score,
            "experimental_rigor": stats_score,
            "clarity_presentation": files_score,
            "reproducibility": reproducibility_score,
        }
        raw_total = sum(category_scores.values())
        total = int(round((raw_total / 125) * 100))
        report = {
            "total_score": total,
            "category_scores": category_scores,
            "notes": {
                "novelty_significance": [
                    "Heuristic estimate: novelty is weakly approximated from hypothesis specificity and result differentiation."
                ],
                "technical_soundness": hypothesis_notes,
                "experimental_rigor": stats_notes,
                "clarity_presentation": files_notes,
                "reproducibility": reproducibility_notes,
            },
            "actionable_gaps": [],
            "conference_review": {
                "summary": "Fallback heuristic mode was used; this is not a full conference-style LLM review.",
                "strengths": [],
                "weaknesses": ["Run with LLM enabled for a true reviewer-style critique."],
                "methodology_issues": [],
                "threats_to_validity": [],
                "missing_ablations_or_controls": [],
                "recommended_experiments": [],
                "writing_clarity_issues": [],
                "overall_recommendation": "Borderline",
            },
            "method": "heuristic_fallback",
        }

        self._write_report(report)
        return report

    def _evaluate_with_llm(self) -> Dict[str, Any]:
        """LLM-as-judge evaluator. Returns None if unavailable/fails."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return {}

        try:
            from openai import OpenAI
        except Exception:
            return {}

        model = os.getenv("QUALITY_EVAL_MODEL", "gpt-4.1-mini")
        client = OpenAI(api_key=api_key)

        context_payload = self._build_llm_context()
        prompt = (
            "You are a strict conference reviewer evaluating a research submission.\n"
            "Score the workspace across exactly 5 conference-style categories (0-25 each):\n"
            "1) novelty_significance\n"
            "2) technical_soundness\n"
            "3) experimental_rigor\n"
            "4) clarity_presentation\n"
            "5) reproducibility\n\n"
            "Return ONLY valid JSON with this schema:\n"
            "{\n"
            '  "total_score": int,\n'
            '  "category_scores": {\n'
            '    "novelty_significance": int,\n'
            '    "technical_soundness": int,\n'
            '    "experimental_rigor": int,\n'
            '    "clarity_presentation": int,\n'
            '    "reproducibility": int\n'
            "  },\n"
            '  "notes": {\n'
            '    "novelty_significance": [string],\n'
            '    "technical_soundness": [string],\n'
            '    "experimental_rigor": [string],\n'
            '    "clarity_presentation": [string],\n'
            '    "reproducibility": [string]\n'
            "  },\n"
            '  "actionable_gaps": [string],\n'
            '  "conference_review": {\n'
            '    "summary": string,\n'
            '    "strengths": [string],\n'
            '    "weaknesses": [string],\n'
            '    "methodology_issues": [string],\n'
            '    "threats_to_validity": [string],\n'
            '    "missing_ablations_or_controls": [string],\n'
            '    "recommended_experiments": [string],\n'
            '    "writing_clarity_issues": [string],\n'
            '    "overall_recommendation": string\n'
            "  }\n"
            "}\n\n"
            "Scoring guidance:\n"
            "- Be evidence-based from provided artifacts.\n"
            "- Score as a real conference reviewer (not a checklist bot).\n"
            "- Penalize weak novelty claims, unclear methods, insufficient baselines, no statistical rigor, and poor writing clarity.\n"
            "- Keep notes concise and actionable.\n\n"
            "Reviewer guidance:\n"
            "- Critique methodology rigor as a real reviewer would.\n"
            "- Identify concrete threats to internal/external validity.\n"
            "- Point out questionable assumptions, leakage risks, weak baselines, and missing controls.\n"
            "- Recommend specific additional experiments/ablations.\n"
            "- Include writing/presentation issues that reduce scientific clarity.\n"
            "- `overall_recommendation` must be one of: Reject, Weak Reject, Borderline, Weak Accept, Accept.\n\n"
            "Writing style requirements:\n"
            "- Every point should be a complete explanation, not a short fragment.\n"
            "- For weaknesses/methodology issues/recommended experiments, each item should be 2-4 sentences.\n"
            "- Reference concrete evidence from the paper/report when possible.\n"
            "- Keep tone constructive and specific.\n\n"
            f"Workspace evidence:\n{context_payload}"
        )

        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert scientific reviewer. Return strict JSON only.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                max_tokens=1800,
            )
            raw = (response.choices[0].message.content or "").strip()
            raw = re.sub(r"^```json\s*", "", raw)
            raw = re.sub(r"^```\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            parsed = json.loads(raw)
            validated = self._validate_llm_report(parsed)
            if validated:
                validated["method"] = f"llm_judge:{model}"
                return validated
            return {}
        except Exception:
            return {}

    def _validate_llm_report(self, report: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and normalize LLM JSON report."""
        if not isinstance(report, dict):
            return {}
        scores = report.get("category_scores", {})
        notes = report.get("notes", {})
        if not isinstance(scores, dict) or not isinstance(notes, dict):
            return {}

        categories = [
            "novelty_significance",
            "technical_soundness",
            "experimental_rigor",
            "clarity_presentation",
            "reproducibility",
        ]

        normalized_scores: Dict[str, int] = {}
        normalized_notes: Dict[str, List[str]] = {}
        for category in categories:
            score_val = scores.get(category, 0)
            try:
                score = int(score_val)
            except Exception:
                score = 0
            score = max(0, min(25, score))
            normalized_scores[category] = score

            n = notes.get(category, [])
            if isinstance(n, list):
                normalized_notes[category] = [str(x) for x in n][:8]
            elif isinstance(n, str):
                normalized_notes[category] = [n]
            else:
                normalized_notes[category] = []

        total_score = int(round((sum(normalized_scores.values()) / 125) * 100))
        gaps = report.get("actionable_gaps", [])
        if isinstance(gaps, list):
            actionable_gaps = [str(x) for x in gaps][:12]
        elif isinstance(gaps, str):
            actionable_gaps = [gaps]
        else:
            actionable_gaps = []

        return {
            "total_score": total_score,
            "category_scores": normalized_scores,
            "notes": normalized_notes,
            "actionable_gaps": actionable_gaps,
            "conference_review": self._normalize_conference_review(report.get("conference_review", {})),
        }

    @staticmethod
    def _normalize_conference_review(review: Any) -> Dict[str, Any]:
        """Normalize conference-style review block from LLM."""
        if not isinstance(review, dict):
            review = {}

        def list_field(name: str, limit: int = 10) -> List[str]:
            value = review.get(name, [])
            if isinstance(value, list):
                return [str(x).strip() for x in value if str(x).strip()][:limit]
            if isinstance(value, str) and value.strip():
                return [value.strip()]
            return []

        summary = str(review.get("summary", "")).strip()
        if not summary:
            summary = "No conference-style summary returned."

        recommendation = str(review.get("overall_recommendation", "")).strip()
        allowed = {"Reject", "Weak Reject", "Borderline", "Weak Accept", "Accept"}
        if recommendation not in allowed:
            recommendation = "Borderline"

        return {
            "summary": summary,
            "strengths": list_field("strengths"),
            "weaknesses": list_field("weaknesses"),
            "methodology_issues": list_field("methodology_issues"),
            "threats_to_validity": list_field("threats_to_validity"),
            "missing_ablations_or_controls": list_field("missing_ablations_or_controls"),
            "recommended_experiments": list_field("recommended_experiments"),
            "writing_clarity_issues": list_field("writing_clarity_issues"),
            "overall_recommendation": recommendation,
        }

    def _build_llm_context(self) -> str:
        """Build compact evidence pack for LLM judge."""
        idea_spec = self.idea.get("idea", self.idea)
        hypothesis = str(idea_spec.get("hypothesis", "")).strip()
        title = str(idea_spec.get("title", "")).strip()
        domain = str(idea_spec.get("domain", "")).strip()

        chunks = [
            f"Title: {title}",
            f"Domain: {domain}",
            f"Hypothesis: {hypothesis}",
            "",
            "FILE SUMMARY:",
        ]

        for rel in self.REQUIRED_FILES:
            p = self.work_dir / rel
            chunks.append(f"- {rel}: {'present' if p.exists() else 'missing'}")

        chunks.append("")
        chunks.append("CONTENT SNIPPETS:")
        snippets = [
            ("REPORT.md", 12000),
            ("README.md", 6000),
            ("planning.md", 6000),
            ("resources.md", 6000),
            ("literature_review.md", 6000),
            ("paper_draft/main.tex", 20000),
            ("paper_draft/main.md", 12000),
        ]
        for rel, limit in snippets:
            text = self._read_text(self.work_dir / rel)
            text = re.sub(r"\s+", " ", text).strip()
            if len(text) > limit:
                text = text[:limit] + " ...[truncated]"
            chunks.append(f"\n## {rel}\n{text or '[missing]'}")

        results_summary = self._collect_text_corpus(["results/**/*.json", "results/**/*.md"])
        results_summary = re.sub(r"\s+", " ", results_summary).strip()
        if len(results_summary) > 10000:
            results_summary = results_summary[:10000] + " ...[truncated]"
        chunks.append(f"\n## results_summary\n{results_summary or '[none]'}")

        return "\n".join(chunks)

    def _score_hypothesis_alignment(self) -> (int, List[str]):
        notes: List[str] = []
        idea_spec = self.idea.get("idea", self.idea)
        hypothesis = str(idea_spec.get("hypothesis", "")).strip()

        report_text = self._read_text(self.work_dir / "REPORT.md")
        conclusion_text = self._extract_conclusion(report_text)
        if not conclusion_text:
            conclusion_text = report_text

        if not hypothesis:
            return 0, ["Missing hypothesis in idea specification."]
        if not report_text:
            return 0, ["Missing REPORT.md content for alignment check."]

        hyp_tokens = self._keywords(hypothesis)
        conc_tokens = self._keywords(conclusion_text)
        if not hyp_tokens or not conc_tokens:
            return 5, ["Insufficient text signal to estimate alignment robustly."]

        overlap = len(hyp_tokens.intersection(conc_tokens))
        ratio = overlap / max(1, len(hyp_tokens))

        if ratio >= 0.50:
            score = 25
        elif ratio >= 0.35:
            score = 20
        elif ratio >= 0.20:
            score = 14
        elif ratio >= 0.10:
            score = 8
        else:
            score = 3

        notes.append(f"Hypothesis keyword overlap ratio: {ratio:.2f} ({overlap}/{len(hyp_tokens)}).")
        if score < 20:
            notes.append(
                "Gap: conclusion section weakly reflects hypothesis terms; add explicit claim-by-claim mapping."
            )
        return score, notes

    def _score_statistical_tests(self) -> (int, List[str]):
        notes: List[str] = []
        corpus = self._collect_text_corpus(["REPORT.md", "results/**/*.json", "results/**/*.md"])
        if not corpus:
            return 0, ["No report/results corpus found for statistical-test scan."]

        hits = []
        lower = corpus.lower()
        for pattern in self.STAT_TEST_PATTERNS:
            if re.search(pattern, lower):
                hits.append(pattern)

        hit_count = len(hits)
        if hit_count >= 6:
            score = 25
        elif hit_count >= 4:
            score = 20
        elif hit_count >= 2:
            score = 14
        elif hit_count == 1:
            score = 8
        else:
            score = 2

        notes.append(f"Detected {hit_count} statistical signal pattern(s).")
        if hit_count < 2:
            notes.append(
                "Gap: add formal statistical tests (e.g., p-values, confidence intervals, effect sizes)."
            )
        return score, notes

    def _score_reproducibility(self) -> (int, List[str]):
        notes: List[str] = []
        score = 0

        seed_signal = self._contains_any(
            self._collect_text_corpus(["REPORT.md", "README.md", "src/**/*.py"]),
            [r"\bseed\b", r"\brandom_state\b", r"\bnp\.random\.seed\b", r"\btorch\.manual_seed\b"],
        )
        env_files = [self.work_dir / "pyproject.toml", self.work_dir / "uv.lock", self.work_dir / "requirements.txt"]
        env_present = any(p.exists() for p in env_files)
        commands_signal = self._contains_any(
            self._collect_text_corpus(["README.md", "REPORT.md"]),
            [r"\bpython\s+", r"\buv run\b", r"\bhow to reproduce\b", r"\breproduce\b"],
        )
        logs_present = (self.work_dir / "logs").exists() and any((self.work_dir / "logs").glob("*"))

        if seed_signal:
            score += 7
            notes.append("Seed-related signal found.")
        else:
            notes.append("Gap: no explicit random seed usage documented.")

        if env_present:
            score += 6
            notes.append("Environment lock/spec file found.")
        else:
            notes.append("Gap: missing environment specification (pyproject/lock/requirements).")

        if commands_signal:
            score += 6
            notes.append("Reproduction command signal found in docs.")
        else:
            notes.append("Gap: missing clear run/reproduce commands in docs.")

        if logs_present:
            score += 6
            notes.append("Execution logs present.")
        else:
            notes.append("Gap: logs directory missing or empty.")

        return score, notes

    def _score_required_files(self) -> (int, List[str]):
        notes: List[str] = []
        score = 0

        present = 0
        quality_points = 0
        for rel in self.REQUIRED_FILES:
            path = self.work_dir / rel
            if path.exists():
                present += 1
                text = self._read_text(path)
                if len(text.strip()) > 300:
                    quality_points += 1
            else:
                notes.append(f"Missing required file: {rel}")

        # 15 points for existence, 10 points for non-trivial completeness.
        score += int((present / len(self.REQUIRED_FILES)) * 15)
        score += int((quality_points / len(self.REQUIRED_FILES)) * 10)

        if present == len(self.REQUIRED_FILES):
            notes.append("All required files are present.")
        if quality_points < len(self.REQUIRED_FILES):
            notes.append("Gap: some required files exist but are too sparse; expand key sections.")

        return score, notes

    def _write_report(self, report: Dict[str, Any]) -> None:
        out = self.work_dir / "quality_report.md"
        scores = report["category_scores"]
        notes = report["notes"]
        total = report["total_score"]
        method = report.get("method", "unknown")

        lines = [
            "# Quality Evaluation Report",
            "",
            f"Overall Score: **{total}/100**",
            f"Evaluation Method: **{method}**",
            "",
            "## Conference Criteria Scores",
            "",
            f"- Novelty & significance: **{scores.get('novelty_significance', 0)}/25**",
            f"- Technical soundness: **{scores.get('technical_soundness', 0)}/25**",
            f"- Experimental rigor: **{scores.get('experimental_rigor', 0)}/25**",
            f"- Clarity & presentation: **{scores.get('clarity_presentation', 0)}/25**",
            f"- Reproducibility: **{scores.get('reproducibility', 0)}/25**",
            "",
            "## Actionable Gaps",
            "",
        ]

        gap_lines = []
        llm_gaps = report.get("actionable_gaps", [])
        if isinstance(llm_gaps, list):
            for gap in llm_gaps:
                gap_lines.append(f"- {gap}")

        for category in self.CONFERENCE_CATEGORIES:
            for note in notes.get(category, []):
                if "gap:" in note.lower() or "missing" in note.lower():
                    gap_lines.append(f"- {note}")

        if not gap_lines:
            lines.append("- No critical gaps explicitly listed.")
        else:
            lines.extend(gap_lines)
        lines += ["", "## Criteria Notes", ""]
        lines.append("### Novelty & Significance")
        lines.extend([f"- {n}" for n in notes.get("novelty_significance", [])] or ["- No notes."])
        lines += ["", "### Technical Soundness"]
        lines.extend([f"- {n}" for n in notes.get("technical_soundness", [])] or ["- No notes."])
        lines += ["", "### Experimental Rigor"]
        lines.extend([f"- {n}" for n in notes.get("experimental_rigor", [])] or ["- No notes."])
        lines += ["", "### Clarity & Presentation"]
        lines.extend([f"- {n}" for n in notes.get("clarity_presentation", [])] or ["- No notes."])
        lines += ["", "### Reproducibility"]
        lines.extend([f"- {n}" for n in notes.get("reproducibility", [])] or ["- No notes."])
        lines += ["", "## Reviewer Assessment", ""]
        conference = report.get("conference_review", {}) if isinstance(report.get("conference_review"), dict) else {}
        summary = str(conference.get("summary", "")).strip()
        recommendation = str(conference.get("overall_recommendation", "")).strip()
        if summary:
            lines.append(summary)
            lines.append("")
        if recommendation:
            lines.append(f"Recommendation: **{recommendation}**")
            lines.append("")

        def _append_detailed_section(title: str, items: Any, fallback: str) -> None:
            lines.append(f"### {title}")
            if isinstance(items, list) and items:
                for idx, item in enumerate(items, start=1):
                    text = str(item).strip()
                    if text:
                        lines.append(f"{idx}. {text}")
            else:
                lines.append(fallback)
            lines.append("")

        _append_detailed_section("Strengths", conference.get("strengths", []), "No clear strengths were identified.")
        _append_detailed_section("Weaknesses", conference.get("weaknesses", []), "No concrete weaknesses were identified.")
        _append_detailed_section("Methodology Issues", conference.get("methodology_issues", []), "No major methodology concerns were identified.")
        _append_detailed_section("Threats to Validity", conference.get("threats_to_validity", []), "No explicit threats to validity were identified.")
        _append_detailed_section("Missing Ablations and Controls", conference.get("missing_ablations_or_controls", []), "No missing ablations or controls were identified.")
        _append_detailed_section("Recommended Experiments", conference.get("recommended_experiments", []), "No additional experiments were recommended.")
        _append_detailed_section("Writing and Clarity Issues", conference.get("writing_clarity_issues", []), "No major writing clarity issues were identified.")

        lines += [
            "## Improvement Plan",
            "",
            "Use the weaknesses, methodology issues, and recommended experiments above as a concrete revision checklist.",
            "Prioritize high-impact changes first: fix validity/method flaws, then strengthen experiments, then improve writing clarity.",
            "",
            "## Method",
            "",
            "This report uses LLM-as-reviewer when available, with automatic heuristic fallback over workspace artifacts.",
        ]

        out.write_text("\n".join(lines) + "\n", encoding="utf-8")

    def _collect_text_corpus(self, patterns: List[str]) -> str:
        chunks: List[str] = []
        for pattern in patterns:
            for path in self.work_dir.glob(pattern):
                if path.is_file():
                    txt = self._read_text(path)
                    if txt:
                        chunks.append(txt)
        return "\n".join(chunks)

    @staticmethod
    def _read_text(path: Path) -> str:
        if not path.exists() or not path.is_file():
            return ""
        try:
            if path.suffix.lower() == ".json":
                data = json.loads(path.read_text(encoding="utf-8", errors="replace"))
                return json.dumps(data, ensure_ascii=False)
            return path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            return ""

    @staticmethod
    def _extract_conclusion(report_text: str) -> str:
        if not report_text:
            return ""
        # Try markdown headings for conclusion/discussion.
        m = re.search(
            r"(?is)^##+\s*(conclusion|discussion)\s*\n(.*?)(?=^##+\s|\Z)",
            report_text,
            re.MULTILINE,
        )
        if m:
            return m.group(2).strip()
        return ""

    @classmethod
    def _keywords(cls, text: str) -> set:
        words = re.findall(r"[A-Za-z][A-Za-z0-9\-]{2,}", text.lower())
        filtered = [w for w in words if w not in cls.STOPWORDS]
        # Keep most meaningful unique terms.
        return set(filtered)

    @staticmethod
    def _contains_any(text: str, patterns: List[str]) -> bool:
        if not text:
            return False
        for p in patterns:
            if re.search(p, text, re.IGNORECASE):
                return True
        return False
