// Single source of truth for the resume. Both the interactive page
// (src/resume/) and the PDF (scripts/build-resume.mjs) read from here.
// Dates and roles follow the LinkedIn profile.

export const resume = {
  name: "Ahmed Ali",
  title: "AI/ML Engineer",
  subtitle: "GenAI & Agentic Systems",
  tagline: "Building systems where language models retrieve, reason and act.",
  contact: {
    email: "theahmedalii82@gmail.com",
    phone: "+91 90001 89973",
    location: "Hyderabad, India",
    linkedin: "https://www.linkedin.com/in/ahmed-ali-aiml2006/",
    github: "https://github.com/ahmedali-aihub",
  },
  pdf: "/Ahmed-Ali-Resume.pdf",

  summary:
    "AI/ML engineer building RAG pipelines, LLM agents and production ML services with Python, FastAPI and LangChain. Working full-time at Yuva Intelli AI Solutions while completing a Bachelor's in AI & ML (2025–2028).",

  highlights: [
    {
      title: "Ships to production",
      text: "Building RAG systems and LLM agents for real use cases at Yuva Intelli AI Solutions.",
    },
    {
      title: "Full-stack AI",
      text: "Comfortable from model training and explainability to FastAPI serving and cloud deployment.",
    },
    {
      title: "Learns by building",
      text: "Working full-time while studying for a Bachelor's in AI & ML, with a steady stream of shipped projects.",
    },
  ],

  stats: [
    { value: 20, suffix: "M", label: "real click events modelled" },
    { value: 140, suffix: "K", label: "products served live" },
    { value: 6, suffix: "", label: "AI/ML projects built" },
    { value: 2, suffix: "", label: "industry roles since 2025" },
  ],

  education: [
    {
      school: "Shadan College of Engineering and Technology",
      degree: "Bachelor's degree, AI & Machine Learning",
      period: "Jul 2025 – Jun 2028",
      status: "In progress",
    },
    {
      school: "Jawaharlal Nehru Government Polytechnic College",
      degree: "Diploma, Mechanical Engineering",
      period: "Aug 2022 – May 2025",
      status: "Completed",
    },
  ],

  experience: [
    {
      role: "AI/ML Associate Engineer",
      org: "Yuva Intelli AI Solutions",
      place: "Nampally, Telangana",
      period: "Jul 2025 – Present",
      bullets: [
        "Build AI assistants and RAG systems with Python, FastAPI, LangChain, Ollama and vector databases.",
        "Develop LLM agents and NLP solutions, plus face-recognition and speech-recognition features.",
        "Own ML workflows end to end, from training and explainability to API-first serving.",
      ],
      tags: ["Python", "FastAPI", "LangChain", "Ollama", "RAG", "Vector DBs", "NLP", "AI Agents"],
    },
    {
      role: "Data Scientist Intern",
      org: "TechZone Academy",
      place: "Hyderabad",
      period: "Jan 2025 – Jun 2025",
      bullets: [
        "Delivered data preprocessing, exploratory analysis, model building and predictive analytics on real-world projects.",
        "Worked in Python, Pandas, NumPy and Scikit-learn alongside mentors and teams on ML, NLP and automation tasks.",
      ],
      tags: ["Python", "Pandas", "NumPy", "Scikit-learn", "NLP", "Data Science"],
    },
  ],

  projects: [
    {
      name: "Session-Based Recommender System",
      kind: "Recommender System",
      stack: ["TensorFlow", "FastAPI", "Streamlit", "React"],
      bullets: [
        "Trained a GRU4Rec model on 20M real e-commerce click events to predict a visitor's next item from their last few clicks, with no login.",
        "Served it via FastAPI behind a React storefront of ~140K products, deployed live across Vercel, Render and Aiven.",
      ],
      tags: ["TensorFlow", "FastAPI", "Streamlit", "React", "Python"],
    },
    {
      name: "Calendar & Email Agents",
      kind: "Agentic AI",
      stack: ["LangGraph", "LangChain", "OpenRouter", "Google Calendar API"],
      bullets: [
        "LangGraph scheduling agent that reads intent, checks availability, and books, moves or cancels Google Calendar events.",
        "LLM email agent that triages and drafts replies, routing between LangChain tools and OpenRouter models by task complexity.",
      ],
      tags: ["LangGraph", "LangChain", "OpenRouter", "AI Agents", "Python"],
    },
    {
      name: "Text-to-SQL RAG Pipeline",
      kind: "RAG / Data",
      stack: ["FastAPI", "SQLAlchemy", "MySQL", "Anthropic API"],
      bullets: [
        "Turns plain-English questions into MySQL queries using retrieval-augmented context and the Anthropic API.",
      ],
      tags: ["RAG", "FastAPI", "SQLAlchemy", "MySQL", "Anthropic", "Python"],
    },
    {
      name: "Agentic Conference Registration Bot",
      kind: "Team Project",
      stack: ["Serper API", "Playwright", "Headless Browsers"],
      bullets: [
        "Team-built agent that finds relevant conferences and completes registration autonomously via headless browsers.",
      ],
      tags: ["Playwright", "AI Agents", "Python"],
    },
    {
      name: "Portfolio with a Live RAG Assistant",
      kind: "Full-stack",
      stack: ["React", "FastAPI", "scikit-learn", "OpenRouter"],
      link: { label: "github.com/ahmedali-aihub/Portfolio", href: "https://github.com/ahmedali-aihub/Portfolio" },
      bullets: [
        "RAG chat assistant with TF-IDF retrieval over a curated knowledge base, streamed over Server-Sent Events.",
        "Automatic fallback across a chain of free-tier LLMs keeps answers flowing when a model is unavailable.",
      ],
      tags: ["RAG", "FastAPI", "React", "OpenRouter", "Scikit-learn", "Python"],
    },
    {
      name: "Applied ML & Computer Vision",
      kind: "Classical ML",
      stack: ["Scikit-learn", "SHAP", "TensorFlow/Keras", "Streamlit"],
      bullets: [
        "Heart-disease risk classifier (decision tree) with SHAP explanations for every prediction.",
        "Smoking-detection image classifier in TensorFlow/Keras, deployed as a Streamlit app.",
      ],
      tags: ["Scikit-learn", "SHAP", "TensorFlow", "Keras", "Streamlit", "Python", "Statistics"],
    },
  ],

  skills: [
    {
      group: "Agentic AI & LLMs",
      items: ["AI Agents", "LangChain", "LangGraph", "CrewAI", "AutoGen", "MCP Servers", "Prompt Engineering", "Hugging Face", "Anthropic", "OpenRouter"],
    },
    { group: "RAG & Search", items: ["RAG", "Vector DBs", "FAISS", "TF-IDF"] },
    {
      group: "ML & Modeling",
      items: ["Python", "NumPy", "Pandas", "TensorFlow", "Keras", "PyTorch", "Scikit-learn", "NLP", "SHAP", "Statistics", "Data Science", "Jupyter"],
    },
    { group: "LLM Engineering", items: ["Transformers", "Ollama", "vLLM", "LangSmith", "LLM Evals", "Guardrails", "LoRA", "RLHF"] },
    {
      group: "Backend & Tools",
      items: ["FastAPI", "REST APIs", "Streamlit", "Docker", "MySQL", "SQLAlchemy", "Playwright", "Selenium", "Git", "GitHub Actions", "Linux"],
    },
  ],
};
