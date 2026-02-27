"""WebSocket for live pipeline updates."""

import asyncio
import json
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.pipeline_service import PipelineService

router = APIRouter()
_svc = PipelineService()


@router.websocket("/ws/pipeline/{idea_id}")
async def pipeline_ws(websocket: WebSocket, idea_id: str):
    await websocket.accept()
    last_state = None
    try:
        while True:
            state = _svc.get_pipeline_state(idea_id)
            state_str = json.dumps(state, default=str)
            if state_str != last_state:
                await websocket.send_text(state_str)
                last_state = state_str
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        pass
    except Exception:
        await websocket.close()
