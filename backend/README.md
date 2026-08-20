# Portfolio RAG API

A small FastAPI service that answers visitor questions about Ahmed Ali
(skills, experience, projects) using retrieval-augmented generation over
a hand-written knowledge base, calling OpenRouter's free-tier models
with automatic fallback.

## How it works

1. `app/knowledge_base.py` holds the source facts about Ahmed, chunked
   into short documents.
2. `app/retrieval.py` builds a TF-IDF index over those chunks at
   startup. Each incoming question is scored against it and the top
   matches are pulled as context — no embeddings/vector DB needed at
   this corpus size.
3. `app/llm.py` sends the question + retrieved context to OpenRouter,
   streaming the response back token by token. If a model errors, is
   rate-limited, or returns nothing, it automatically retries the next
   model in `OPENROUTER_MODELS` — without ever mixing partial answers
   from two different models.
4. `app/main.py` exposes `POST /api/chat` (Server-Sent Events stream)
   and `GET /api/health`, with basic per-IP rate limiting.

## Local setup

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash; use .venv\Scripts\activate on cmd/PowerShell
pip install -r requirements.txt
cp .env.example .env
# then edit .env and paste your free key from https://openrouter.ai/keys
uvicorn app.main:app --reload --port 8003
```

Check it's alive: `curl http://localhost:8003/api/health`

Port 8003 matters: the frontend's `ChatBot.jsx` falls back to
`http://localhost:8003` when `VITE_API_URL` is unset. Run it elsewhere
and the widget reports "I couldn't connect to the assistant backend."


## Updating the knowledge base

Edit `app/knowledge_base.py` directly. It's a plain Python mirror of
`src/data/content.js` on the frontend — there's no automatic sync, so
update both when Ahmed's info changes. To add hobbies (currently
omitted so the bot doesn't invent them), add a new document to the
list returned by `build_documents()`.

## Deploying

This is a stateless single-process service — Render, Railway, Fly.io's
free tiers, or a small VPS all work. Whatever you use:

- Set `OPENROUTER_API_KEY`, `OPENROUTER_MODELS`, and `ALLOWED_ORIGINS`
  (your deployed frontend's real origin, not just localhost) as
  environment variables.
- The rate limiter is in-memory and per-process — fine for a single
  worker, but won't coordinate across multiple instances/workers. Not a
  concern until this gets meaningfully more traffic than a portfolio
  site usually sees.
- Free OpenRouter models rotate. If every fallback starts failing,
  check https://openrouter.ai/models?max_price=0 for current free
  slugs and update `OPENROUTER_MODELS`.
