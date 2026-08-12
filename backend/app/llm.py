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
from collections.abc import AsyncIterator

import httpx

from app.config import FALLBACK_MODELS, OPENROUTER_API_KEY, OPENROUTER_URL, SITE_NAME, SITE_URL

SYSTEM_PROMPT = (
    "You are the AI assistant embedded in Ahmed Ali's personal portfolio website. "
    "You answer visitor questions about Ahmed — his skills, experience, and projects — "
    "speaking about him in the third person, in a friendly, concise, conversational tone. "
    "Only use the context provided below; if something isn't covered in it (for example, "
    "personal hobbies that haven't been published yet), say plainly that you don't have "
    "that information rather than guessing or inventing details. Keep answers short (2-4 "
    "sentences) unless the visitor asks for a list, in which case use markdown bullets.\n\n"
    "If the context below includes a phone number, GitHub URL, or LinkedIn URL, treat that "
    "as information Ahmed has explicitly published for visitors to use — always state it "
    "directly and completely when asked anything about contacting, reaching, emailing, or "
    "getting in touch with him. Never withhold it, hedge, or suggest the visitor look "
    "elsewhere when the answer is already present in the context."
)


class AllModelsUnavailable(Exception):
    pass


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

    for model in FALLBACK_MODELS:
        got_any = False
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=10.0)) as client:
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
                        if delta:
                            got_any = True
                            yield {"type": "delta", "text": delta, "model": model}

            if got_any:
                yield {"type": "done", "model": model}
                return
            errors.append(f"{model} -> no content returned")

        except Exception as exc:  # noqa: BLE001 - deliberately broad, this is a best-effort fallback chain
            if got_any:
                # Already streamed real content for this model — don't
                # silently retry another one and stitch answers together.
                yield {"type": "done", "model": model, "interrupted": True}
                return
            errors.append(f"{model} -> {exc}")
            continue

    raise AllModelsUnavailable("; ".join(errors) or "no models configured")
