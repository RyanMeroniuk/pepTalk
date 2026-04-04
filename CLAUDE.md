# PepTalk - AI-Powered Peptide, Supplement & Lifestyle Optimization Coach

## Project Overview
A mobile app that acts as a personalized health optimization coach. Users input their peptide and supplement stack, and PepTalk generates actionable recommendations — what to eat, what to avoid, how to train, how to sleep, and what supplements to pair — all tailored to their specific protocol. The AI chat is grounded in a curated knowledge base of 969 files, not hallucinated.

This is NOT just a reference tool. It's a coach that knows your stack and proactively advises.

## Project Structure
```
pepTalk/
├── CLAUDE.md                              # This file — project context
├── README.md                              # Project overview and setup guide
├── .gitignore                             # Python, Node, models, ChromaDB, env files
├── data/                                  # Knowledge base (969 markdown files)
│   ├── peptides/                          # 32 peptide directories (14 sections each)
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
│   │   └── ... (32 peptide directories total)
│   ├── supplements/                       # 31 supplement directories (14 sections each)
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
│   ├── ingest.py                          # One-time script: reads data/ → embeds → stores in ChromaDB
│   ├── requirements.txt                   # Python deps
│   ├── .env.example                       # Template for API keys
│   ├── .venv/                             # Python virtual env (gitignored)
│   ├── models/                            # Embedding model (gitignored, ~87MB)
│   │   └── all-MiniLM-L6-v2/             # sentence-transformers local model
│   └── chroma_db/                         # Vector database (gitignored, rebuilt by ingest.py)
└── app/                                   # React Native / Expo mobile app (not started yet)
```

## Architecture

### How It Works
```
Mobile App (thin client)              Backend (FastAPI)
┌──────────────────────┐              ┌─────────────────────────────┐
│  Chat UI             │  question    │  1. Embed question (local)  │
│  Scheduler/Tracker   │────────────→│  2. Search ChromaDB         │
│  User's stack        │  + stack     │  3. Build prompt + context  │
│  (stored on-device)  │             │  4. Stream via Gemini Flash  │
│                      │←────────────│  5. Return SSE stream       │
│                      │  streaming  │                             │
└──────────────────────┘              └─────────────────────────────┘
```

### Tech Stack
- **Mobile app**: React Native / Expo (iOS-first, eventual App Store)
- **Backend API**: Python FastAPI (`backend/app/main.py`)
- **LLM**: Gemini Flash free tier (primary) via LiteLLM. Swappable to Claude Haiku via config.
- **Embeddings**: `all-MiniLM-L6-v2` (sentence-transformers, runs locally, 384-dim vectors)
- **Vector DB**: ChromaDB (embedded, persisted to `backend/chroma_db/`)
- **On-device storage**: MMKV (stack data) + WatermelonDB (dose logs/history)

### Backend API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check, returns document count |
| `/chat` | POST | Core RAG endpoint — streaming SSE response |
| `/peptides` | GET | List all 32 peptides (slug, name, classification) |
| `/peptides/{slug}` | GET | All sections for one peptide |
| `/supplements` | GET | List all 31 supplements |
| `/supplements/{slug}` | GET | All sections for one supplement |
| `/lifestyle` | GET | List all 10 lifestyle topics |
| `/lifestyle/{slug}` | GET | All sections for one lifestyle topic |
| `/search?q=...` | GET | Semantic search across entire knowledge base |
| `/check-conflicts` | POST | Check user's stack for known interactions/conflicts |

### RAG Pipeline (in `backend/app/routers/chat.py`)
1. User sends message + their active stack + conversation history
2. Question is embedded locally via sentence-transformers (~5ms)
3. ChromaDB searched for top 8 relevant chunks (boosted for stack items)
4. Prompt assembled: system prompt + stack context + retrieved chunks + history + question
5. Response streamed via LiteLLM → Gemini Flash as Server-Sent Events
6. Sources appended at end of stream for citation

### Key Config (`backend/app/config.py`)
- `RAG_TOP_K = 8` — chunks retrieved per query
- `RAG_SCORE_THRESHOLD = 0.3` — minimum similarity to include
- `LLM_MODEL` — set in `.env`, defaults to `gemini/gemini-2.0-flash`
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
- **969 markdown files** across 74 directories
- **32 peptides** × 14 sections = ~450 files
- **31 supplements** × 14 sections = ~434 files
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
- Re-run `cd backend && source .venv/bin/activate && python ingest.py` to rebuild the vector database
- Ingestion takes ~6 seconds for all 969 files

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
- [x] Knowledge base — 32 peptides, 31 supplements, 10 lifestyle topics (969 files)
- [x] Embedding model — all-MiniLM-L6-v2 running locally
- [x] Vector database — ChromaDB ingested and searchable
- [x] Backend API — FastAPI with browse, search, and chat endpoints
- [ ] Chat endpoint needs Gemini API key to test LLM responses
- [ ] Mobile app — Chat UI
- [ ] Mobile app — Scheduler & tracker
- [ ] Mobile app — User stack management
- [ ] Push notifications
- [ ] App Store deployment
