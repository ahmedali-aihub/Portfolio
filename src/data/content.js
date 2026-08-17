export const profile = {
  name: "Ahmed Ali",
  title: "AI/ML Engineer",
  subtitle: "GenAI & Agentic Systems",
  tagline:
    "I build systems where language models don't just talk — they retrieve, reason, and act.",
  location: "Hyderabad, India",
  phone: "+91 90001 89973",
  github: "https://github.com/ahmedali-aihub",
  linkedin: "https://www.linkedin.com/in/ahmed-ali-aiml2006/",
};

export const about = {
  paragraphs: [
    "I build the layer between large language models and real systems — retrieval pipelines that ground answers in truth, agents that plan and act across tools and calendars, and classical ML models that hold up under scrutiny.",
    "My work spans the full stack of applied AI: offline model training, explainability, API-first serving, and the orchestration logic that turns a language model into something that can actually get work done.",
    "Currently building RAG pipelines and LLM agents in production, and training the next generation of AI/ML engineers through TechZone Academy.",
  ],
};

export const marqueeItems = [
  { label: "RAG", icon: "search", color: "#38BDF8" },
  { label: "AGENTIC AI", icon: "bot", color: "#A78BFA" },
  { label: "LANGGRAPH", icon: "langgraph", color: "#8B5CF6" },
  { label: "LANGCHAIN", icon: "langchain", color: "#2DD4BF" },
  { label: "MCP SERVERS", icon: "mcp", color: "#DA7756" },
  { label: "PROMPT ENGINEERING", icon: "terminal", color: "#FBBF24" },
  { label: "TENSORFLOW", icon: "tensorflow", color: "#FF6F00" },
  { label: "PYTORCH", icon: "pytorch", color: "#EE4C2C" },
  { label: "SCIKIT-LEARN", icon: "scikit", color: "#F7931E" },
  { label: "VECTOR DBS", icon: "database", color: "#34D399" },
  { label: "FASTAPI", icon: "fastapi", color: "#009688" },
  { label: "SELENIUM", icon: "selenium", color: "#43B02A" },
];

export const focusAreas = [
  {
    title: "Agentic AI Systems",
    description:
      "Building autonomous, tool-using agents with LangGraph and LangChain — from calendar and email automation to multi-step browser-driven workflows.",
  },
  {
    title: "RAG & Retrieval Pipelines",
    description:
      "Designing retrieval-augmented pipelines with vector search and structured data, including natural-language-to-SQL systems grounded in real databases.",
  },
  {
    title: "Applied Machine Learning",
    description:
      "Training sequential and classical models — from GRU4Rec session recommenders to decision-tree classifiers with SHAP explainability.",
  },
  {
    title: "Computer Vision",
    description:
      "Building and deploying image classification models as interactive, production-facing web applications.",
  },
  {
    title: "Production ML Infrastructure",
    description:
      "Shipping end-to-end — FastAPI serving layers, SQL-backed data systems, and the orchestration logic that gets a model from notebook to production.",
  },
];

export const techStack = [
  {
    group: "Agentic Frameworks & LLMs",
    description: "Architecting autonomous decision loops, tool-calling, and the providers behind them.",
    items: [
      { label: "LangChain", icon: "langchain", color: "#2DD4BF" },
      { label: "LangGraph", icon: "langgraph", color: "#8B5CF6" },
      { label: "MCP Servers", icon: "mcp", color: "#DA7756" },
      { label: "Anthropic", icon: "anthropic", color: "#D97757" },
      { label: "OpenRouter", icon: "openrouter", color: "#6366F1" },
      { label: "Hugging Face", icon: "huggingface", color: "#FFD21E" },
      { label: "Agentic AI", icon: "bot", color: "#A78BFA" },
      { label: "Prompt Engineering", icon: "terminal", color: "#FBBF24" },
    ],
  },
  {
    group: "ML & Modeling",
    description: "Training and explaining models across sequential, classical, and vision tasks.",
    items: [
      { label: "Python", icon: "python", color: "#3776AB" },
      { label: "NumPy", icon: "numpy", color: "#4DABCF" },
      { label: "Pandas", icon: "pandas", color: "#8C6FE8" },
      { label: "TensorFlow", icon: "tensorflow", color: "#FF6F00" },
      { label: "Keras", icon: "keras", color: "#D00000" },
      { label: "PyTorch", icon: "pytorch", color: "#EE4C2C" },
      { label: "Scikit-learn", icon: "scikit", color: "#F7931E" },
      { label: "NLP", icon: "nlp", color: "#22D3EE" },
      { label: "SHAP", icon: "shap", color: "#C084FC" },
      { label: "Jupyter", icon: "jupyter", color: "#F37626" },
    ],
  },
  {
    group: "RAG & Search",
    description: "Grounding LLM outputs in retrieved, structured, and vectorized context.",
    items: [
      { label: "RAG", icon: "rag", color: "#38BDF8" },
      { label: "Vector DBs", icon: "database", color: "#34D399" },
      { label: "FAISS", icon: "faiss", color: "#4267B2" },
    ],
  },
  {
    group: "Backend & Tools",
    description: "Serving models and agents through production-grade APIs and data layers.",
    items: [
      { label: "FastAPI", icon: "fastapi", color: "#009688" },
      { label: "Streamlit", icon: "streamlit", color: "#FF4B4B" },
      { label: "Docker", icon: "docker", color: "#2496ED" },
      { label: "MySQL", icon: "mysql", color: "#4479A1" },
      { label: "Selenium", icon: "selenium", color: "#43B02A" },
      { label: "Playwright", icon: "playwright", color: "#2EAD33" },
    ],
  },
];

export const projects = [
  {
    id: "session-recommender",
    index: "01",
    category: "Recommender System",
    name: "Session-Based Recommender System",
    description:
      "A GRU4Rec sequential model trained on e-commerce behavior data to predict next-item intent within a session, served through a FastAPI backend with a Streamlit interface for live exploration.",
    stack: ["TensorFlow", "FastAPI", "Streamlit"],
    link: null,
  },
  {
    id: "conference-bot",
    index: "02",
    category: "Team Project",
    name: "Agentic Conference Registration Bot",
    description:
      "A team-built agent that searches for relevant conferences and completes registration autonomously — driving headless browsers through real-world signup flows.",
    stack: ["Serper API", "Playwright", "Headless Browsers"],
    link: null,
  },
];

export const experience = [
  {
    role: "Data Scientist Intern",
    org: "TechZone Academy",
    period: "Jan 2025 — May 2026",
    description: "",
  },
  {
    role: "AI/ML Associate Engineer",
    org: "Yuva Intelli AI Solutions",
    period: "May 2026 — Present",
    description:
      "Building RAG pipelines, LLM agents, and end-to-end ML workflows for production use cases.",
  },
];
