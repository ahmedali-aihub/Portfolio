"""
Ahmed Ali's portfolio knowledge base — the source documents the RAG
pipeline retrieves from. Kept in sync by hand with src/data/content.js
on the frontend; there is no shared source of truth between the two.
"""

PROFILE = {
    "name": "Ahmed Ali",
    "title": "AI/ML Engineer",
    "subtitle": "GenAI & Agentic Systems",
    "location": "Hyderabad, India",
    "phone": "+91 90001 89973",
    "github": "https://github.com/ahmedali-aihub",
    "linkedin": "https://www.linkedin.com/in/ahmed-ali-aiml2006/",
}

EXPERIENCE = [
    {
        "role": "AI/ML Associate Engineer",
        "org": "Yuva Intelli AI Solutions",
        "period": "May 2026 — Present",
        "description": "Building RAG pipelines, LLM agents, and end-to-end ML workflows for production use cases.",
    },
    {
        "role": "Data Scientist Intern",
        "org": "TechZone Academy",
        "period": "Jan 2025 — May 2026",
        "description": "",
    },
]

PROJECTS = [
    {
        "name": "Session-Based Recommender System",
        "category": "Recommender System",
        "description": "A GRU4Rec sequential model trained on e-commerce behavior data to predict next-item intent within a session, served through a FastAPI backend with a Streamlit interface for live exploration.",
        "stack": ["TensorFlow", "FastAPI", "Streamlit"],
    },
    {
        "name": "Calendar Agent",
        "category": "Agentic AI",
        "description": "An autonomous scheduling agent built from scratch on LangGraph — reads intent, checks availability, and books, moves, or cancels events directly on Google Calendar.",
        "stack": ["LangGraph", "Google Calendar API"],
    },
    {
        "name": "Email Agent",
        "category": "Agentic AI",
        "description": "An LLM-driven agent that triages, drafts, and handles email automatically, routing between LangChain tool calls and OpenRouter-hosted models based on task complexity.",
        "stack": ["LangChain", "OpenRouter"],
    },
    {
        "name": "Heart Disease Classifier",
        "category": "Classical ML",
        "description": "A decision tree model for early heart disease risk prediction, paired with SHAP explainability so every prediction can be traced back to the clinical features driving it.",
        "stack": ["Scikit-learn", "SHAP"],
    },
    {
        "name": "Smoking Detection Classifier",
        "category": "Computer Vision",
        "description": "An image classification model that detects smoking behavior from photos, trained with TensorFlow/Keras and deployed as an interactive Streamlit web app.",
        "stack": ["TensorFlow / Keras", "Streamlit"],
    },
    {
        "name": "Agentic Conference Registration Bot",
        "category": "Team Project",
        "description": "A team-built agent that searches for relevant conferences and completes registration autonomously — driving headless browsers through real-world signup flows.",
        "stack": ["Serper API", "Playwright", "Headless Browsers"],
    },
    {
        "name": "Text-to-SQL / RAG Pipeline",
        "category": "RAG / Data",
        "description": "A natural-language-to-SQL pipeline that translates plain-English questions into structured MySQL queries, combining retrieval-augmented context with the Anthropic API.",
        "stack": ["FastAPI", "SQLAlchemy", "Anthropic API"],
    },
]

TECH_STACK = [
    {
        "group": "Agentic Frameworks & LLMs",
        "items": ["LangChain", "LangGraph", "MCP Servers", "Anthropic", "OpenRouter", "Agentic AI", "Prompt Engineering"],
    },
    {
        "group": "ML & Modeling",
        "items": ["Python", "TensorFlow", "Keras", "PyTorch", "Scikit-learn", "NLP", "SHAP"],
    },
    {
        "group": "RAG & Search",
        "items": ["RAG", "Vector DBs", "Pinecone", "FAISS"],
    },
    {
        "group": "Backend & Tools",
        "items": ["FastAPI", "MySQL", "SQLAlchemy", "Selenium", "Playwright"],
    },
]

ABOUT = (
    "I build the layer between large language models and real systems — retrieval pipelines "
    "that ground answers in truth, agents that plan and act across tools and calendars, and "
    "classical ML models that hold up under scrutiny. My work spans the full stack of applied "
    "AI: offline model training, explainability, API-first serving, and the orchestration logic "
    "that turns a language model into something that can actually get work done. Currently "
    "building RAG pipelines and LLM agents in production, and training the next generation of "
    "AI/ML engineers through TechZone Academy."
)


def build_documents() -> list[dict]:
    """Flatten the knowledge base into retrievable (id, text) chunks."""
    docs: list[dict] = []

    docs.append({
        "id": "profile",
        "text": (
            f"{PROFILE['name']} is a {PROFILE['title']} focused on {PROFILE['subtitle']}, "
            f"based in {PROFILE['location']}."
        ),
    })

    docs.append({"id": "about", "text": ABOUT})

    for job in EXPERIENCE:
        desc = job["description"] or "No further details published yet."
        docs.append({
            "id": f"experience-{job['org']}",
            "text": (
                f"Experience: {job['role']} at {job['org']} ({job['period']}). {desc}"
            ),
        })

    for p in PROJECTS:
        docs.append({
            "id": f"project-{p['name']}",
            "text": (
                f"Project \"{p['name']}\" ({p['category']}): {p['description']} "
                f"Built with: {', '.join(p['stack'])}."
            ),
        })

    for group in TECH_STACK:
        docs.append({
            "id": f"skills-{group['group']}",
            "text": (
                f"Ahmed's skills and technical expertise in {group['group']} include: "
                + ", ".join(group["items"])
                + "."
            ),
        })

    docs.append({
        "id": "contact",
        "text": (
            f"You can contact, reach, email, message, or get in touch with Ahmed through: "
            f"phone {PROFILE['phone']}, GitHub {PROFILE['github']}, LinkedIn {PROFILE['linkedin']}. "
            f"He is located in {PROFILE['location']}."
        ),
    })

    # No hobbies have been provided yet — intentionally omitted so the
    # assistant answers honestly ("I don't have that information") rather
    # than inventing personal details. Add a "hobbies" doc here once real
    # info is available.

    return docs
