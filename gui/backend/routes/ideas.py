"""CRUD for research ideas."""

from fastapi import APIRouter, HTTPException
from models.schemas import CreateIdeaRequest, IdeaSummary, IdeaDetail
from services.pipeline_service import PipelineService
from services.idea_converter import convert_prompt_to_idea

router = APIRouter()
_svc = PipelineService()


@router.post("")
async def create_idea(req: CreateIdeaRequest):
    if req.prompt:
        idea_spec = convert_prompt_to_idea(req.prompt)
    elif req.yaml_content:
        import yaml
        idea_spec = yaml.safe_load(req.yaml_content)
    elif req.url:
        idea_spec = convert_prompt_to_idea(f"Research idea from: {req.url}")
    else:
        raise HTTPException(400, "Provide prompt, yaml_content, or url")

    try:
        idea_id = _svc.submit_idea(idea_spec)
    except ValueError as e:
        raise HTTPException(422, str(e))

    return {"idea_id": idea_id, "idea": idea_spec.get("idea", {})}


@router.get("")
async def list_ideas(status: str | None = None, pipeline_completed: bool | None = None):
    ideas = _svc.list_ideas(status=status)
    if pipeline_completed is not None:
        enriched = []
        for idea in ideas:
            ps = _svc.get_pipeline_state(idea["idea_id"])
            idea["pipeline_completed"] = ps.get("completed", False)
            enriched.append(idea)
        ideas = [i for i in enriched if i["pipeline_completed"] == pipeline_completed]
    return ideas


@router.get("/{idea_id}")
async def get_idea(idea_id: str):
    idea = _svc.get_idea(idea_id)
    if not idea:
        raise HTTPException(404, "Idea not found")
    pipeline_state = _svc.get_pipeline_state(idea_id)
    idea_spec = idea.get("idea", {})
    metadata = idea_spec.get("metadata", {})
    return {
        "idea_id": metadata.get("idea_id", idea_id),
        "title": idea_spec.get("title", ""),
        "domain": idea_spec.get("domain", ""),
        "hypothesis": idea_spec.get("hypothesis", ""),
        "status": metadata.get("status", "submitted"),
        "created_at": metadata.get("created_at", ""),
        "pipeline_state": pipeline_state,
        "metadata": metadata,
    }
