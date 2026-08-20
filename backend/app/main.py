import asyncio
import json
import logging

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.config import (
    ALLOWED_ORIGINS,
    LOCAL_ORIGIN_REGEX,
    MAX_HISTORY_MESSAGES,
    MAX_MESSAGE_LENGTH,
    OPENROUTER_API_KEY,
)
from app.intents import contact_answer, is_contact_intent
from app.llm import AllModelsUnavailable, stream_chat
from app.rate_limit import check_rate_limit
from app.retrieval import retriever

logger = logging.getLogger("portfolio.chat")

app = FastAPI(title="Ahmed Ali Portfolio RAG API")

# The regex covers any localhost/127.0.0.1 port so a dev server that
# shifted off 5173 (Vite picks the next free port automatically) doesn't
# fail CORS preflight — which surfaces in the browser as an unreachable
# backend rather than as a CORS error.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=LOCAL_ORIGIN_REGEX,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Proxies (nginx, Render) buffer responses by default, which stalls SSE
# until the whole answer is done — these headers opt out of that.
SSE_HEADERS = {
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


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

    # Drop anything the model can't use: blank turns and roles it doesn't
    # understand (an error bubble replayed as "assistant" derails answers).
    history = [
        m.model_dump()
        for m in payload.history[-MAX_HISTORY_MESSAGES:]
        if m.role in ("user", "assistant") and m.content.strip()
    ]

    if is_contact_intent(payload.message):

        async def contact_stream():
            for word in contact_answer().split(" "):
                yield f"data: {json.dumps({'type': 'delta', 'text': word + ' '})}\n\n"
                await asyncio.sleep(0.02)
            yield f"data: {json.dumps({'type': 'done', 'model': None})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(contact_stream(), media_type="text/event-stream", headers=SSE_HEADERS)

    context_chunks = retriever.retrieve(payload.message)

    async def event_stream():
        try:
            async for chunk in stream_chat(payload.message, context_chunks, history):
                yield f"data: {json.dumps(chunk)}\n\n"
        except AllModelsUnavailable as exc:
            logger.warning("all models unavailable: %s", exc)
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
        except asyncio.CancelledError:
            # Visitor closed the tab or navigated away mid-answer.
            raise
        except Exception as exc:  # noqa: BLE001 - never die mid-stream
            # Without this the response simply stops, and the browser
            # reports the dropped connection as "backend not running".
            logger.exception("chat stream failed")
            yield f"data: {json.dumps({'type': 'error', 'message': f'unexpected server error: {exc}'})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=SSE_HEADERS)
