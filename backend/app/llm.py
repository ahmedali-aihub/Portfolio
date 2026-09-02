"""
OpenRouter chat client with an automatic free-model fallback chain.

Free OpenRouter models are rate-limited per-model and occasionally taken
offline without notice, so a single hardcoded model is not reliable for
a public-facing demo. This tries each model in FALLBACK_MODELS in order
and moves to the next one on any failure *before* it has started
streaming real content back to the client. Once a model has actually
started producing tokens, we commit to it — switching mid-stream would
mean stitching together two different partial answers, which is worse
than just surfacing the error.
"""

import json
import logging
import re
import time
from collections.abc import AsyncIterator

import httpx

from app.config import FALLBACK_MODELS, OPENROUTER_API_KEY, OPENROUTER_URL, SITE_NAME, SITE_URL

SYSTEM_PROMPT = (
    "You are the AI assistant embedded in Ahmed Ali's personal portfolio website. "
    "You answer visitor questions about Ahmed — his skills, experience, projects, and a "
    "few personal details like his age and hobbies — speaking about him in the third "
    "person, in a friendly, concise, conversational tone. Only use the context provided "
    "below; if something isn't covered in it, say plainly that you don't have that "
    "information rather than guessing or inventing details. Keep answers short (2-4 "
    "sentences) unless the visitor asks for a list, in which case use markdown bullets.\n\n"
    "If the context below includes a phone number, GitHub URL, or LinkedIn URL, treat that "
    "as information Ahmed has explicitly published for visitors to use — always state it "
    "directly and completely when asked anything about contacting, reaching, emailing, or "
    "getting in touch with him. Never withhold it, hedge, or suggest the visitor look "
    "elsewhere when the answer is already present in the context."
)


logger = logging.getLogger("portfolio.chat")

# A free model can sit silent for a while before its first token, so the
# read timeout has to be generous — but the whole fallback chain still
# needs to finish before the browser gives up on the request.
REQUEST_TIMEOUT = httpx.Timeout(60.0, connect=10.0, read=60.0, write=15.0)
CHAIN_DEADLINE = 65.0


class AllModelsUnavailable(Exception):
    pass


# Free models occasionally return their internal moderation verdict or
# reasoning scratchpad as if it were the chat answer, instead of an
# actual response, e.g.:
#   "User Safety: unsafe\nSafety Categories: PII/Privacy..."
#   "Here's a thinking process:\n1. Analyze User Input..."
# Checked against the first buffered chunk of a response, before any of
# it reaches the visitor — cheap prefix/substring checks, not a full
# classifier, since this only has to catch the shapes actually observed.
_REJECT_PATTERNS = [
    re.compile(r"^\s*user safety\s*:", re.IGNORECASE),
    re.compile(r"^\s*safety categories\s*:", re.IGNORECASE),
    re.compile(r"^\s*\**\s*here'?s a thinking process\b", re.IGNORECASE),
    re.compile(r"^\s*\**\s*(let me |i need to |i'll |i will )?(think|analyze)\b.*:\s*$", re.IGNORECASE | re.MULTILINE),
]
_PEEK_CHARS = 400


def _looks_like_bad_output(buffered: str) -> bool:
    return any(p.search(buffered[:_PEEK_CHARS]) for p in _REJECT_PATTERNS)


def _build_payload(model: str, messages: list[dict]) -> dict:
    return {
        "model": model,
        "messages": messages,
        "stream": True,
        "temperature": 0.4,
        "max_tokens": 500,
    }


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": SITE_URL,
        "X-Title": SITE_NAME,
    }


async def stream_chat(user_message: str, context_chunks: list[str], history: list[dict]) -> AsyncIterator[dict]:
    context_text = "\n".join(f"- {c}" for c in context_chunks)
    messages = [
        {"role": "system", "content": f"{SYSTEM_PROMPT}\n\nContext about Ahmed:\n{context_text}"},
        *history,
        {"role": "user", "content": user_message},
    ]

    errors: list[str] = []
    started = time.monotonic()

    for model in FALLBACK_MODELS:
        # Stop starting new attempts once the client is about to time out —
        # better to report the failure than to hang with no answer at all.
        if time.monotonic() - started > CHAIN_DEADLINE:
            errors.append("fallback chain deadline reached")
            break

        got_any = False
        committed = False  # past the shape-check, actively streaming to the visitor
        buffered = ""
        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
                async with client.stream(
                    "POST", OPENROUTER_URL, headers=_headers(), json=_build_payload(model, messages)
                ) as response:
                    if response.status_code != 200:
                        body = (await response.aread())[:200].decode(errors="ignore")
                        errors.append(f"{model} -> HTTP {response.status_code}: {body}")
                        continue

                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data:"):
                            continue
                        data = line[len("data:"):].strip()
                        if data == "[DONE]":
                            break
                        try:
                            obj = json.loads(data)
                        except json.JSONDecodeError:
                            continue
                        delta = obj.get("choices", [{}])[0].get("delta", {}).get("content")
                        if not delta:
                            continue
                        got_any = True

                        if committed:
                            yield {"type": "delta", "text": delta, "model": model}
                            continue

                        buffered += delta
                        if _looks_like_bad_output(buffered):
                            errors.append(f"{model} -> rejected: looked like a moderation/reasoning artifact, not an answer")
                            logger.warning("model %s produced a malformed answer, falling through", model)
                            buffered = ""
                            break
                        if len(buffered) >= _PEEK_CHARS:
                            # Cleared the peek window without tripping a
                            # pattern — safe to commit and stream the rest live.
                            committed = True
                            yield {"type": "delta", "text": buffered, "model": model}
                            buffered = ""

            if committed:
                yield {"type": "done", "model": model}
                return
            if buffered:
                # Stream ended (e.g. a short answer) before hitting the peek
                # window, and it never tripped a reject pattern — it's a
                # complete, validated answer, just never flushed yet.
                yield {"type": "delta", "text": buffered, "model": model}
                yield {"type": "done", "model": model}
                return
            if got_any:
                # Content arrived but was discarded as malformed — treat like
                # any other failed attempt and fall through to the next model.
                continue
            errors.append(f"{model} -> no content returned")
            logger.warning("model %s returned no content, falling through", model)

        except Exception as exc:  # noqa: BLE001 - deliberately broad, this is a best-effort fallback chain
            if committed:
                # Already streamed real content for this model — don't
                # silently retry another one and stitch answers together.
                yield {"type": "done", "model": model, "interrupted": True}
                return
            errors.append(f"{model} -> {type(exc).__name__}: {exc}")
            logger.warning("model %s failed (%s), trying next", model, type(exc).__name__)
            continue

    raise AllModelsUnavailable("; ".join(errors) or "no models configured")
