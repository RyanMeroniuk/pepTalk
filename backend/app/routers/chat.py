"""Chat endpoint — the core RAG pipeline."""

import json
from typing import Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from litellm import acompletion
from pydantic import BaseModel

from app.config import LLM_MODEL, RAG_TOP_K, RAG_SCORE_THRESHOLD, SYSTEM_PROMPT, STACK_REVIEW_PROMPT
from app.dependencies import get_collection, get_model
from app.graph_utils import get_stack_context

router = APIRouter()


class StackItem(BaseModel):
    item: str
    category: str  # "peptide", "supplement"
    dose: Optional[str] = None


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    stack: list[StackItem] = []
    history: list[ChatMessage] = []


class StackReviewRequest(BaseModel):
    stack: list[StackItem]


def search_knowledge_base(query: str, stack: list[StackItem]) -> list[dict]:
    """Search ChromaDB for relevant chunks, boosting stack items."""
    model = get_model()
    collection = get_collection()

    query_embedding = model.encode(query).tolist()

    # Main search across everything
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=RAG_TOP_K,
    )

    chunks = []
    seen_ids = set()

    for doc_id, document, distance in zip(
        results["ids"][0], results["documents"][0], results["distances"][0]
    ):
        similarity = 1 - distance
        if similarity >= RAG_SCORE_THRESHOLD:
            chunks.append(
                {"id": doc_id, "content": document, "score": similarity}
            )
            seen_ids.add(doc_id)

    # If the user has a stack, also pull relevant sections for their items
    for stack_item in stack[:5]:  # limit to avoid too many extra searches
        item_results = collection.query(
            query_embeddings=[query_embedding],
            n_results=3,
            where={"item": stack_item.item},
        )
        for doc_id, document, distance in zip(
            item_results["ids"][0],
            item_results["documents"][0],
            item_results["distances"][0],
        ):
            if doc_id not in seen_ids:
                similarity = 1 - distance
                if similarity >= RAG_SCORE_THRESHOLD:
                    chunks.append(
                        {"id": doc_id, "content": document, "score": similarity}
                    )
                    seen_ids.add(doc_id)

    # Sort by relevance and limit total context
    chunks.sort(key=lambda x: x["score"], reverse=True)
    return chunks[:12]  # cap at 12 chunks to stay within token limits


def build_prompt(
    message: str,
    stack: list[StackItem],
    history: list[ChatMessage],
    chunks: list[dict],
) -> list[dict]:
    """Assemble the full prompt with system, context, history, and question."""
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Add user's stack context
    if stack:
        stack_text = "The user is currently taking:\n"
        for item in stack:
            dose_str = f" ({item.dose})" if item.dose else ""
            stack_text += f"- {item.item} [{item.category}]{dose_str}\n"
        messages.append({"role": "system", "content": stack_text})

    # Add knowledge graph relationship context
    if stack:
        stack_items = [item.item for item in stack]
        graph_context = get_stack_context(stack_items)
        if graph_context:
            messages.append({"role": "system", "content": f"RELATIONSHIP CONTEXT (from knowledge graph):\n{graph_context}"})

    # Add retrieved knowledge base context
    if chunks:
        context_text = "KNOWLEDGE BASE CONTEXT (answer ONLY from this information):\n\n"
        for chunk in chunks:
            context_text += f"--- Source: {chunk['id']} ---\n"
            context_text += chunk["content"] + "\n\n"
        messages.append({"role": "system", "content": context_text})

    # Add conversation history (last 10 messages)
    for msg in history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})

    # Add the current question
    messages.append({"role": "user", "content": message})

    return messages


async def stream_response(messages: list[dict], sources: list[str]):
    """Stream LLM response as Server-Sent Events."""
    try:
        response = await acompletion(
            model=LLM_MODEL,
            messages=messages,
            stream=True,
        )

        async for chunk in response:
            delta = chunk.choices[0].delta
            if delta.content:
                event = json.dumps({"type": "token", "content": delta.content})
                yield f"data: {event}\n\n"

        # Send sources after the response is complete
        source_event = json.dumps({"type": "sources", "sources": sources})
        yield f"data: {source_event}\n\n"

        # Signal completion
        done_event = json.dumps({"type": "done"})
        yield f"data: {done_event}\n\n"

    except Exception as e:
        error_event = json.dumps({"type": "error", "content": str(e)})
        yield f"data: {error_event}\n\n"


@router.post("/chat")
async def chat(request: ChatRequest):
    """RAG chat endpoint with streaming response."""
    # Search the knowledge base
    chunks = search_knowledge_base(request.message, request.stack)

    # Build the full prompt
    messages = build_prompt(
        request.message, request.stack, request.history, chunks
    )

    # Collect source file paths for citation
    sources = [chunk["id"] for chunk in chunks]

    return StreamingResponse(
        stream_response(messages, sources),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def get_stack_chunks(stack: list[StackItem]) -> list[dict]:
    """Pull the most relevant knowledge base chunks for each stack item."""
    model = get_model()
    collection = get_collection()
    chunks = []
    seen_ids = set()

    for stack_item in stack[:10]:
        # Search for key sections: interactions, dosing, side effects, stacking
        review_query = f"{stack_item.item} interactions dosing side effects stacking"
        query_embedding = model.encode(review_query).tolist()

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=3,
            where={"item": stack_item.item},
        )

        for doc_id, document, distance in zip(
            results["ids"][0], results["documents"][0], results["distances"][0]
        ):
            if doc_id not in seen_ids:
                similarity = 1 - distance
                if similarity >= RAG_SCORE_THRESHOLD:
                    chunks.append({"id": doc_id, "content": document, "score": similarity})
                    seen_ids.add(doc_id)

    chunks.sort(key=lambda x: x["score"], reverse=True)
    return chunks[:20]  # allow more chunks for a thorough review


@router.post("/chat/stack-review")
async def chat_stack_review(request: StackReviewRequest):
    """AI-powered stack review — analyzes the full stack with a dedicated review prompt."""
    # Get relevant chunks for each stack item
    chunks = get_stack_chunks(request.stack)

    # Build review prompt
    messages = [{"role": "system", "content": STACK_REVIEW_PROMPT}]

    # Stack listing
    stack_text = "USER'S CURRENT STACK:\n"
    for item in request.stack:
        dose_str = f" ({item.dose})" if item.dose else ""
        stack_text += f"- {item.item} [{item.category}]{dose_str}\n"
    messages.append({"role": "system", "content": stack_text})

    # Graph context
    stack_items = [item.item for item in request.stack]
    graph_context = get_stack_context(stack_items)
    if graph_context:
        messages.append({"role": "system", "content": f"RELATIONSHIP CONTEXT (from knowledge graph):\n{graph_context}"})

    # Knowledge base chunks
    if chunks:
        context_text = "KNOWLEDGE BASE CONTEXT:\n\n"
        for chunk in chunks:
            context_text += f"--- Source: {chunk['id']} ---\n"
            context_text += chunk["content"] + "\n\n"
        messages.append({"role": "system", "content": context_text})

    # The review request
    messages.append({"role": "user", "content": "Analyze my current stack. Provide a full review covering risks, timing, synergies, and suggestions."})

    sources = [chunk["id"] for chunk in chunks]

    return StreamingResponse(
        stream_response(messages, sources),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
