"""Convert a free-text prompt into a structured idea YAML dict.

Reuses the same patterns as src/cli/fetch_from_ideahub.py:
- LLM extraction via OpenAI when OPENAI_API_KEY is set
- Template-based fallback via keyword matching when it is not
"""

from __future__ import annotations
import os
import re
import yaml

_DOMAIN_KEYWORDS = {
    "artificial_intelligence": ["llm", "language model", "nlp", "text", "gpt", "bert", "transformer", "prompt", "token"],
    "computer_vision": ["vision", "image", "cnn", "object detection", "segmentation", "diffusion"],
    "reinforcement_learning": ["reinforcement", " rl ", "reward", "policy", "agent", "environment"],
    "machine_learning": ["regression", "classification", "clustering", "supervised", "unsupervised", "gradient", "neural"],
    "data_science": ["data analysis", "statistics", "prediction", "forecasting", "tabular"],
    "scientific_computing": ["simulation", "numerical", "physics", "biology", "chemistry", "molecular"],
    "systems": ["distributed", "database", "network", "operating system", "compiler"],
    "theory": ["algorithm", "complexity", "optimization"],
    "mathematics": ["theorem", "proof", "conjecture", "lemma", "algebra", "topology",
                    "number theory", "combinatorics", "graph theory"],
}


def _infer_domain(text: str) -> str:
    text_lower = text.lower()
    best_domain = "artificial_intelligence"
    best_count = 0
    for domain, keywords in _DOMAIN_KEYWORDS.items():
        count = sum(1 for kw in keywords if kw in text_lower)
        if count > best_count:
            best_count = count
            best_domain = domain
    return best_domain


def _convert_without_llm(prompt: str) -> dict:
    domain = _infer_domain(prompt)
    title = prompt.strip()
    if len(title) > 120:
        title = title[:117] + "..."
    hypothesis = prompt.strip()
    if len(hypothesis) < 20:
        hypothesis = f"Investigate: {title}"
    return {
        "idea": {
            "title": title,
            "domain": domain,
            "hypothesis": hypothesis,
            "metadata": {"source": "gui_prompt"},
        }
    }


def _convert_with_llm(prompt: str) -> dict:
    from openai import OpenAI

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    system_msg = (
        "You are a research assistant. Given a free-text research idea, extract:\n"
        "1. title (concise, <120 chars)\n"
        "2. domain (one of: artificial_intelligence, machine_learning, data_science, "
        "systems, theory, mathematics, scientific_computing, nlp, computer_vision, reinforcement_learning)\n"
        "3. hypothesis (specific, testable, 1-3 sentences)\n\n"
        "Return ONLY valid YAML starting with 'idea:'."
    )
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=500,
    )
    raw = response.choices[0].message.content.strip()
    raw = re.sub(r"^```ya?ml\s*\n", "", raw)
    raw = re.sub(r"\n```\s*$", "", raw)
    parsed = yaml.safe_load(raw.strip())
    if "idea" not in parsed:
        parsed = {"idea": parsed}
    parsed["idea"].setdefault("metadata", {})["source"] = "gui_prompt"
    return parsed


def convert_prompt_to_idea(prompt: str) -> dict:
    """Convert free-text prompt to idea dict. Uses LLM if available, else fallback."""
    if os.getenv("OPENAI_API_KEY"):
        try:
            return _convert_with_llm(prompt)
        except Exception:
            pass
    return _convert_without_llm(prompt)
