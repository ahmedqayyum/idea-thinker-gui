"""Multi-provider LLM chat with tool calling. Stub for scaffold phase."""

from __future__ import annotations
from typing import Any, AsyncIterator
import os
import json


TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "create_idea",
            "description": "Create a new research idea from title, domain, and hypothesis.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "domain": {"type": "string"},
                    "hypothesis": {"type": "string"},
                },
                "required": ["title", "domain", "hypothesis"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_ideas",
            "description": "List all submitted research ideas and their statuses.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_pipeline_status",
            "description": "Get the current pipeline stage statuses for a given idea.",
            "parameters": {
                "type": "object",
                "properties": {"idea_id": {"type": "string"}},
                "required": ["idea_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_pipeline",
            "description": "Start or resume the research pipeline for an idea.",
            "parameters": {
                "type": "object",
                "properties": {
                    "idea_id": {"type": "string"},
                    "provider": {"type": "string", "default": "claude"},
                },
                "required": ["idea_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_artifact",
            "description": "Read a file from the research workspace (markdown, code, JSON).",
            "parameters": {
                "type": "object",
                "properties": {
                    "idea_id": {"type": "string"},
                    "file_path": {"type": "string"},
                },
                "required": ["idea_id", "file_path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_quality_report",
            "description": "Get the quality evaluation summary for an idea.",
            "parameters": {
                "type": "object",
                "properties": {"idea_id": {"type": "string"}},
                "required": ["idea_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "fork_from_stage",
            "description": "Fork the pipeline from a given stage into a new research thread.",
            "parameters": {
                "type": "object",
                "properties": {
                    "idea_id": {"type": "string"},
                    "stage": {"type": "string"},
                },
                "required": ["idea_id", "stage"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "nudge_direction",
            "description": "Add comments or modify the idea spec to nudge future research direction.",
            "parameters": {
                "type": "object",
                "properties": {
                    "idea_id": {"type": "string"},
                    "comments": {"type": "string"},
                },
                "required": ["idea_id", "comments"],
            },
        },
    },
]


def _detect_provider() -> str:
    if os.getenv("ANTHROPIC_API_KEY"):
        return "anthropic"
    if os.getenv("OPENAI_API_KEY"):
        return "openai"
    if os.getenv("GOOGLE_API_KEY"):
        return "google"
    return "none"


async def stream_chat(
    messages: list[dict],
    provider: str | None = None,
) -> AsyncIterator[str]:
    """Stream chat completions. Yields SSE-formatted strings."""
    provider = provider or _detect_provider()

    if provider == "openai" and os.getenv("OPENAI_API_KEY"):
        async for chunk in _stream_openai(messages):
            yield chunk
    elif provider == "anthropic" and os.getenv("ANTHROPIC_API_KEY"):
        async for chunk in _stream_anthropic(messages):
            yield chunk
    else:
        yield f"data: {json.dumps({'error': 'No LLM provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.'})}\n\n"
        yield "data: [DONE]\n\n"


async def _stream_openai(messages: list[dict]) -> AsyncIterator[str]:
    from openai import OpenAI
    client = OpenAI()
    oai_messages = [{"role": m["role"], "content": m["content"]} for m in messages]
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=oai_messages,
        stream=True,
    )
    for chunk in response:
        delta = chunk.choices[0].delta if chunk.choices else None
        if delta and delta.content:
            yield f"data: {json.dumps({'content': delta.content})}\n\n"
    yield "data: [DONE]\n\n"


async def _stream_anthropic(messages: list[dict]) -> AsyncIterator[str]:
    import anthropic
    client = anthropic.Anthropic()
    ant_messages = [{"role": m["role"], "content": m["content"]} for m in messages if m["role"] != "system"]
    system_msg = next((m["content"] for m in messages if m["role"] == "system"), "You are a helpful research assistant.")
    with client.messages.stream(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=system_msg,
        messages=ant_messages,
    ) as stream:
        for text in stream.text_stream:
            yield f"data: {json.dumps({'content': text})}\n\n"
    yield "data: [DONE]\n\n"
