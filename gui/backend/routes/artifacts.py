"""Workspace file reading."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from services.pipeline_service import PipelineService
from services import artifact_service
import mimetypes

router = APIRouter()
_svc = PipelineService()


@router.get("/{idea_id}/artifacts")
async def list_artifacts(idea_id: str, path: str = ""):
    workspace = _svc.get_workspace_path(idea_id)
    if not workspace:
        raise HTTPException(404, "Workspace not found")
    return artifact_service.list_artifacts(workspace, path)


@router.get("/{idea_id}/artifacts-raw/{file_path:path}")
async def raw_artifact(idea_id: str, file_path: str):
    """Serve a workspace file as-is with its native MIME type (for PDFs, images, etc.)."""
    workspace = _svc.get_workspace_path(idea_id)
    if not workspace:
        raise HTTPException(404, "Workspace not found")
    resolved = artifact_service.resolve_artifact_path(workspace, file_path)
    if resolved is None:
        raise HTTPException(404, "File not found")

    media_type, _ = mimetypes.guess_type(str(resolved))

    return FileResponse(
        resolved,
        filename=resolved.name,
        media_type=media_type,
        content_disposition_type="inline",
    )


@router.get("/{idea_id}/artifacts/{file_path:path}")
async def read_artifact(idea_id: str, file_path: str):
    workspace = _svc.get_workspace_path(idea_id)
    if not workspace:
        raise HTTPException(404, "Workspace not found")
    content = artifact_service.read_artifact(workspace, file_path)
    if content is None:
        raise HTTPException(404, "File not found")
    return {"path": file_path, "content": content}
