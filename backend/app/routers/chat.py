"""Chat endpoint — the core RAG pipeline."""

import json
import re
from typing import Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from litellm import acompletion
from pydantic import BaseModel, ConfigDict, Field

from app.config import (
    LLM_MODEL,
    LLM_MAX_TOKENS,
    LLM_REASONING_EFFORT,
    GEMINI_SAFETY_SETTINGS,
    RAG_TOP_K,
    RAG_SCORE_THRESHOLD,
    RAG_PER_ITEM_RELEVANT_K,
    RAG_MAX_STACK_ITEMS,
    RAG_MAX_QUERY_ITEMS,
    SYSTEM_PROMPT,
    STACK_REVIEW_PROMPT,
)
from app.dependencies import get_collection, get_model
from app.graph_utils import get_stack_context
from app.item_registry import detect_items

router = APIRouter()

_DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

# Sections always included for each relevant item — the safety/interaction context
# that should never be missing when discussing an item, fetched deterministically by
# metadata rather than left to fuzzy similarity. The $in fetch returns only the
# sections that exist for a given item (peptides have supplement-interactions;
# supplements have peptide-synergies), so listing both names is harmless.
CORE_ITEM_SECTIONS = [
    "dosing-protocols",
    "side-effects",
    "drug-interactions",
    "things-to-avoid",
    "supplement-interactions",
    "peptide-synergies",
]

# Stack review pulls a comprehensive set: the core sections plus stacking and
# timing (lifestyle-recommendations) context for the Synergies/Timing sections.
REVIEW_SECTIONS = CORE_ITEM_SECTIONS + ["stacking-protocols", "lifestyle-recommendations"]


class StackItem(BaseModel):
    # Frontend sends camelCase; accept both that and snake_case field names.
    model_config = ConfigDict(populate_by_name=True)

    item: str
    category: str  # "peptide", "supplement"
    slug: Optional[str] = None  # directory slug, matches ChromaDB "item" metadata
    dose: Optional[str] = None  # legacy free-text, still accepted
    dose_amount: Optional[float] = Field(None, alias="doseAmount")
    dose_unit: Optional[str] = Field(None, alias="doseUnit")
    days_of_week: Optional[list[int]] = Field(None, alias="daysOfWeek")
    time_slot: Optional[str] = Field(None, alias="timeSlot")
    route: Optional[str] = None


def _fmt_num(n: float) -> str:
    """Format a number without trailing zeros: 2.0 → '2', 0.25 → '0.25'."""
    return f"{n:g}"


def describe_frequency(days_of_week: Optional[list[int]]) -> Optional[str]:
    """Python port of the frontend describeFrequency().

    [0..6] → "Daily"; [1,5] → "2×/week (Mon, Fri)"; None/[] → None.
    """
    if not days_of_week:
        return None
    if len(days_of_week) == 7:
        return "Daily"
    labels = ", ".join(_DAY_LABELS[d] for d in sorted(days_of_week) if 0 <= d <= 6)
    return f"{len(days_of_week)}×/week ({labels})"


def format_stack_for_prompt(stack: list["StackItem"]) -> str:
    """Serialize a stack into prompt lines with unit-labeled dose figures.

    Each figure is pre-computed and labeled with its unit so the LLM never does
    the math itself and can match against whatever unit the knowledge base uses
    for that item (per day, per dose/injection, or per week). Example lines:
      - GHK-Cu [peptide] — 2 mg per dose; taken Daily; = 2 mg per day; = 14 mg per week [subcutaneous]
      - Retatrutide [peptide] — 2 mg per dose; taken 2×/week (Mon, Fri); = 4 mg per week
    Degrades gracefully when amount/schedule are missing.
    """
    lines = []
    for item in stack:
        # --- Per-dose clause (always present in some form) ---
        if item.dose_amount is not None and item.dose_unit:
            per_dose = f"{_fmt_num(item.dose_amount)} {item.dose_unit}"
        elif item.dose:
            per_dose = item.dose  # legacy free-text fallback
        elif item.dose_unit:
            per_dose = item.dose_unit  # non-numeric, e.g. "as needed"
        else:
            per_dose = None

        n = len(item.days_of_week) if item.days_of_week else 0
        freq = describe_frequency(item.days_of_week)

        # --- Per-day clause: only for truly daily items (n == 7) ---
        # For N×/week items a per-day average is meaningless (no dose on off
        # days) and would invite a wrong comparison, so we omit it. When daily,
        # per-day == per-dose; the label is what lets the LLM match "mg/day" KB
        # ranges directly.
        per_day = None
        if item.dose_amount is not None and item.dose_unit and n == 7:
            per_day = f"{_fmt_num(item.dose_amount)} {item.dose_unit} per day"

        # --- Weekly total: numeric amount AND a schedule. ---
        # NOTE: this assumes the dose is taken on every selected day. It
        # over-counts sub-weekly cadences (e.g. "every other day") that
        # daysOfWeek (weekly granularity) cannot represent — known limitation.
        weekly = None
        if item.dose_amount is not None and item.dose_unit and n:
            total = item.dose_amount * n
            weekly = f"{_fmt_num(total)} {item.dose_unit} per week"

        # --- Assemble ---
        line = f"- {item.item} [{item.category}]"
        if per_dose:
            line += f" — {per_dose} per dose" if item.dose_amount is not None else f" — {per_dose}"
        else:
            line += " — dose not set"
        if freq:
            line += f"; taken {freq}"
        if per_day:
            line += f"; = {per_day}"
        if weekly:
            line += f"; = {weekly}"

        extras = [e for e in (item.route, item.time_slot) if e]
        if extras:
            line += f" [{', '.join(extras)}]"

        lines.append(line)

    return "\n".join(lines)


def resolve_item_key(stack_item: StackItem) -> str:
    """Map a stack item to its ChromaDB 'item' metadata key.

    ChromaDB stores the directory slug (e.g. 'retatrutide'), but the app sends
    the display name (e.g. 'Retatrutide'). Prefer the slug the client provides;
    otherwise slugify the display name as a best-effort fallback.
    """
    if stack_item.slug:
        return stack_item.slug
    return re.sub(r"[^a-z0-9]+", "-", stack_item.item.lower()).strip("-")


# --- Reusable retrieval primitives (also usable as agent tools later) ----------

def fetch_item_sections(collection, item_key: str, sections: list[str]) -> list[dict]:
    """Deterministically fetch named sections for one item by metadata.

    No embedding involved — guarantees the requested sections are returned
    regardless of similarity, so critical context (dosing, interactions) is never
    dropped. Returns only the sections that actually exist for the item.
    """
    results = collection.get(
        where={"$and": [{"item": item_key}, {"section": {"$in": sections}}]},
    )
    return [
        {"id": doc_id, "content": document, "score": 1.0}
        for doc_id, document in zip(results["ids"], results["documents"])
    ]


def rank_item_sections(collection, item_key: str, query_embedding, top_k: int) -> list[dict]:
    """Rank one item's own sections by similarity to the query; take the best top_k.

    Ranking within a single item's ~14 sections is far more reliable than ranking
    one section among all 1,837, so no score threshold is applied here — we trust
    the relative ordering within the item.
    """
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where={"item": item_key},
    )
    return [
        {"id": doc_id, "content": document, "score": 1 - distance}
        for doc_id, document, distance in zip(
            results["ids"][0], results["documents"][0], results["distances"][0]
        )
    ]


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
    """Structure-first hybrid retrieval.

    1. Global discovery pass — semantic search across everything (catches lifestyle
       topics, guides, and items the user didn't name).
    2. Per-stack-item structural pass — for each stack item, ALWAYS include its
       safety-core sections (deterministic) plus the most query-relevant of its own
       sections (ranked within the item). This is the part that makes context
       reliable: the dosing/safety sections are never dropped, and the section that
       actually answers the question (foods, lifestyle, …) is surfaced by ranking
       within the item rather than competing against all 1,837 chunks.
    """
    model = get_model()
    collection = get_collection()
    query_embedding = model.encode(query).tolist()

    chunks = []
    seen_ids = set()

    def add(chunk: dict) -> None:
        if chunk["id"] not in seen_ids:
            chunks.append(chunk)
            seen_ids.add(chunk["id"])

    def add_core(item_key: str) -> None:
        """Safety/interaction sections — always relevant for what the user is on."""
        for chunk in fetch_item_sections(collection, item_key, CORE_ITEM_SECTIONS):
            add(chunk)

    def add_relevant(item_key: str) -> None:
        """The item's most query-relevant sections (foods, lifestyle, …)."""
        for chunk in rank_item_sections(
            collection, item_key, query_embedding, RAG_PER_ITEM_RELEVANT_K
        ):
            add(chunk)

    # 1. Global discovery pass (similarity, with threshold)
    results = collection.query(query_embeddings=[query_embedding], n_results=RAG_TOP_K)
    for doc_id, document, distance in zip(
        results["ids"][0], results["documents"][0], results["distances"][0]
    ):
        if 1 - distance >= RAG_SCORE_THRESHOLD:
            add({"id": doc_id, "content": document, "score": 1 - distance})

    # Which items does the question explicitly name (stack or not)?
    named = detect_items(query)
    named_set = set(named)
    asks_specific_item = bool(named_set)

    # 2. Stack items: ALWAYS include safety-core (so the AI knows what the user is
    #    on and can flag interactions/overlaps). Only rank-expand a stack item's
    #    other sections when the question is general OR names that item —
    #    otherwise a question about something else would drag in, e.g., every
    #    stack item's foods.
    stack_keys = [resolve_item_key(s) for s in stack[:RAG_MAX_STACK_ITEMS]]
    stack_set = set(stack_keys)
    for item_key in stack_keys:
        add_core(item_key)
        if not asks_specific_item or item_key in named_set:
            add_relevant(item_key)

    # 3. Items named in the question but not in the stack (e.g. "what should I eat
    #    on tirzepatide?" when tirzepatide isn't in the stack) — expand fully so
    #    the answer is about what was actually asked.
    for item_key in named[:RAG_MAX_QUERY_ITEMS]:
        if item_key in stack_set:
            continue
        add_core(item_key)
        add_relevant(item_key)

    return chunks


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
        stack_text = "The user is currently taking:\n" + format_stack_for_prompt(stack)
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
        kwargs = {
            "model": LLM_MODEL,
            "messages": messages,
            "stream": True,
            "max_tokens": LLM_MAX_TOKENS,
        }
        # Gemini-specific params (safe to omit for other providers via LiteLLM).
        if LLM_MODEL.startswith(("gemini", "vertex")):
            kwargs["safety_settings"] = GEMINI_SAFETY_SETTINGS
            if LLM_REASONING_EFFORT:
                kwargs["reasoning_effort"] = LLM_REASONING_EFFORT

        response = await acompletion(**kwargs)

        finish_reason = None
        got_content = False
        async for chunk in response:
            choice = chunk.choices[0]
            if choice.finish_reason:
                finish_reason = choice.finish_reason
            if choice.delta.content:
                got_content = True
                event = json.dumps({"type": "token", "content": choice.delta.content})
                yield f"data: {event}\n\n"

        # Server-side visibility into why generation ended (truncation/safety/etc.)
        print(f"[chat] finish_reason={finish_reason!r} got_content={got_content}")

        # If the model stopped abnormally (cut off / filtered / empty), tell the
        # user inline via the existing token stream — no frontend change needed.
        if not got_content or finish_reason not in ("stop", "end_turn", None):
            notices = {
                "length": "\n\n_(Response was cut off at the length limit.)_",
                "max_tokens": "\n\n_(Response was cut off at the length limit.)_",
                "content_filter": "\n\n_(Response was cut short by the model's safety filter — try rephrasing.)_",
                "safety": "\n\n_(Response was cut short by the model's safety filter — try rephrasing.)_",
            }
            notice = notices.get(finish_reason)
            if notice is None and not got_content:
                notice = "\n\n_(No response was generated — please try again or rephrase.)_"
            if notice:
                yield f"data: {json.dumps({'type': 'token', 'content': notice})}\n\n"

        # Send sources after the response is complete
        source_event = json.dumps({"type": "sources", "sources": sources})
        yield f"data: {source_event}\n\n"

        # Signal completion (finish_reason exposed for future UI use)
        done_event = json.dumps({"type": "done", "finish_reason": finish_reason})
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
    """Deterministically pull the review-critical sections (REVIEW_SECTIONS) for
    each stack item.

    Fetched by metadata so the dosing protocol — and the other sections the review
    needs — are guaranteed present, regardless of embedding similarity to any query.
    """
    collection = get_collection()
    chunks = []
    seen_ids = set()

    for stack_item in stack[:RAG_MAX_STACK_ITEMS]:
        for chunk in fetch_item_sections(
            collection, resolve_item_key(stack_item), REVIEW_SECTIONS
        ):
            if chunk["id"] not in seen_ids:
                chunks.append(chunk)
                seen_ids.add(chunk["id"])

    return chunks


@router.post("/chat/stack-review")
async def chat_stack_review(request: StackReviewRequest):
    """AI-powered stack review — analyzes the full stack with a dedicated review prompt."""
    # Get relevant chunks for each stack item
    chunks = get_stack_chunks(request.stack)

    # Build review prompt
    messages = [{"role": "system", "content": STACK_REVIEW_PROMPT}]

    # Stack listing
    stack_text = "USER'S CURRENT STACK:\n" + format_stack_for_prompt(request.stack)
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
