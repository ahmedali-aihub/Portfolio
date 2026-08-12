import asyncio
import json

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.config import ALLOWED_ORIGINS, MAX_HISTORY_MESSAGES, MAX_MESSAGE_LENGTH, OPENROUTER_API_KEY
from app.intents import contact_answer, is_contact_intent
from app.llm import AllModelsUnavailable, stream_chat
from app.rate_limit import check_rate_limit
from app.retrieval import retriever

app = FastAPI(title="Ahmed Ali Portfolio RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=MAX_MESSAGE_LENGTH)
    history: list[ChatMessage] = Field(default_factory=list)


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "api_key_configured": bool(OPENROUTER_API_KEY),
        "documents_indexed": len(retriever.documents),
    }


@app.post("/api/chat")
async def chat(payload: ChatRequest, request: Request, _: None = Depends(check_rate_limit)):
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=503, detail="OPENROUTER_API_KEY is not configured on the server.")

    history = [m.model_dump() for m in payload.history[-MAX_HISTORY_MESSAGES:]]

    if is_contact_intent(payload.message):

        async def contact_stream():
            for word in contact_answer().split(" "):
                yield f"data: {json.dumps({'type': 'delta', 'text': word + ' '})}\n\n"
                await asyncio.sleep(0.02)
            yield f"data: {json.dumps({'type': 'done', 'model': None})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(contact_stream(), media_type="text/event-stream")

    context_chunks = retriever.retrieve(payload.message)

    async def event_stream():
        try:
            async for chunk in stream_chat(payload.message, context_chunks, history):
                yield f"data: {json.dumps(chunk)}\n\n"
        except AllModelsUnavailable as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
