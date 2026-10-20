// Single source of truth for the resume PDF (scripts/build-resume.mjs).
// Dates and roles follow the LinkedIn profile.

export const resume = {
  name: "Ahmed Ali",
  title: "AI/ML Engineer",
  subtitle: "GenAI & Agentic Systems",
  contact: {
    email: "theahmedalii82@gmail.com",
    phone: "+91 90001 89973",
    location: "Hyderabad, India",
    linkedin: "https://www.linkedin.com/in/ahmed-ali-aiml2006/",
    github: "https://github.com/ahmedali-aihub",
  },

  summary:
    "AI/ML engineer specialising in RAG pipelines, agentic LLM systems and production ML services, built with Python, FastAPI, LangChain and LangGraph. Currently an AI/ML Associate Engineer at Yuva Intelli AI Solutions, shipping AI assistants, RAG systems and NLP features, while completing a Bachelor's degree in AI & Machine Learning (2025–2028). Comfortable across the full applied-AI stack, from model training and explainability to API-first serving and agent orchestration. Active in AI communities and hackathons.",

  education: [
    {
      school: "Shadan College of Engineering and Technology",
      degree: "Bachelor's degree, AI & Machine Learning",
      period: "Jul 2025 – Jun 2028",
      status: "In progress",
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
    },
    {
      role: "Data Scientist Intern",
      org: "TechZone Academy",
      place: "Hyderabad",
      period: "Jan 2025 – Jun 2025",
      bullets: [
        "Performed data preprocessing, exploratory analysis, model building and predictive analytics.",
        "Used Python, Pandas, NumPy and Scikit-learn with mentors and teams on ML, NLP and automation work.",
      ],
    },
  ],

  projects: [
    {
      name: "Agentic RAG Support Assistant",
      kind: "Agentic AI",
      stack: ["LangGraph", "FastAPI", "Chroma", "React", "TypeScript"],
      link: {
        label: "GitHub",
        href: "https://github.com/ahmedali-aihub/Agentic-RAG-Support-Assistant-with-Confidence-Based-Escalation",
      },
      bullets: [
        "Built a LangGraph support agent that judges whether retrieved evidence answers a question, then replies with a citation, rewrites the query once, or escalates to a human with a triage summary.",
        "Two-stage retrieval (Chroma, then cross-encoder reranking of 20 candidates to the top 5); on an 11-question eval it cut hallucinated out-of-scope answers from 2/5 to 0/5 while still answering all 6 in-scope questions.",
        "Added a human-in-the-loop ticket queue whose resolved answers are embedded back into the knowledge base; shipped with 81 automated tests, CI and Docker.",
      ],
    },
    {
      name: "Session-Based Recommender System",
      kind: "Recommender System",
      stack: ["TensorFlow", "FastAPI", "Streamlit", "React"],
      link: { label: "GitHub", href: "https://github.com/ahmedali-aihub/Product-Recommendation-system-Using-GRU" },
      bullets: [
        "Trained a GRU4Rec model on 20M real e-commerce click events to predict each visitor's next item.",
        "Served via FastAPI behind a React storefront of ~140K products; deployed on Vercel, Render and Aiven.",
      ],
    },
    {
      name: "Agentic Conference Registration Bot",
      kind: "Team Project",
      stack: ["Serper API", "Playwright", "Headless Browsers"],
      bullets: [
        "Team-built agent that finds relevant conferences and completes registration autonomously via headless browsers.",
      ],
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
