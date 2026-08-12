"""
Lightweight retrieval over the knowledge base.

Uses TF-IDF + cosine similarity rather than neural embeddings — the
corpus is a few dozen short documents about one person, so a heavier
embedding model (and the torch/onnx runtime it drags in) buys nothing
here and makes the service much more expensive to host on a free tier.
Swap in FAISS + sentence-transformers later if the knowledge base grows
enough for semantic recall to matter.
"""

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.knowledge_base import build_documents


class Retriever:
    def __init__(self) -> None:
        self.documents = build_documents()
        self.vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
        self.matrix = self.vectorizer.fit_transform([d["text"] for d in self.documents])

    def retrieve(self, query: str, top_k: int = 5) -> list[str]:
        query_vec = self.vectorizer.transform([query])
        scores = cosine_similarity(query_vec, self.matrix)[0]
        ranked = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
        # Always include a small floor of results so the model has
        # something to work with even on a low-overlap query.
        top = [self.documents[i]["text"] for i in ranked[:top_k] if scores[i] > 0]
        if not top:
            top = [self.documents[i]["text"] for i in ranked[:top_k]]
        return top


retriever = Retriever()
