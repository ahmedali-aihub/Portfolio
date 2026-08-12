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
# automatically. OpenRouter's free-model lineup rotates — check
# https://openrouter.ai/models?max_price=0 and update this list if any
# of these stop resolving.
FALLBACK_MODELS = [
    m.strip()
    for m in os.getenv(
        "OPENROUTER_MODELS",
        "google/gemma-4-26b-a4b-it:free,"
        "openai/gpt-oss-20b:free,"
        "nvidia/nemotron-nano-9b-v2:free,"
        "google/gemma-4-31b-it:free,"
        "openrouter/free",
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

MAX_MESSAGE_LENGTH = 600
MAX_HISTORY_MESSAGES = 8
RATE_LIMIT_PER_MINUTE = 12
