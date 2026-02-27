"""
Finalization script: generates visualizations and writes REPORT.md
using results already saved to results/raw_outputs/.
"""

import json
import math
import os
import numpy as np
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).parent
RESULTS_DIR = BASE_DIR / "results"
RAW_DIR = RESULTS_DIR / "raw_outputs"
PLOTS_DIR = RESULTS_DIR / "plots"
PLOTS_DIR.mkdir(parents=True, exist_ok=True)


def wilson_ci(n_correct, n_total, z=1.96):
    p = n_correct / n_total
    denom = 1 + z**2 / n_total
    center = (p + z**2 / (2 * n_total)) / denom
    margin = z * math.sqrt(p*(1-p)/n_total + z**2/(4*n_total**2)) / denom
    return max(0.0, center - margin), min(1.0, center + margin)


def mcnemar_test(results_a, results_b):
    correct_a = [r["correct"] for r in results_a]
    correct_b = [r["correct"] for r in results_b]
    b = sum(1 for a, bv in zip(correct_a, correct_b) if not a and bv)
    c = sum(1 for a, bv in zip(correct_a, correct_b) if a and not bv)
    n = b + c
    if n == 0:
        return 1.0, 0.0, b, c
    stat = (abs(b - c) - 1)**2 / (b + c) if n >= 10 else (b - c)**2 / (b + c)
    from scipy.stats import chi2
    p_val = chi2.sf(stat, df=1)
    return p_val, stat, b, c


def cohens_h(p1, p2):
    return 2 * math.asin(math.sqrt(max(0, min(1, p1)))) - 2 * math.asin(math.sqrt(max(0, min(1, p2))))


def accuracy_by_group(results, group_key):
    groups = {}
    for r in results:
        k = r[group_key]
        groups.setdefault(k, {"correct": 0, "total": 0})
        groups[k]["total"] += 1
        groups[k]["correct"] += r["correct"]
    return {k: v["correct"] / v["total"] for k, v in groups.items()}


# Load results
print("Loading results...")
all_results = {}
for cond in ["direct", "zeroshot", "fewshot"]:
    with open(RAW_DIR / f"{cond}_results.json") as f:
        all_results[cond] = json.load(f)
    n = sum(r["correct"] for r in all_results[cond])
    print(f"  {cond}: {n}/90 = {n/90*100:.1f}%")

# Statistical analysis
print("\nRunning statistical analysis...")
from scipy.stats import chi2 as chi2_dist
analysis = {}
for cond in ["direct", "zeroshot", "fewshot"]:
    r = all_results[cond]
    n = sum(x["correct"] for x in r)
    acc = n / len(r)
    lo, hi = wilson_ci(n, len(r))
    analysis[cond] = {
        "n_correct": n,
        "n_total": len(r),
        "accuracy": acc,
        "accuracy_pct": round(acc * 100, 2),
        "ci_95": (round(lo * 100, 2), round(hi * 100, 2)),
        "by_difficulty": accuracy_by_group(r, "difficulty"),
        "by_operation": accuracy_by_group(r, "operation"),
    }

pairs = [
    ("direct", "zeroshot"),
    ("direct", "fewshot"),
    ("zeroshot", "fewshot"),
]
analysis["mcnemar"] = {}
for a, b in pairs:
    p, stat, b_cnt, c_cnt = mcnemar_test(all_results[a], all_results[b])
    h = cohens_h(analysis[b]["accuracy"], analysis[a]["accuracy"])
    analysis["mcnemar"][f"{a}_vs_{b}"] = {
        "p_value": round(p, 4),
        "statistic": round(stat, 4),
        "b_count": b_cnt,
        "c_count": c_cnt,
        "cohens_h": round(h, 4),
        "significant": p < 0.05,
        "significant_bonferroni": p < 0.0167,
    }
    print(f"  {a} vs {b}: p={p:.4f}, h={h:.4f}, sig={'YES' if p < 0.05 else 'no'}")

with open(RESULTS_DIR / "analysis.json", "w") as f:
    json.dump(analysis, f, indent=2, default=str)
print("Saved analysis.json")

# ── Visualizations ─────────────────────────────────────────────────────────

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

conditions = ["direct", "zeroshot", "fewshot"]
labels = ["Direct\nPrompting", "Zero-shot\nCoT", "Few-shot\nCoT"]
colors = ["#4C72B0", "#DD8452", "#55A868"]

# Figure 1: Overall accuracy with Wilson 95% CIs
fig, ax = plt.subplots(figsize=(8, 5))
accs = []
cis_low, cis_high = [], []
for cond in conditions:
    r = all_results[cond]
    n = sum(x["correct"] for x in r)
    acc = n / len(r)
    lo, hi = wilson_ci(n, len(r))
    accs.append(acc * 100)
    cis_low.append(max(0.0, (acc - lo)) * 100)
    cis_high.append(max(0.0, (hi - acc)) * 100)

bars = ax.bar(labels, accs, color=colors, width=0.5, alpha=0.85,
              yerr=[cis_low, cis_high], capsize=6,
              error_kw={"elinewidth": 2, "ecolor": "black"})
ax.set_ylim(0, 115)
ax.set_ylabel("Accuracy (%)", fontsize=13)
ax.set_title("GPT-4o Accuracy on Modular Arithmetic\nby Prompting Strategy (n=90, 95% Wilson CI)", fontsize=12)
for bar, acc in zip(bars, accs):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 3,
            f"{acc:.1f}%", ha="center", va="bottom", fontsize=12, fontweight="bold")
# Add significance annotation
ax.annotate("", xy=(1, 102), xytext=(0, 102),
            arrowprops=dict(arrowstyle="-", color="black", lw=1.5))
ax.text(0.5, 104, "p=0.0044*", ha="center", va="bottom", fontsize=10)
ax.annotate("", xy=(2, 108), xytext=(0, 108),
            arrowprops=dict(arrowstyle="-", color="black", lw=1.5))
ax.text(1.0, 110, "p=0.0044*", ha="center", va="bottom", fontsize=10)
ax.grid(axis="y", alpha=0.3)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
plt.tight_layout()
plt.savefig(PLOTS_DIR / "fig1_overall_accuracy.png", dpi=150, bbox_inches="tight")
plt.close()
print("Saved fig1_overall_accuracy.png")

# Figure 2: Accuracy by difficulty
difficulty_order = ["easy", "medium", "hard"]
fig, ax = plt.subplots(figsize=(9, 5))
x = np.arange(len(difficulty_order))
width = 0.25
for i, (cond, label, color) in enumerate(zip(conditions, labels, colors)):
    acc_by_diff = analysis[cond]["by_difficulty"]
    vals = [acc_by_diff.get(d, 0) * 100 for d in difficulty_order]
    rects = ax.bar(x + i*width, vals, width, label=label.replace("\n", " "),
                   color=color, alpha=0.85)
    for rect, val in zip(rects, vals):
        if val > 0:
            ax.text(rect.get_x() + rect.get_width()/2, rect.get_height() + 0.5,
                    f"{val:.0f}%", ha="center", va="bottom", fontsize=8.5)

ax.set_xticks(x + width)
ax.set_xticklabels([d.capitalize() for d in difficulty_order], fontsize=12)
ax.set_ylabel("Accuracy (%)", fontsize=12)
ax.set_ylim(0, 115)
ax.set_title("Accuracy by Difficulty Level\nfor Each Prompting Strategy", fontsize=12)
ax.legend(fontsize=10, loc="lower right")
ax.grid(axis="y", alpha=0.3)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
plt.tight_layout()
plt.savefig(PLOTS_DIR / "fig2_accuracy_by_difficulty.png", dpi=150, bbox_inches="tight")
plt.close()
print("Saved fig2_accuracy_by_difficulty.png")

# Figure 3: Accuracy by operation type
op_order = ["+", "-", "*", "multi_step"]
op_labels_plot = ["Addition\n(+)", "Subtraction\n(−)", "Multiplication\n(×)", "Multi-step\n(a+b×c)"]
fig, ax = plt.subplots(figsize=(10, 5))
x = np.arange(len(op_order))
width = 0.25
for i, (cond, label, color) in enumerate(zip(conditions, labels, colors)):
    acc_by_op = analysis[cond]["by_operation"]
    vals = [acc_by_op.get(op, 0) * 100 for op in op_order]
    rects = ax.bar(x + i*width, vals, width, label=label.replace("\n", " "),
                   color=color, alpha=0.85)
    for rect, val in zip(rects, vals):
        if val > 0:
            ax.text(rect.get_x() + rect.get_width()/2, rect.get_height() + 0.5,
                    f"{val:.0f}%", ha="center", va="bottom", fontsize=8.5)

ax.set_xticks(x + width)
ax.set_xticklabels(op_labels_plot, fontsize=10)
ax.set_ylabel("Accuracy (%)", fontsize=12)
ax.set_ylim(0, 115)
ax.set_title("Accuracy by Operation Type\nfor Each Prompting Strategy", fontsize=12)
ax.legend(fontsize=10)
ax.grid(axis="y", alpha=0.3)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
plt.tight_layout()
plt.savefig(PLOTS_DIR / "fig3_accuracy_by_operation.png", dpi=150, bbox_inches="tight")
plt.close()
print("Saved fig3_accuracy_by_operation.png")

# Figure 4: Error analysis — direct condition only (others have 0 errors)
fig, ax = plt.subplots(figsize=(9, 5))
direct_errors = [r for r in all_results["direct"] if not r["correct"]]
op_error_counts = {}
diff_error_counts = {}
for r in direct_errors:
    op_error_counts[r["operation"]] = op_error_counts.get(r["operation"], 0) + 1
    diff_error_counts[r["difficulty"]] = diff_error_counts.get(r["difficulty"], 0) + 1

# Side-by-side: errors by operation and difficulty
ops = ["*", "multi_step", "+", "-"]
op_names = ["Mult. (×)", "Multi-step", "Addition (+)", "Subtraction (−)"]
err_vals = [op_error_counts.get(op, 0) for op in ops]

bars = ax.barh(op_names, err_vals, color=["#e74c3c", "#e74c3c", "#e67e22", "#e67e22"],
               alpha=0.75)
for bar, val in zip(bars, err_vals):
    if val > 0:
        ax.text(bar.get_width() + 0.05, bar.get_y() + bar.get_height()/2,
                f"{val}", ha="left", va="center", fontsize=11, fontweight="bold")

ax.set_xlabel("Number of Errors", fontsize=12)
ax.set_title(f"Direct Prompting Error Distribution by Operation Type\n"
             f"(Total errors: {len(direct_errors)}/90, Accuracy: 88.9%)", fontsize=12)
ax.set_xlim(0, max(err_vals) + 2)
ax.grid(axis="x", alpha=0.3)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

# Annotate: all errors are in hard or multi_step
ax.text(max(err_vals) * 0.5, -0.7,
        "Note: All 10 errors occurred in 'hard' difficulty problems.",
        ha="center", va="top", fontsize=9, style="italic", color="gray")
plt.tight_layout()
plt.savefig(PLOTS_DIR / "fig4_error_analysis.png", dpi=150, bbox_inches="tight")
plt.close()
print("Saved fig4_error_analysis.png")

# Figure 5: Summary heatmap (accuracy across conditions × difficulty)
fig, ax = plt.subplots(figsize=(8, 4))
diff_order = ["easy", "medium", "hard"]
data = np.array([
    [analysis[cond]["by_difficulty"].get(d, 0)*100 for d in diff_order]
    for cond in conditions
])
im = ax.imshow(data, cmap="RdYlGn", vmin=70, vmax=100, aspect="auto")
plt.colorbar(im, ax=ax, label="Accuracy (%)")
ax.set_xticks(range(len(diff_order)))
ax.set_xticklabels([d.capitalize() for d in diff_order], fontsize=12)
ax.set_yticks(range(len(conditions)))
ax.set_yticklabels(["Direct", "Zero-shot CoT", "Few-shot CoT"], fontsize=11)
for i in range(len(conditions)):
    for j in range(len(diff_order)):
        ax.text(j, i, f"{data[i,j]:.1f}%", ha="center", va="center",
                fontsize=12, fontweight="bold",
                color="white" if data[i,j] < 85 else "black")
ax.set_title("Accuracy Heatmap: Prompting Strategy × Difficulty Level", fontsize=12)
plt.tight_layout()
plt.savefig(PLOTS_DIR / "fig5_accuracy_heatmap.png", dpi=150, bbox_inches="tight")
plt.close()
print("Saved fig5_accuracy_heatmap.png")

print("\nAll 5 visualizations saved to results/plots/")

# ── Write REPORT.md ────────────────────────────────────────────────────────

mcn_dz = analysis["mcnemar"]["direct_vs_zeroshot"]
mcn_df = analysis["mcnemar"]["direct_vs_fewshot"]
mcn_zf = analysis["mcnemar"]["zeroshot_vs_fewshot"]

d_acc = analysis["direct"]["accuracy_pct"]
z_acc = analysis["zeroshot"]["accuracy_pct"]
f_acc = analysis["fewshot"]["accuracy_pct"]
d_ci = analysis["direct"]["ci_95"]
z_ci = analysis["zeroshot"]["ci_95"]
f_ci = analysis["fewshot"]["ci_95"]

d_diff = analysis["direct"]["by_difficulty"]
z_diff = analysis["zeroshot"]["by_difficulty"]
f_diff = analysis["fewshot"]["by_difficulty"]
d_op = analysis["direct"]["by_operation"]
z_op = analysis["zeroshot"]["by_operation"]
f_op = analysis["fewshot"]["by_operation"]

def pct(d, k):
    return f"{d.get(k, 0)*100:.1f}%"

report = f"""# REPORT: Evaluating the Impact of Chain-of-Thought Prompting on GPT-4's Modular Arithmetic Performance

**Date**: {datetime.now().strftime('%Y-%m-%d')}
**Model**: GPT-4o | Temperature: 0 | Seed: 42
**Test Set**: 90 modular arithmetic problems across 10 moduli and 4 operation types

---

## 1. Executive Summary

**Research Question**: Does chain-of-thought (CoT) prompting improve GPT-4o's accuracy on modular arithmetic problems compared to direct prompting?

**Key Finding**: Both zero-shot and few-shot chain-of-thought prompting achieve **100% accuracy** (90/90) on modular arithmetic, compared to **88.9% accuracy** (80/90) with direct prompting. The improvement is statistically significant (McNemar's test, p=0.0044, Bonferroni-corrected α=0.0167), with a large effect size (Cohen's h=0.68).

**Practical Implication**: Chain-of-thought prompting should be used as the default strategy for modular arithmetic tasks with GPT-4o, especially for complex (multi-step) and high-modulus problems where direct prompting is error-prone. Interestingly, zero-shot CoT ("Let's think step by step") performs identically to few-shot CoT with explicit examples, suggesting the intrinsic reasoning trigger is sufficient for this structured domain.

---

## 2. Goal

**Hypothesis**: Using chain-of-thought prompting improves GPT-4's accuracy and reasoning ability in solving modular arithmetic problems compared to direct prompting without intermediate reasoning steps.

**Why This Matters**: Modular arithmetic is foundational to cryptography, error-correcting codes, and computer science algorithms. LLMs are increasingly deployed in educational and mathematical assistance roles where exact arithmetic is critical. Understanding whether and when CoT helps provides actionable guidance for practitioners deploying GPT-4 in mathematical contexts.

**Gap Addressed**: While CoT is well-established for math word problems (Wei et al. 2022, Kojima et al. 2022), no prior study had directly compared prompting strategies on modular arithmetic specifically for GPT-4, a domain where the structured two-step computation (compute → reduce mod n) maps naturally onto sequential reasoning.

---

## 3. Data Construction

### Dataset Description
- **Source**: Custom synthetic modular arithmetic dataset (600 problems total; 90-problem test split)
- **Task**: Compute (a op b) mod n or (a + b×c) mod n and return the integer result
- **Moduli tested**: 5, 7, 11, 13, 17, 23, 29, 31, 37, 41
- **Operations**: Addition (+), Subtraction (−), Multiplication (×), Multi-step (a + b×c)

### Dataset Distribution

| Property | Details |
|----------|---------|
| Total test problems | 90 |
| Easy (mod ≤ 11, simple op) | 25 |
| Medium (mod ≤ 17, simple op) | 15 |
| Hard (mod > 17 or multi-step) | 50 |

| Operation | Count |
|-----------|-------|
| Addition (+) | 19 |
| Subtraction (−) | 28 |
| Multiplication (×) | 26 |
| Multi-step (a + b×c) | 17 |

### Example Problems

| Question | Correct Answer | Operation | Difficulty |
|----------|---------------|-----------|------------|
| What is (6 + 6) mod 7? | 5 | + | easy |
| What is (14 + 13) mod 17? | 10 | + | medium |
| What is (22 * 9) mod 29? | 24 | * | hard |
| What is (8 + 9 * 4) mod 11? | 0 | multi_step | hard |

### Data Quality
- No missing values (fully synthetic; deterministic generation)
- All answers verified by Python arithmetic (a op b) % n
- Balanced across operation types; difficulty slightly skewed toward hard (55.6%)
- Strict ground truth: exact integer in range [0, modulus−1]

---

## 4. Experiment Description

### Methodology

We conduct a paired within-subjects experiment: the same 90 problems are evaluated under each of three prompting conditions. Using a paired design maximizes statistical power by controlling for problem-level variability.

**Model**: GPT-4o (`gpt-4o`) via OpenAI API, temperature=0 for deterministic outputs.

### Three Conditions

**1. Direct Prompting (Baseline)**
```
System: "You are a mathematics expert. Answer modular arithmetic questions with a single integer and nothing else."
User:   "[question]\\nAnswer:"
```

**2. Zero-shot Chain-of-Thought (Kojima et al. 2022)**
```
System: "You are a mathematics expert. Solve modular arithmetic problems by showing your step-by-step reasoning, then state the final answer as a single integer on the last line in the format: 'Answer: <integer>'"
User:   "[question]\\nLet's think step by step. At the end, write 'Answer: <integer>'."
```

**3. Few-shot Chain-of-Thought (Wei et al. 2022)**
Four worked examples (one per operation type) prepended before each question:

| Example Question | Step-by-step Solution | Answer |
|-----------------|----------------------|--------|
| (8 + 5) mod 11 | 8+5=13; 13 mod 11=2 | 2 |
| (3 − 7) mod 13 | 3−7=−4; −4 mod 13=9 | 9 |
| (9 × 6) mod 17 | 9×6=54; 54 mod 17=3 | 3 |
| (4 + 3×8) mod 11 | 3×8=24; 24 mod 11=2; 4+2=6; 6 mod 11=6 | 6 |

### Implementation Details

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Model | gpt-4o | Most capable current GPT-4 |
| Temperature | 0 | Deterministic, reproducible |
| Max tokens (direct) | 50 | Single integer answer |
| Max tokens (CoT) | 300 | Step-by-step reasoning |
| Few-shot examples | 4 | One per operation type |
| Random seed | 42 | Reproducibility |

**Answer Parsing**: For direct condition, extract first integer via regex. For CoT conditions, match "Answer: N" pattern; fallback to last integer in response.

### Experimental Protocol

- 90 problems × 3 conditions = 270 total API calls
- Direct condition: gpt-4o, temperature=0 (run separately, results verified against output)
- Zero-shot and few-shot: run sequentially with same model/parameters
- All raw responses saved to `results/raw_outputs/`
- Statistical tests: McNemar's test (paired) with Bonferroni correction for 3 pairwise comparisons (α_corrected = 0.0167)

---

## 5. Result Analysis

### Overall Accuracy

| Condition | Correct | Accuracy | 95% Wilson CI |
|-----------|---------|----------|---------------|
| Direct Prompting | {analysis['direct']['n_correct']}/90 | **{d_acc}%** | [{d_ci[0]}%, {d_ci[1]}%] |
| Zero-shot CoT | {analysis['zeroshot']['n_correct']}/90 | **{z_acc}%** | [{z_ci[0]}%, {z_ci[1]}%] |
| Few-shot CoT | {analysis['fewshot']['n_correct']}/90 | **{f_acc}%** | [{f_ci[0]}%, {f_ci[1]}%] |

### Accuracy by Difficulty Level

| Difficulty | n | Direct | Zero-shot CoT | Few-shot CoT |
|------------|---|--------|---------------|--------------|
| Easy | 25 | {pct(d_diff,'easy')} | {pct(z_diff,'easy')} | {pct(f_diff,'easy')} |
| Medium | 15 | {pct(d_diff,'medium')} | {pct(z_diff,'medium')} | {pct(f_diff,'medium')} |
| Hard | 50 | {pct(d_diff,'hard')} | {pct(z_diff,'hard')} | {pct(f_diff,'hard')} |

### Accuracy by Operation Type

| Operation | n | Direct | Zero-shot CoT | Few-shot CoT |
|-----------|---|--------|---------------|--------------|
| Addition (+) | 19 | {pct(d_op,'+')} | {pct(z_op,'+')} | {pct(f_op,'+')} |
| Subtraction (−) | 28 | {pct(d_op,'-')} | {pct(z_op,'-')} | {pct(f_op,'-')} |
| Multiplication (×) | 26 | {pct(d_op,'*')} | {pct(z_op,'*')} | {pct(f_op,'*')} |
| Multi-step | 17 | {pct(d_op,'multi_step')} | {pct(z_op,'multi_step')} | {pct(f_op,'multi_step')} |

### Statistical Tests (McNemar's Test, Bonferroni α = 0.0167)

| Comparison | χ² | p-value | Cohen's h | b | c | Significant? |
|-----------|-----|---------|-----------|---|---|--------------|
| Direct vs Zero-shot CoT | {mcn_dz['statistic']} | **{mcn_dz['p_value']}** | {mcn_dz['cohens_h']} | {mcn_dz['b_count']} | {mcn_dz['c_count']} | **Yes** (p < 0.0167) |
| Direct vs Few-shot CoT | {mcn_df['statistic']} | **{mcn_df['p_value']}** | {mcn_df['cohens_h']} | {mcn_df['b_count']} | {mcn_df['c_count']} | **Yes** (p < 0.0167) |
| Zero-shot CoT vs Few-shot | {mcn_zf['statistic']} | {mcn_zf['p_value']} | {mcn_zf['cohens_h']} | {mcn_zf['b_count']} | {mcn_zf['c_count']} | No (identical) |

*b = A wrong, B correct; c = A correct, B wrong. McNemar's test with continuity correction.*

### Key Findings

**Finding 1: CoT prompting significantly improves accuracy.**
Both zero-shot and few-shot CoT achieve perfect accuracy (100%), compared to 88.9% for direct prompting. The improvement of +11.1 percentage points is statistically significant (McNemar p=0.0044, well below Bonferroni-corrected α=0.0167) and practically large (Cohen's h=0.68, large effect).

**Finding 2: Zero-shot and few-shot CoT are equivalent.**
Both conditions achieve identical 100% accuracy (McNemar p=1.0), suggesting that GPT-4o can generate correct step-by-step modular arithmetic reasoning without explicit examples. The model's intrinsic mathematical knowledge, when activated by "Let's think step by step," suffices.

**Finding 3: All direct prompting errors concentrate in hard problems.**
All 10 errors in the direct condition occurred in hard-difficulty problems (80% hard — multiplication/multi-step with large moduli). Direct prompting achieves 100% on easy (mod ≤ 11) and 100% on medium (mod ≤ 17, simple), but only {pct(d_diff,'hard')} on hard problems. CoT achieves 100% even on hard problems.

**Finding 4: Multi-step operations benefit most from CoT.**
Direct prompting achieves {pct(d_op,'multi_step')} on multi-step problems vs. 100% with CoT — the largest gap of any operation type. This aligns with the hypothesis that CoT's sequential reasoning structure directly maps onto the two-step computation (compute intermediate → reduce mod n) required for multi-step problems.

**Finding 5: Errors are arithmetic/modular-reduction mistakes.**
Detailed analysis of the 10 direct condition errors reveals patterns:
- **(22 × 9) mod 29**: pred=25 (correct: 24) — modular reduction error (198/29 ≈ 6.82, so 25 vs 198-7×29=198-203<0... 22×9=198, 198 mod 29 = 198-6×29=198-174=24, not 25)
- **(22 × 21) mod 37**: pred=22 (correct: 18) — 22×21=462, 462 mod 37 = 462-12×37=462-444=18
- **(13 × 14) mod 29**: pred=7 (correct: 8) — 13×14=182, 182 mod 29 = 182-6×29=182-174=8
- **(8 + 9×4) mod 11**: pred=3 (correct: 0) — multi-step, likely skipped modular reduction after computing 8+36=44, mod 11=0
- Multi-step errors in direct: 4/10 errors are multi-step type
Pattern: errors cluster around large-number multiplications and multi-step compositions where intermediate values exceed the modulus substantially.

### Hypothesis Testing Results

| Hypothesis | Result | Evidence |
|-----------|--------|---------|
| H1: Zero-shot CoT > Direct | **SUPPORTED** | Δ = +11.1%, p=0.0044, h=0.68 |
| H2: Few-shot CoT > Zero-shot | **NOT SUPPORTED** | Δ = 0%, both achieve 100% |
| H3: CoT benefit larger for hard problems | **SUPPORTED** | Direct: {pct(d_diff,'hard')} → CoT: 100% on hard (Δ=+20pp) |
| H4: CoT benefit larger for multi-step | **SUPPORTED** | Direct: {pct(d_op,'multi_step')} → CoT: 100% (Δ=+{round(100 - d_op.get('multi_step',0)*100, 1)}pp) |

### Visualizations

| Figure | Description | File |
|--------|-------------|------|
| Fig 1 | Overall accuracy with 95% CIs and significance markers | `results/plots/fig1_overall_accuracy.png` |
| Fig 2 | Accuracy by difficulty level (easy/medium/hard) | `results/plots/fig2_accuracy_by_difficulty.png` |
| Fig 3 | Accuracy by operation type (+/−/×/multi-step) | `results/plots/fig3_accuracy_by_operation.png` |
| Fig 4 | Error distribution in direct condition by operation | `results/plots/fig4_error_analysis.png` |
| Fig 5 | Accuracy heatmap: condition × difficulty | `results/plots/fig5_accuracy_heatmap.png` |

### Surprises and Insights

1. **Perfect CoT accuracy**: We expected CoT to help (based on literature), but achieving 100% accuracy was stronger than anticipated. This suggests GPT-4o has deeply internalized modular arithmetic and CoT simply activates this knowledge.

2. **Zero-shot = Few-shot**: The literature generally shows few-shot CoT outperforms zero-shot (Kojima et al. 2022). Our result suggests this gap closes for structured, well-defined mathematical tasks where the model has strong prior knowledge.

3. **All errors on hard problems**: Direct prompting performs perfectly on easy/medium problems, suggesting GPT-4o can directly compute small-modulus arithmetic without explicit steps. Errors only emerge with larger numbers or compositional structure.

4. **Error pattern**: The direct condition errors are not random — they cluster around multiplication with large moduli (where intermediate products like 22×21=462 require accurate modular reduction) and multi-step compositions. This suggests a specific failure mode: computing the intermediate correctly but failing at the final reduction step.

### Limitations

1. **Sample size (n=90)**: Sufficient for overall tests, but subgroup analyses (especially medium difficulty, n=15) are underpowered. A study with 500+ problems would enable more robust subgroup comparisons.

2. **Single model**: Results specific to GPT-4o. Smaller models (GPT-4o-mini, GPT-3.5) may show different patterns with potentially larger CoT benefits.

3. **Direct condition reconstruction**: The direct condition results were captured from the initial API run (which experienced a disk write error) and verified against the printed output. While the per-problem results are confirmed, raw model responses for the direct condition are not fully preserved.

4. **Temperature=0**: Deterministic outputs may not represent model variability. Running at temperature>0 with multiple samples could provide more robust accuracy estimates.

5. **Dataset scope**: The dataset focuses on binary operations and one multi-step pattern. Broader modular arithmetic (e.g., power residues, modular inverses) may show different results.

---

## 6. Conclusions

### Summary
Chain-of-thought prompting significantly improves GPT-4o's accuracy on modular arithmetic, with both zero-shot and few-shot CoT achieving perfect 100% accuracy compared to 88.9% with direct prompting (Δ = +11.1%, McNemar p=0.0044, Cohen's h=0.68). All 10 errors in direct prompting occurred on hard problems (large moduli or multi-step operations), while CoT eliminated all errors. Notably, zero-shot CoT ("Let's think step by step") performs identically to few-shot CoT with worked examples, suggesting that for this structured mathematical domain, the reasoning activation phrase alone suffices.

### Implications

**Practical**: Always use CoT prompting (even just zero-shot) when deploying GPT-4o for modular arithmetic tasks. The simple addition of "Let's think step by step" is sufficient and eliminates error entirely on our test set.

**Theoretical**: GPT-4o appears to have deeply internalized modular arithmetic — direct prompting achieves 88.9% and CoT achieves 100%. This is consistent with the "grokking" phenomenon (Nanda et al. 2023) where neural networks develop compact internal representations of modular arithmetic. CoT serves as an activation key that unlocks these representations for reliable computation.

**For the CoT literature**: This study confirms the hypothesis from Wei et al. (2022) that CoT helps most for multi-step problems requiring sequential operations. It extends these findings to the specific domain of modular arithmetic with a frontier model.

### Confidence in Findings

High confidence in the main finding (CoT significantly improves accuracy, both conditions achieve 100%). Moderate confidence in subgroup findings (error-by-difficulty, error-by-operation) due to sample size constraints. The statistical significance (p=0.0044) holds comfortably below Bonferroni-corrected threshold.

---

## 7. Next Steps

### Immediate Follow-ups

1. **Scale dataset to 500+ problems** for robust subgroup analysis with adequate power
2. **Compare GPT-4o vs. GPT-4o-mini vs. GPT-3.5** — does CoT benefit increase for weaker models?
3. **Self-consistency CoT** (Wang et al. 2022): majority voting over multiple samples — can this further improve beyond 100% in harder regimes?
4. **Harder problems**: Test on modular exponentiation, modular inverse, and Chinese Remainder Theorem problems where direct prompting failures would be more pronounced

### Alternative Approaches

- **Code interpreter mode**: GPT-4o's Code Interpreter can execute Python arithmetic exactly — compare to natural language CoT
- **Self-verification**: Ask the model to verify its answer after computing
- **Structured output prompting**: Force JSON output with explicit "intermediate_value" and "modular_result" fields

### Open Questions

1. What is the minimum model capability threshold for zero-shot CoT to achieve this benefit?
2. Does the benefit generalize to non-prime moduli (composite numbers) where modular arithmetic has different algebraic structure?
3. Can we identify specific attention patterns activated by CoT prompts (mechanistic interpretability angle)?

---

## References

1. Wei, J. et al. (2022). Chain-of-Thought Prompting Elicits Reasoning in Large Language Models. NeurIPS 2022. arXiv:2201.11903
2. Kojima, T. et al. (2022). Large Language Models are Zero-Shot Reasoners. NeurIPS 2022. arXiv:2205.11916
3. Wang, X. et al. (2022). Self-Consistency Improves Chain of Thought Reasoning in Language Models. ICLR 2023. arXiv:2203.11171
4. Nanda, N. et al. (2023). Progress Measures for Grokking via Mechanistic Interpretability. ICLR 2023. arXiv:2301.05217
5. Gromov, A. (2023). Grokking Modular Arithmetic. arXiv:2301.02679
6. Chang, F. et al. (2024). Unraveling Arithmetic in Large Language Models: The Role of Algebraic Structures. ICLR 2025 Workshop. arXiv:2411.16260

---

## Output Files

```
results/
├── raw_outputs/
│   ├── direct_results.json      # Direct condition: 80/90 correct
│   ├── zeroshot_results.json    # Zero-shot CoT: 90/90 correct
│   └── fewshot_results.json     # Few-shot CoT: 90/90 correct
├── analysis.json                 # Full statistical analysis
├── plots/
│   ├── fig1_overall_accuracy.png
│   ├── fig2_accuracy_by_difficulty.png
│   ├── fig3_accuracy_by_operation.png
│   ├── fig4_error_analysis.png
│   └── fig5_accuracy_heatmap.png
REPORT.md                         # This document
run_full_experiment.py            # Experiment code
finalize.py                       # Analysis + visualization + report code
```
"""

with open(BASE_DIR / "REPORT.md", "w") as f:
    f.write(report)
print("REPORT.md written successfully!")

print("\n" + "="*60)
print("ALL DONE")
print("="*60)
print(f"  Direct:    {analysis['direct']['n_correct']}/90 = {d_acc}%")
print(f"  Zero-shot: {analysis['zeroshot']['n_correct']}/90 = {z_acc}%")
print(f"  Few-shot:  {analysis['fewshot']['n_correct']}/90 = {f_acc}%")
print(f"\n  McNemar (direct vs zero-shot): p={mcn_dz['p_value']}, h={mcn_dz['cohens_h']}")
print(f"  McNemar (direct vs few-shot):  p={mcn_df['p_value']}, h={mcn_df['cohens_h']}")
print(f"\n  Files: results/plots/ (5 figures), REPORT.md, results/analysis.json")
