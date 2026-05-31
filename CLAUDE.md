# PepTalk - AI-Powered Peptide, Supplement & Lifestyle Optimization Coach

## Project Overview
A mobile app that acts as a personalized health optimization coach. Users input their peptide and supplement stack, and PepTalk generates actionable recommendations — what to eat, what to avoid, how to train, how to sleep, and what supplements to pair — all tailored to their specific protocol. The AI chat is grounded in a curated knowledge base of 1,837 files, not hallucinated.

This is NOT just a reference tool. It's a coach that knows your stack and proactively advises.

## Project Structure
```
pepTalk/
├── CLAUDE.md                              # This file — project context
├── README.md                              # Project overview and setup guide
├── .gitignore                             # Python, Node, models, ChromaDB, env files
├── data/                                  # Knowledge base (1,837 markdown files)
│   ├── peptides/                          # 61 peptide directories (14 sections each)
│   │   ├── _subcutaneous-injections-guide.md
│   │   ├── _stacking-and-supplements-guide/  # 5 split section files
│   │   ├── semaglutide/                   # Example peptide directory
│   │   │   ├── overview.md
│   │   │   ├── classification.md
│   │   │   ├── mechanisms-of-action.md
│   │   │   ├── benefits.md
│   │   │   ├── dosing-protocols.md
│   │   │   ├── side-effects.md
│   │   │   ├── supplement-interactions.md
│   │   │   ├── lifestyle-recommendations.md
│   │   │   ├── foods-to-eat.md
│   │   │   ├── foods-to-avoid.md
│   │   │   ├── things-to-avoid.md
│   │   │   ├── stacking-protocols.md
│   │   │   ├── drug-interactions.md
│   │   │   └── regulatory-status.md
│   │   └── ... (61 peptide directories total — incl. blends like glow/klow and peptide hormones)
│   ├── supplements/                       # 64 supplement directories (14 sections each)
│   │   └── ... (same structure but with forms-and-bioavailability.md, peptide-synergies.md, etc.)
│   └── lifestyle/                         # 10 lifestyle topic directories (8 sections each)
│       └── ... (overview, science, protocols, common-mistakes, peptide/supplement-connections, quick-wins, resources)
├── backend/                               # FastAPI server
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                        # FastAPI entry point, CORS, lifespan
│   │   ├── config.py                      # Settings, paths, system prompt
│   │   ├── dependencies.py                # Shared model + ChromaDB singletons
│   │   └── routers/
│   │       ├── chat.py                    # POST /chat — RAG streaming endpoint
│   │       ├── browse.py                  # GET /peptides, /supplements, /lifestyle
│   │       └── search.py                  # GET /search, POST /check-conflicts
│   │       ├── graph_utils.py             # Knowledge graph query helpers
│   ├── ingest.py                          # One-time: reads data/ → embeds → stores in ChromaDB
│   ├── build_graph.py                     # One-time: parses data/ → extracts relationships → graph.json
│   ├── requirements.txt                   # Python deps
│   ├── .env.example                       # Template for API keys
│   ├── .venv/                             # Python virtual env (gitignored)
│   ├── models/                            # Embedding model (gitignored, ~87MB)
│   │   └── all-MiniLM-L6-v2/             # sentence-transformers local model
│   ├── chroma_db/                         # Vector database (gitignored, rebuilt by ingest.py)
│   └── graph.json                         # Knowledge graph (gitignored, rebuilt by build_graph.py)
└── app/                                   # React Native / Expo mobile app (not started yet)
```

## Architecture

### How It Works
```
Mobile App (thin client)              Backend (FastAPI)
┌──────────────────────┐              ┌──────────────────────────────────┐
│  Chat UI             │  question    │  1. Embed question (local, 5ms)  │
│  Scheduler/Tracker   │────────────→│  2. Search ChromaDB (vectors)    │
│  User's stack        │  + stack     │  3. Traverse graph (relationships)│
│  (stored on-device)  │             │  4. Build prompt + merged context │
│                      │←────────────│  5. Stream via Gemini 2.5 Flash  │
│                      │  streaming  │                                  │
└──────────────────────┘              └──────────────────────────────────┘
```

### Tech Stack
- **Mobile app**: React Native / Expo (iOS-first, eventual App Store)
- **Backend API**: Python FastAPI (`backend/app/main.py`)
- **LLM**: Gemini 2.5 Flash free tier (primary) via LiteLLM. Swappable to Claude Haiku via config.
- **Embeddings**: `all-MiniLM-L6-v2` (sentence-transformers, runs locally, 384-dim vectors)
- **Vector DB**: ChromaDB (embedded, persisted to `backend/chroma_db/`)
- **Knowledge Graph**: NetworkX (in-memory adjacency list, persisted to `backend/graph.json`)
- **On-device storage**: MMKV (stack data) + WatermelonDB (dose logs/history)

### Backend API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check, returns document count |
| `/chat` | POST | Core RAG endpoint — streaming SSE response |
| `/peptides` | GET | List all 61 peptides (slug, name, classification) |
| `/peptides/{slug}` | GET | All sections for one peptide |
| `/supplements` | GET | List all 64 supplements |
| `/supplements/{slug}` | GET | All sections for one supplement |
| `/lifestyle` | GET | List all 10 lifestyle topics |
| `/lifestyle/{slug}` | GET | All sections for one lifestyle topic |
| `/search?q=...` | GET | Semantic search across entire knowledge base |
| `/check-conflicts` | POST | Check user's stack for known conflicts (graph-based) |
| `/graph/stats` | GET | Knowledge graph node/edge counts |
| `/graph/synergies/{item}` | GET | All known synergies for an item |

### RAG Pipeline (in `backend/app/routers/chat.py`)
1. User sends message + their active stack + conversation history
2. Question is embedded locally via sentence-transformers (~5ms)
3. **Structure-first hybrid retrieval** (`search_knowledge_base`):
   - **Global discovery (semantic)** — top `RAG_TOP_K` chunks across the whole KB, above `RAG_SCORE_THRESHOLD` (catches lifestyle topics, guides, items not in the stack).
   - **Per-stack-item (structural)** — for each stack item, always fetch its safety-core sections by metadata (`CORE_ITEM_SECTIONS`: dosing-protocols, side-effects, drug-interactions, things-to-avoid, interactions) via `fetch_item_sections`, PLUS the most query-relevant of that item's own sections via `rank_item_sections` (ranked within the item, no threshold). This guarantees dosing/safety context is never dropped and reliably surfaces the section that answers the question.
4. Knowledge graph traversed for the user's stack — extracts conflicts, synergies, and key relationships
5. Prompt assembled: system prompt + stack context (unit-labeled doses) + **graph context** + retrieved chunks + history + question
6. Response streamed via LiteLLM → Gemini 2.5 Flash as Server-Sent Events
7. Sources appended at end of stream for citation

**Why hybrid, not pure vector search:** each section is one coarse chunk embedded by a small model, so a relevant section (e.g. a peptide's dosing protocol) often fails to rank into a global top-K. Because the KB is small and rigidly structured (fixed sections per item, tagged with `item`/`section` metadata), the per-item structural pass fetches known-needed sections deterministically instead of hoping similarity surfaces them. `fetch_item_sections` / `rank_item_sections` are written so an agent could call them as tools later. **Stack review** (`get_stack_chunks`) uses the same deterministic fetch with a comprehensive `REVIEW_SECTIONS` set.

### Knowledge Graph (`backend/graph.json`, built by `build_graph.py`)
An in-memory adjacency list (NetworkX MultiDiGraph) persisted as JSON. Stores explicit relationships extracted from the data files via regex parsing — no LLM needed to build.

**Stats**: 167 nodes, 5,867 edges
- **Nodes**: 64 supplements, 60 peptides, 28 drugs, 15 conditions
- **Edge types**: SYNERGIZES_WITH (3,272), CONFLICTS_WITH (965), STACKS_WITH (814), CONTRAINDICATED_IN (551), SUPPORTS (217), TIMING_CONFLICT (48)

**How it enhances the RAG**:
- Vector search returns relevant *content* (text chunks)
- Graph traversal returns explicit *relationships* (A synergizes with B, severity: high)
- Both are merged into the prompt so the LLM has content + structured facts

**Query helpers** (`backend/app/graph_utils.py`):
- `get_synergies(item)` — all supplements/peptides that pair well
- `get_conflicts(stack)` — known conflicts between stack items
- `get_stack_context(stack)` — rich text summary for the LLM prompt
- `get_timing_conflicts(stack)` — items that shouldn't be taken at the same time
- `get_related_items(item, depth)` — everything connected up to N hops

**Conflict detection** (`POST /check-conflicts`) uses direct graph edge lookup — instant and accurate vs the old pairwise vector search approach.

### Key Config (`backend/app/config.py`)
- `RAG_TOP_K = 8` — global discovery chunks per query
- `RAG_SCORE_THRESHOLD = 0.3` — minimum similarity for the global discovery pass
- `RAG_PER_ITEM_RELEVANT_K = 3` — query-relevant sections per stack item (beyond core)
- `RAG_MAX_STACK_ITEMS = 8` — stack items expanded in retrieval
- `LLM_MODEL` — set in `.env`, defaults to `gemini/gemini-2.5-flash`
- System prompt is defined here — enforces grounded answers only

### Scheduler & Tracker (mobile app, not backend)
Like a calorie tracking app, but for peptides and supplements:
- **Daily protocol view** — organized by time of day (morning, midday, evening, bedtime)
- **Stack management** — add items with dose, frequency, route (oral, subQ, intranasal), time
- **Dosing reminders** — push notifications
- **Dose logging** — tap to confirm, track adherence
- **Cycle tracking** — tracks position in on/off cycles, reminds when to stop/restart
- **Fasting windows** — countdown timers for GH peptides requiring fasted injection
- **Smart conflicts** — flags timing issues from the knowledge base
- **Feeds the AI** — stack is sent with each `/chat` request so the AI knows your protocol
- Data lives on-device (MMKV + WatermelonDB), no user accounts needed

## Knowledge Base Details

### Data Stats
- **1,837 markdown files** across 140 directories
- **61 peptides** × 14 sections = ~854 files (incl. blends like glow/klow and peptide hormones)
- **64 supplements** × 14 sections = ~896 files
- **10 lifestyle topics** × 8 sections = 80 files
- **Guides**: SubQ injection guide + stacking/supplements guide (5 files)
- Every file is a self-contained chunk optimized for RAG retrieval

### Peptide Sections (14 per peptide)
classification, overview, mechanisms-of-action, benefits, dosing-protocols, side-effects, supplement-interactions, lifestyle-recommendations, foods-to-eat, foods-to-avoid, things-to-avoid, stacking-protocols, drug-interactions, regulatory-status

### Supplement Sections (14 per supplement)
classification, overview, mechanisms-of-action, benefits, forms-and-bioavailability, dosing-protocols, side-effects, natural-food-sources, foods-that-enhance-absorption, foods-to-avoid, things-to-avoid, lifestyle-recommendations, peptide-synergies, drug-interactions

### Lifestyle Sections (8 per topic)
overview, science, protocols, common-mistakes, peptide-connections, supplement-connections, quick-wins, resources

### Lifestyle Topics
sleep, exercise, nutrition, stress-management, hydration, sunlight, blood-work, gut-health, toxin-avoidance, cold-and-heat-exposure

### Adding/Updating Data
- Edit markdown files in `data/` directly
- Re-run `python ingest.py` to rebuild the vector database (~6 seconds)
- Re-run `python build_graph.py` to rebuild the knowledge graph (~1 second)
- Both must be re-run after any data changes

## Key Design Decisions
- **Do NOT bundle the LLM model with the app** — too large, all AI lives on the backend
- **Mobile app is a thin client** — chat UI + scheduler, all intelligence is server-side
- **LLM has no internet access** — only sees context we send it
- **Answers are grounded** — if data doesn't cover it, say "I don't have information on that"
- **LLM provider is swappable** — change one string in `.env` via LiteLLM
- **All responses are educational** — framed as research, never medical advice
- **Scheduler data on-device** — no user accounts needed initially, optional cloud sync later

## Development Philosophy
- **Do it right the first time.** Never take a shortcut with plans to "fix it later." That's lazy and leads to compounding tech debt. The only exception is when doing it properly would be insanely difficult or when there's a clear logical reason to defer.
- Build to the final standard from day one — data formats, file structures, naming conventions, API contracts.

## Changelog Convention
Keep `CHANGELOG.md` (repo root) current. **After any sufficiently meaningful change, add a changelog entry as part of the same work — before considering the task done.**

- **What counts as "sufficient":** new feature or endpoint; a behavior/logic change a user or developer would notice; an architecture or data-flow change (e.g. retrieval pipeline, prompt strategy, schema/data-model); a meaningful bug fix; config/contract changes. **Skip** trivial edits: typos, formatting, comments, pure refactors with no behavior change, doc-only tweaks.
- **How to write it:** newest entry first, grouped under a dated `## YYYY-MM-DD — <short title>` heading (use the real current date). State the *problem* and the *fix/outcome*, not just a file diff. Name the key files/functions touched. Note any known limitations. Match the style of existing entries.
- **Keep the docs in sync:** if a change alters how the system works or its stats (counts, architecture), update the affected `README.md` / `CLAUDE.md` sections too — the changelog is history, the README/CLAUDE.md describe current state.
- This is a convention, not an enforced hook — apply it by default; the user can waive it for a given change.

## Development Environment
- Primary dev machine: MacBook Air M4 13-inch, 16GB RAM, macOS Tahoe 26.3.1
- Gemini Flash free tier: 15 req/min, 1M tokens/day
- Backend hosting (when ready): Railway, Fly.io, or Render free tiers

## Commands
```bash
# Backend
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload              # Start dev server (port 8000)
python ingest.py                            # Rebuild vector database from data/
python build_graph.py                       # Rebuild knowledge graph from data/

# NotebookLM CLI (original research source)
cd /Users/synovion/notebooklm-py && source .venv/bin/activate
notebooklm ask "question"                   # Query the peptide notebook
notebooklm source list                      # List sources
```

## Cost Projections (Production)
- LLM API: Free (Gemini Flash) or $5-20/month (Claude Haiku)
- Backend hosting: $0-5/month on free tiers
- Apple Developer: $99/year
- Vector DB: negligible (dataset is a few MB, embedded with the server)

## Status
- [x] Knowledge base — 61 peptides, 64 supplements, 10 lifestyle topics (1,837 files)
- [x] Embedding model — all-MiniLM-L6-v2 running locally
- [x] Vector database — ChromaDB ingested and searchable
- [x] Knowledge graph — 167 nodes, 5,867 edges, fully operational
- [x] Backend API — FastAPI with browse, search, chat, and graph endpoints
- [x] Chat endpoint — tested with Gemini 2.5 Flash, streaming responses working
- [x] Structure-first hybrid retrieval — per-stack-item core + query-relevant sections
- [x] Mobile app — Chat UI
- [x] Mobile app — Scheduler & tracker
- [x] Mobile app — User stack management
- [ ] Push notifications
- [ ] App Store deployment
