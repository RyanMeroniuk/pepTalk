"""Search and conflict-check endpoints."""

import json
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import RAG_SCORE_THRESHOLD
from app.dependencies import get_collection, get_model
from app.graph_utils import get_conflicts, get_timing_conflicts, get_synergies, get_stack_context, get_graph_stats
from app.item_registry import resolve_item_id

router = APIRouter()


@router.get("/search")
async def search(q: str, limit: int = 10, category: Optional[str] = None):
    """Semantic search across the entire knowledge base."""
    model = get_model()
    collection = get_collection()

    query_embedding = model.encode(q).tolist()

    query_params = {
        "query_embeddings": [query_embedding],
        "n_results": limit,
    }

    # Optional category filter
    if category and category in ("peptide", "supplement", "lifestyle", "guide"):
        query_params["where"] = {"category": category}

    results = collection.query(**query_params)

    search_results = []
    for doc_id, document, metadata, distance in zip(
        results["ids"][0],
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        similarity = 1 - distance
        if similarity < RAG_SCORE_THRESHOLD:
            continue

        # Create a snippet (first 200 chars of content)
        snippet = document[:200].strip()
        if len(document) > 200:
            snippet += "..."

        search_results.append(
            {
                "item": metadata.get("item", ""),
                "category": metadata.get("category", ""),
                "section": metadata.get("section", ""),
                "snippet": snippet,
                "score": round(similarity, 3),
            }
        )

    return {"query": q, "results": search_results}


class ConflictStackItem(BaseModel):
    item: str
    category: str
    dose: Optional[str] = None
    time: Optional[str] = None  # "morning", "midday", "evening", "bedtime"


class ConflictRequest(BaseModel):
    stack: list[ConflictStackItem]


@router.post("/check-conflicts")
async def check_conflicts(request: ConflictRequest):
    """Check for known conflicts between items in the user's stack using the knowledge graph."""
    stack_items = [item.item for item in request.stack]

    # Graph-based conflict detection (instant, accurate)
    conflicts = get_conflicts(stack_items)
    timing = get_timing_conflicts(stack_items)

    return {
        "conflicts": conflicts,
        "timing_conflicts": timing,
    }


@router.post("/stack-review")
async def stack_review(request: ConflictRequest):
    """Full stack review — conflicts, synergies, timing issues from the knowledge graph."""
    stack_items = [item.item for item in request.stack]

    conflicts = get_conflicts(stack_items)
    timing = get_timing_conflicts(stack_items)

    # Get synergies for each item in the stack
    all_synergies = []
    seen_pairs = set()
    stack_ids = [resolve_item_id(s) for s in stack_items]
    for item_id in stack_ids:
        for syn in get_synergies(item_id):
            # Only include synergies between items in the stack
            pair = tuple(sorted([item_id, syn["target"]]))
            if syn["target"] in stack_ids and pair not in seen_pairs:
                seen_pairs.add(pair)
                all_synergies.append({
                    "items": list(pair),
                    "relationship": syn["relationship"],
                    "mechanism": syn["mechanism"],
                    "strength": syn["strength"],
                })

    summary = get_stack_context(stack_items)

    return {
        "conflicts": conflicts,
        "timing_conflicts": timing,
        "synergies": all_synergies,
        "summary": summary,
    }


@router.get("/graph/stats")
async def graph_stats():
    """Return knowledge graph statistics."""
    return get_graph_stats()


@router.get("/graph/synergies/{item}")
async def item_synergies(item: str):
    """Get all known synergies for an item."""
    return {"item": item, "synergies": get_synergies(item)}
