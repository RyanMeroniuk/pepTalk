"""PepTalk Backend API — FastAPI entry point."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import GEMINI_API_KEY, ANTHROPIC_API_KEY
from app.dependencies import get_model, get_collection
from app.routers import browse, chat, search


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML model and ChromaDB on startup."""
    # Set API keys for LiteLLM
    if GEMINI_API_KEY:
        os.environ["GEMINI_API_KEY"] = GEMINI_API_KEY
    if ANTHROPIC_API_KEY:
        os.environ["ANTHROPIC_API_KEY"] = ANTHROPIC_API_KEY

    # Pre-load dependencies so first request isn't slow
    print("Loading embedding model...")
    get_model()
    print("Connecting to ChromaDB...")
    collection = get_collection()
    print(f"Knowledge base: {collection.count()} documents")
    print("PepTalk backend ready.")

    yield  # Server is running

    # Shutdown (nothing to clean up)
    print("Shutting down PepTalk backend.")


app = FastAPI(
    title="PepTalk API",
    description="AI-powered peptide, supplement, and lifestyle optimization coach",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow the mobile app and localhost dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(chat.router, tags=["Chat"])
app.include_router(browse.router, tags=["Browse"])
app.include_router(search.router, tags=["Search"])


@app.get("/health")
async def health():
    """Health check endpoint."""
    collection = get_collection()
    return {
        "status": "ok",
        "documents": collection.count(),
    }
