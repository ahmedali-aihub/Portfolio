# Ahmed Ali — Portfolio

A personal portfolio for an AI/ML engineer, built as a single-page React
app with a live RAG assistant that answers visitor questions about my
skills, experience, and projects.

The chat widget is not a scripted FAQ — it is a real retrieval-augmented
generation pipeline (TF-IDF retrieval over a hand-written knowledge base,
streamed through a free-tier LLM with automatic model fallback). The
"how this works" panel inside the widget walks visitors through it.

## Stack

| Layer     | Choice                                                     |
| --------- | ---------------------------------------------------------- |
| Frontend  | React 19, Vite 8, Tailwind CSS 4, Framer Motion, Lenis      |
| Backend   | FastAPI, httpx, scikit-learn (TF-IDF), Server-Sent Events   |
| LLM       | OpenRouter free tier, ordered fallback chain                |
| Hosting   | Render blueprint (`render.yaml`) — static site + web service |

## Repository layout

```
src/
  components/       UI, one component per section
  data/content.js   All portfolio copy and project data — edit here, not in JSX
  index.css         Design tokens (colors, fonts) + custom animations
backend/
  app/              FastAPI service (see backend/README.md for internals)
public/             Favicon and Open Graph image
render.yaml         Deployment blueprint for both services
```

## Local development

The site runs standalone; only the chat assistant needs the backend.

```bash
npm install
npm run dev          # http://localhost:5173
```

For the assistant, in a second terminal:

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate          # Windows; use source .venv/bin/activate elsewhere
pip install -r requirements.txt
cp .env.example .env            # then paste your key from https://openrouter.ai/keys
cd ..
npm run dev:api                 # http://localhost:8003
```

The frontend falls back to `http://localhost:8003` when `VITE_API_URL` is
unset, so no frontend config is needed locally. If the backend is not
running, the chat widget's status dot turns red and says so rather than
failing silently.

Verify the API: `curl http://localhost:8003/api/health`

## Editing content

Nearly all copy lives in [`src/data/content.js`](src/data/content.js) —
profile, about, projects, experience, tech stack, contact details.

The assistant's knowledge base is a **separate** file,
[`backend/app/knowledge_base.py`](backend/app/knowledge_base.py). It is a
Python mirror of the same facts and does not sync automatically, so
update both when anything about me changes — otherwise the chatbot will
confidently cite outdated details.

## Deploying

`render.yaml` defines both services. On Render: New → Blueprint → point
it at this repo.

Because each service needs the other's URL, two variables are set after
the first deploy:

1. `portfolio-api` → `OPENROUTER_API_KEY` (your key) and `ALLOWED_ORIGINS`
   (the deployed frontend origin, exactly — scheme included, no trailing
   slash).
2. `portfolio-web` → `VITE_API_URL` (the deployed API origin). This is
   read at build time, so **redeploy the frontend** after setting it.

Then update `og:url` and `og:image` in [`index.html`](index.html), which
currently point at a placeholder domain.

Any static host works for the frontend (Vercel, Netlify, Cloudflare
Pages) as long as `VITE_API_URL` is set at build time and that origin is
listed in the backend's `ALLOWED_ORIGINS`.

### Free-tier notes

- Render spins the backend down when idle; the first chat request can
  take 30–50s to wake it. The frontend pings `/api/health` on page load
  to start that early, and the widget retries connection failures.
- Free OpenRouter models rotate. If every fallback starts failing, check
  https://openrouter.ai/models?max_price=0 and update
  `OPENROUTER_MODELS`.

## Scripts

| Command           | Does                                        |
| ----------------- | ------------------------------------------- |
| `npm run dev`     | Vite dev server                             |
| `npm run dev:api` | FastAPI backend on port 8003 with reload    |
| `npm run build`   | Production build to `dist/`                 |
| `npm run preview` | Serve the production build locally          |
| `npm run lint`    | Oxlint                                      |
