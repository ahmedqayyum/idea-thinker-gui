"""Chat completions with tool calling."""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from models.schemas import ChatRequest
from services.chat_service import stream_chat

router = APIRouter()


@router.post("")
async def chat(req: ChatRequest):
    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    return StreamingResponse(
        stream_chat(messages, provider=req.provider),
        media_type="text/event-stream",
    )
