"""Pydantic models for the Research Canvas API."""

from __future__ import annotations
from typing import Optional, Any
from pydantic import BaseModel


class CreateIdeaRequest(BaseModel):
    prompt: Optional[str] = None
    yaml_content: Optional[str] = None
    url: Optional[str] = None


class IdeaSummary(BaseModel):
    idea_id: str
    title: str
    domain: str
    status: str
    created_at: str


class IdeaDetail(BaseModel):
    idea_id: str
    title: str
    domain: str
    hypothesis: str
    status: str
    created_at: str
    pipeline_state: Optional[dict[str, Any]] = None
    metadata: Optional[dict[str, Any]] = None


class StageStatus(BaseModel):
    name: str
    status: str  # pending | in_progress | completed | failed
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    success: Optional[bool] = None
    outputs: Optional[dict[str, Any]] = None


class PipelineStatus(BaseModel):
    idea_id: str
    current_stage: Optional[str] = None
    completed: bool = False
    stages: dict[str, StageStatus] = {}


class RunPipelineRequest(BaseModel):
    provider: str = "claude"
    timeout: int = 3600
    full_permissions: bool = True
    write_paper: bool = False
    paper_style: Optional[str] = None


class ArtifactInfo(BaseModel):
    path: str
    name: str
    is_dir: bool
    size: Optional[int] = None


class ChatMessage(BaseModel):
    role: str  # user | assistant | system | tool
    content: str
    tool_call_id: Optional[str] = None
    tool_calls: Optional[list[dict[str, Any]]] = None


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    idea_id: Optional[str] = None
    stage: Optional[str] = None
    provider: Optional[str] = None


class ExampleIdea(BaseModel):
    filename: str
    title: str
    domain: str
    hypothesis: str


class DefaultsResponse(BaseModel):
    examples: list[ExampleIdea]
    domains: list[str]


class ForkRequest(BaseModel):
    provider: Optional[str] = "claude"
