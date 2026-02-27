"""Pipeline control, stage status, and forking."""

from fastapi import APIRouter, HTTPException
from models.schemas import RunPipelineRequest, ForkRequest
from services.pipeline_service import PipelineService

router = APIRouter()
_svc = PipelineService()


@router.get("/{idea_id}/pipeline")
async def get_pipeline_status(idea_id: str):
    state = _svc.get_pipeline_state(idea_id)
    if "error" in state:
        raise HTTPException(404, state["error"])
    return state


@router.post("/{idea_id}/run")
async def run_pipeline(idea_id: str, req: RunPipelineRequest):
    idea = _svc.get_idea(idea_id)
    if not idea:
        raise HTTPException(404, "Idea not found")
    result = _svc.run_pipeline_async(
        idea_id=idea_id,
        provider=req.provider,
        timeout=req.timeout,
        full_permissions=req.full_permissions,
        write_paper=req.write_paper,
        paper_style=req.paper_style,
    )
    return result


@router.post("/{idea_id}/fork/{stage}")
async def fork_from_stage(idea_id: str, stage: str, req: ForkRequest = ForkRequest()):
    try:
        result = _svc.fork_from_stage(idea_id, stage, provider=req.provider or "claude")
    except ValueError as e:
        raise HTTPException(404, str(e))
    return result
