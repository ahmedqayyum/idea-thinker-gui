"""
Research Agent Instructions Generator

Generates session instructions for the research agent based on
the prompt, working directory, and configuration options.
"""


def generate_instructions(
    prompt: str,
    work_dir: str,
    use_scribe: bool = False,
    domain: str = "general",
) -> str:
    """Generate session instructions for a research agent.

    Args:
        prompt: The full research prompt.
        work_dir: Absolute path to the workspace directory.
        use_scribe: Whether to use notebook/scribe mode.
        domain: Research domain (e.g. 'artificial_intelligence').

    Returns:
        A formatted instruction string for the agent session.
    """
    mode = "Jupyter notebooks (scribe mode)" if use_scribe else "Python scripts and the command line"

    return f"""You are a research assistant working on the following research project.

## Research Prompt

{prompt}

## Working Directory

All your work should be done in: {work_dir}

## Domain

This research is in the domain of: {domain.replace('_', ' ')}

## Instructions

1. Read the research prompt carefully and understand the hypothesis.
2. Review any existing resources in the working directory (literature reviews, datasets, code).
3. Design and implement experiments to test the hypothesis using {mode}.
4. Write clean, well-documented code with clear variable names.
5. Save all results, figures, and analysis to the working directory.
6. Create a REPORT.md summarizing your findings, methodology, and conclusions.
7. Be thorough but efficient -- focus on the core hypothesis.

## Output Requirements

- All code in {work_dir}
- A REPORT.md with structured findings
- Any generated data or figures saved to results/
- Clear documentation of methodology and results
"""
