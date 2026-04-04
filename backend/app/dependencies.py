"""Shared dependencies loaded once at startup."""

import chromadb
from sentence_transformers import SentenceTransformer

from app.config import CHROMA_PATH, MODEL_PATH

# These are loaded once when the module is first imported.
# FastAPI's lifespan ensures they're ready before requests are served.

_model = None
_chroma_collection = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(str(MODEL_PATH))
    return _model


def get_collection() -> chromadb.Collection:
    global _chroma_collection
    if _chroma_collection is None:
        client = chromadb.PersistentClient(path=str(CHROMA_PATH))
        _chroma_collection = client.get_collection("peptalk")
    return _chroma_collection
