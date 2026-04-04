"""Search and conflict-check endpoints."""

import json
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import RAG_SCORE_THRESHOLD
from app.dependencies import get_collection, get_model

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
    """Check for known conflicts between items in the user's stack."""
    model = get_model()
    collection = get_collection()

    conflicts = []

    # For each pair of items, search for interaction info
    items = request.stack
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            item_a = items[i]
            item_b = items[j]

            # Search for interactions between these two items
            query = f"{item_a.item} interaction with {item_b.item}"
            query_embedding = model.encode(query).tolist()

            # Search drug-interactions and supplement-interactions sections
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=5,
                where={
                    "$or": [
                        {"item": item_a.item},
                        {"item": item_b.item},
                    ]
                },
            )

            # Check if any results mention the other item
            for doc_id, document, distance in zip(
                results["ids"][0],
                results["documents"][0],
                results["distances"][0],
            ):
                similarity = 1 - distance
                if similarity < 0.4:  # higher threshold for conflict detection
                    continue

                doc_lower = document.lower()
                a_mentioned = item_a.item.lower().replace("-", " ") in doc_lower or item_a.item.lower() in doc_lower
                b_mentioned = item_b.item.lower().replace("-", " ") in doc_lower or item_b.item.lower() in doc_lower

                if a_mentioned or b_mentioned:
                    # Check for timing conflicts
                    timing_conflict = (
                        item_a.time
                        and item_b.time
                        and item_a.time == item_b.time
                    )

                    # Extract relevant warning text (find the line mentioning the other item)
                    warning_lines = []
                    other_item = item_b.item if item_a.item.lower() in doc_id.lower() else item_a.item
                    for line in document.split("\n"):
                        if other_item.lower().replace("-", " ") in line.lower() or other_item.lower() in line.lower():
                            clean_line = line.strip().lstrip("- *")
                            if clean_line:
                                warning_lines.append(clean_line)

                    if warning_lines:
                        conflicts.append(
                            {
                                "items": [item_a.item, item_b.item],
                                "warning": warning_lines[0],
                                "source": doc_id,
                                "severity": "high" if "contraindicated" in warning_lines[0].lower() else "moderate",
                                "timing_conflict": timing_conflict,
                            }
                        )
                        break  # one conflict per pair is enough

    # Deduplicate
    seen = set()
    unique_conflicts = []
    for c in conflicts:
        key = tuple(sorted(c["items"]))
        if key not in seen:
            seen.add(key)
            unique_conflicts.append(c)

    return {"conflicts": unique_conflicts}
