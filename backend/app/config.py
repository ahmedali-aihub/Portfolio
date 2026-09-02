import os

from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Optional but recommended by OpenRouter for attributing/ranking traffic.
SITE_URL = os.getenv("SITE_URL", "http://localhost:5173")
SITE_NAME = os.getenv("SITE_NAME", "Ahmed Ali Portfolio")

# Ordered fallback chain of free-tier OpenRouter models. If a model is
# rate-limited, errors, or is temporarily removed, the next one is tried
# automatically. OpenRouter's free-model lineup rotates fast — verified
# live against https://openrouter.ai/api/v1/models on 2026-08-20;
# "openai/gpt-oss-20b:free" and "nvidia/nemotron-nano-9b-v2:free" had
# already been pulled from the free tier as of that check and are gone
# from this list. Re-verify at https://openrouter.ai/models?max_price=0
# if answers start failing.
#
# Deliberately excludes "openrouter/free" — it's a meta-router to whatever
# free model OpenRouter picks that day, and has been observed streaming
# its raw chain-of-thought or a safety-classifier verdict ("User Safety:
# unsafe...") as if it were the answer. Named models below are checked
# against llm.py's output-shape guard regardless, but a router with no
# fixed identity isn't worth the fallback slot.
FALLBACK_MODELS = [
    m.strip()
    for m in os.getenv(
        "OPENROUTER_MODELS",
        "google/gemma-4-26b-a4b-it:free,"
        "google/gemma-4-31b-it:free,"
        "nvidia/nemotron-3.5-lightning:free,"
        "liquid/lfm-2.5-2.6b:free",
    ).split(",")
    if m.strip()
]

# CORS — the local Vite dev origin plus whatever the deployed frontend
# origin ends up being (set via env once you know it).
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]

# Any localhost/127.0.0.1 port, so a Vite dev server that moved to 5174
# still passes CORS. Deployed origins must be listed in ALLOWED_ORIGINS.
LOCAL_ORIGIN_REGEX = r"^http://(localhost|127\.0\.0\.1):\d+$"

MAX_MESSAGE_LENGTH = 600
MAX_HISTORY_MESSAGES = 8
RATE_LIMIT_PER_MINUTE = 12
