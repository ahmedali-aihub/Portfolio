"""
Deterministic overrides for a small number of high-value, unambiguous
intents — currently just "how do I contact Ahmed".

Free-tier LLMs are inconsistent about reliably surfacing contact details
even when the exact phone/GitHub/LinkedIn are handed to them in context
with explicit instructions to share them (verified: retrieval and prompt
construction are both correct; the model itself is the unreliable part).
For a query this common and this unambiguous — there's exactly one right
answer — it's not worth the hallucination/omission risk of trusting a
free model's mood that turn. Everything else still goes through the full
RAG + LLM pipeline; this only intercepts contact-intent questions.
"""

import re

from app.knowledge_base import PROFILE

CONTACT_KEYWORDS = re.compile(
    r"\b(contact|reach|email|e-mail|phone|call|touch base|get in touch|connect with)\b",
    re.IGNORECASE,
)


def is_contact_intent(message: str) -> bool:
    return bool(CONTACT_KEYWORDS.search(message))


def contact_answer() -> str:
    return (
        "You can reach Ahmed directly:\n\n"
        f"- **Phone:** {PROFILE['phone']}\n"
        f"- **GitHub:** {PROFILE['github']}\n"
        f"- **LinkedIn:** {PROFILE['linkedin']}\n\n"
        f"He's based in {PROFILE['location']}."
    )
