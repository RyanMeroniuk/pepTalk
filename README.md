# PepTalk

**Your AI-powered peptide, supplement, and lifestyle optimization coach.**

PepTalk is a mobile app that gives you personalized, research-backed guidance on peptides, supplements, and lifestyle habits. Tell it what you're taking, and it generates actionable recommendations — what to eat, what to avoid, how to train, how to sleep, and what supplements to pair — all tailored to your specific stack.

It's not just a reference tool. It's a coach.

## What It Does

- **Personalized recommendations** — Input your peptide and supplement stack, get tailored lifestyle advice (diet, exercise, sleep, timing)
- **Scheduler & tracker** — Log your peptides and supplements like a calorie tracker. Set dosing schedules, get reminders, track what you took and when. See your daily protocol at a glance.
- **AI-powered chat** — Ask anything: "What foods should I avoid on semaglutide?", "How do I improve my sleep?", "Can I take magnesium with BPC-157?"
- **Research-backed answers** — Every response is grounded in curated data, not hallucinated. The AI only answers from what it knows.
- **Three pillars of optimization** — Peptides, supplements, and lifestyle habits all in one place, cross-referenced and connected
- **Not medical advice** — Educational tool framing all information as research, not prescriptions

## How It Works

```
┌─────────────────────┐              ┌────────────────────────────────┐
│                     │              │                                │
│   Mobile App        │   question   │   Backend (FastAPI)            │
│                     │   + stack    │                                │
│   • Chat UI         │─────────────→│   1. Embed question (local)    │
│   • Scheduler       │              │   2. Hybrid retrieval:         │
│   • Your stack      │              │      structure + semantic      │
│   • Settings        │              │   3. Add stack + graph context │
│                     │←─────────────│   4. Stream answer from LLM    │
│                     │   response   │   5. Cite sources              │
│                     │              │                                │
└─────────────────────┘              └────────────────────────────────┘
```

The mobile app is a thin client — all intelligence lives on the backend. The app sends your question plus your current stack, the backend retrieves the right knowledge-base context, builds a context-rich prompt, calls the LLM, and streams back a grounded, cited answer.

### Retrieval: structure-first hybrid

PepTalk's knowledge base is small and rigidly structured — every peptide and supplement is split into the same fixed set of section files, each tagged with `item` and `section` metadata. The retrieval pipeline exploits that structure instead of relying on fuzzy vector similarity alone:

- **Global discovery (semantic)** — the question is embedded locally and matched across the whole knowledge base, surfacing relevant content including lifestyle topics and items not in your stack.
- **Per-stack-item (structural)** — for each item in your stack, PepTalk always pulls its safety-critical sections (dosing, side effects, drug interactions, things to avoid, interactions) directly by metadata — guaranteed, never dropped — and additionally ranks that item's *own* sections against your question to include whatever best answers it (foods, lifestyle, timing, etc.).
- **Query-mentioned items (structural)** — if you name a peptide or supplement that *isn't* in your stack (e.g. "what should I eat on tirzepatide?"), PepTalk detects it (brand names and dev codes included — Ozempic, Mounjaro, etc.) and pulls its sections too, so the answer is about what you actually asked.

This guarantees the AI always has the dosing and safety context for what you're actually taking, while still surfacing the section that answers your specific question — without depending on one section out-ranking 1,800+ others in a pure similarity search.

## Knowledge Graph

On top of vector search, PepTalk uses a **knowledge graph** — an adjacency list of every relationship between peptides, supplements, drugs, conditions, and lifestyle factors. It's built with NetworkX (Python library, no external database) and persisted as a JSON file.

### What it stores
- **167 nodes**: 64 supplements, 60 peptides, 28 drugs, 15 conditions
- **5,867 edges**: SYNERGIZES_WITH (3,272), CONFLICTS_WITH (965), STACKS_WITH (814), CONTRAINDICATED_IN (551), SUPPORTS (217), TIMING_CONFLICT (48)

### Why it matters
Vector search finds *similar text*. The graph finds *explicit relationships*. Together they give the AI both relevant content and structured facts:

- **Without graph**: "What supplements should I add?" → vector search returns generic supplement files
- **With graph**: The AI also gets "semaglutide SYNERGIZES_WITH creatine (preserves lean mass), semaglutide CONFLICTS_WITH sulfonylureas (hypoglycemia risk), bpc-157 SYNERGIZES_WITH collagen-peptides (tissue repair)" — explicit facts it can reason over

### How it's built
The `build_graph.py` script parses all stacking-protocols, drug-interactions, supplement-interactions, and peptide-synergies files using regex. No LLM needed — the files are structured enough to extract relationships directly. Takes under a second to build.

## Scheduler & Tracker

Think of it like MyFitnessPal, but for peptides and supplements instead of calories.

### Core Features
- **Daily protocol view** — See everything you need to take today at a glance, organized by time of day (morning, midday, evening, bedtime)
- **Add to your stack** — Search the database, select a peptide or supplement, set dose, frequency, route (oral, subQ, intranasal), and time of day
- **Dosing reminders** — Push notifications for each scheduled dose ("Time for your evening CJC/Ipa injection")
- **Log what you took** — Tap to confirm you took a dose. Track adherence over time.
- **Cycle tracking** — Set cycle length (e.g., 8 weeks on / 4 weeks off for BPC-157) and the app tracks where you are, reminds you when to stop and restart
- **Fasting windows** — For GH peptides that require fasted injection, show fasting countdown timers ("Inject after 8:30 PM — 2 hours post-meal")
- **History & calendar** — See what you took on any past day. Spot missed doses. Track consistency.
- **Smart conflicts** — Flag timing conflicts from the knowledge base (e.g., "Don't take zinc and copper at the same time", "Inject CJC/Ipa in a fasted state — you logged dinner at 7 PM")

### How It Connects to the AI
The scheduler feeds into the chat. When you ask "what supplements should I add?", the AI already knows your full stack and schedule. When you ask "am I taking anything that conflicts?", it can check your logged protocol against the drug interactions data. The scheduler makes the AI smarter by giving it real context about what you're actually doing.

## The Knowledge Base

PepTalk's data layer is comprehensive and pre-built. Every entry is split into individual section files optimized for RAG retrieval.

### Peptides (61 compounds)
Covering growth hormone secretagogues, healing peptides, GLP-1 weight loss drugs, nootropics, sleep peptides, immune support, sexual health, and anti-aging compounds. Each peptide has 14 section files:

| Section | Description |
|---------|------------|
| Classification | Category and type |
| Overview | What it is, how it works at a high level |
| Mechanisms of Action | Biochemical pathways |
| Benefits | Documented effects with research backing |
| Dosing Protocols | Routes, amounts, timing, cycling |
| Side Effects | Common, uncommon, and rare effects |
| Supplement Interactions | What to pair with, what to avoid |
| Lifestyle Recommendations | Actionable daily habits to maximize effects |
| Foods to Eat | Specific foods that support this peptide |
| Foods to Avoid | Foods that interfere or cause problems |
| Things to Avoid | Behaviors and substances to steer clear of |
| Stacking Protocols | Combinations with other peptides |
| Drug Interactions | Medication conflicts and contraindications |
| Regulatory Status | FDA approval, legal status, availability |

### Supplements (64 compounds)
Covering minerals, vitamins, amino acids, herbal extracts, mitochondrial support, sleep aids, and gut health compounds. Each supplement has 14 section files:

| Section | Description |
|---------|------------|
| Classification | Category |
| Overview | What it is and why it matters |
| Mechanisms of Action | How it works biochemically |
| Benefits | Documented effects |
| Forms & Bioavailability | Which form to buy and why (critical for supplements) |
| Dosing Protocols | Amounts, timing, with/without food |
| Side Effects | Safety profile |
| Natural Food Sources | Specific foods with amounts per serving |
| Foods That Enhance Absorption | What to take it with |
| Foods to Avoid | What blocks absorption |
| Things to Avoid | Behaviors that reduce efficacy |
| Lifestyle Recommendations | How to optimize effects |
| Peptide Synergies | Which peptides this pairs with |
| Drug Interactions | Medication conflicts |

### Lifestyle (10 topics)
Covering sleep, exercise, nutrition, stress management, hydration, sunlight, blood work, gut health, toxin avoidance, and temperature therapy. Each topic has 8 section files:

| Section | Description |
|---------|------------|
| Overview | Why this matters for health optimization |
| Science | Research and mechanisms behind the recommendations |
| Protocols | Actionable protocols (beginner → advanced) |
| Common Mistakes | What people get wrong, myths to debunk |
| Peptide Connections | Which peptides relate and how |
| Supplement Connections | Which supplements relate |
| Quick Wins | Easy starting points for beginners |
| Resources | Apps, tools, and metrics to track |

### Guides
- **Subcutaneous Injection Guide** — Needles, syringes, bacteriostatic water, reconstitution, injection technique, FAQs
- **Stacking & Supplements Master Guide** — Popular stacks, universal supplement recommendations by peptide category, contraindications

### Data Stats
- **1,837 markdown files** across 140 directories
- Every file is a self-contained section optimized for vector search retrieval
- Peptides, supplements, and lifestyle topics are cross-referenced throughout

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Mobile App** | React Native / Expo | iOS-first, eventual App Store deployment |
| **Backend API** | Python (FastAPI) | Lightweight, async, perfect for API + RAG |
| **LLM** | Gemini Flash (primary), Claude Haiku (fallback) | Free tier for dev, swappable via LiteLLM |
| **Vector Database** | ChromaDB | Lightweight, embeds with Python, good for small datasets |
| **Knowledge Base** | 1,837 markdown files | Curated, structured, split by section for clean chunking |

## Architecture Principles

- **Mobile app is a thin client** — chat UI only, all logic on the backend
- **LLM has no internet access** — it only sees the context we send it
- **Answers are grounded** — if the data doesn't cover it, the response is "I don't have information on that"
- **LLM provider is swappable** — abstracted via config, not hardcoded
- **All responses are educational** — framed as research, never medical advice
- **Do it right the first time** — no shortcuts with plans to fix later

## Project Structure

```
pepTalk/
├── README.md
├── CLAUDE.md                          # Project instructions and context
├── data/
│   ├── peptides/
│   │   ├── _subcutaneous-injections-guide.md
│   │   ├── _stacking-and-supplements-guide/
│   │   │   ├── popular-stacks.md
│   │   │   ├── supplement-recommendations.md
│   │   │   ├── universal-lifestyle-guidelines.md
│   │   │   ├── universal-contraindications.md
│   │   │   └── key-drug-interactions.md
│   │   ├── semaglutide/
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
│   │   └── ... (61 peptide directories)
│   ├── supplements/
│   │   ├── magnesium/
│   │   │   ├── overview.md
│   │   │   ├── forms-and-bioavailability.md
│   │   │   ├── peptide-synergies.md
│   │   │   └── ... (14 files each)
│   │   └── ... (64 supplement directories)
│   └── lifestyle/
│       ├── sleep/
│       │   ├── overview.md
│       │   ├── protocols.md
│       │   ├── peptide-connections.md
│       │   └── ... (8 files each)
│       └── ... (10 lifestyle directories)
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI entry point
│   │   ├── config.py                  # Settings, system prompt
│   │   ├── dependencies.py            # Shared model + ChromaDB singletons
│   │   ├── graph_utils.py             # Knowledge graph query helpers
│   │   └── routers/
│   │       ├── chat.py                # POST /chat (streaming RAG)
│   │       ├── browse.py              # GET /peptides, /supplements, /lifestyle
│   │       └── search.py              # GET /search, POST /check-conflicts
│   ├── ingest.py                      # Builds vector database from data/
│   ├── build_graph.py                 # Builds knowledge graph from data/
│   ├── requirements.txt               # Python dependencies
│   ├── .env.example                   # API key template
│   ├── .venv/                         # Python virtual environment (gitignored)
│   ├── models/                        # Embedding model (gitignored, ~87MB)
│   │   └── all-MiniLM-L6-v2/         # Local sentence-transformer model
│   ├── chroma_db/                     # Vector database (gitignored)
│   └── graph.json                     # Knowledge graph (gitignored, ~800KB)
└── app/                               # React Native app (coming soon)
```

## Getting Started

```bash
# Clone the repo
git clone <repo-url>
cd pepTalk

# Set up the backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Download the embedding model (~87MB, takes ~10 seconds)
python3 -c "
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
model.save('models/all-MiniLM-L6-v2')
print('Model downloaded.')
"

# Copy .env.example to .env and add your API key
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY (from https://aistudio.google.com/apikey)

# Build the vector database and knowledge graph
python ingest.py        # Embeds 1,837 files into ChromaDB (~6 seconds)
python build_graph.py   # Extracts relationships into graph.json (~1 second)

# Start the server
uvicorn app.main:app --reload
```

The embedding model, vector database, and knowledge graph are all gitignored (large/generated files). This setup rebuilds them locally in under a minute.

## Cost Projections

| Item | Cost |
|------|------|
| LLM API | Free (Gemini Flash) or $5-20/month (Claude Haiku) |
| Backend hosting | $0-5/month (Railway/Fly.io/Render free tiers) |
| Apple Developer | $99/year |
| Vector DB hosting | Negligible (dataset is a few MB) |

## Status

- [x] Knowledge base — 61 peptides with full coverage
- [x] Knowledge base — 64 supplements with full coverage
- [x] Knowledge base — 10 lifestyle topics with full coverage
- [x] Injection and stacking guides
- [x] Backend API (FastAPI + RAG pipeline)
- [x] Vector database ingestion
- [x] Knowledge graph (167 nodes, 5,867 edges)
- [x] Structure-first hybrid retrieval
- [x] Mobile app — Chat UI
- [x] Mobile app — Scheduler & tracker
- [x] Mobile app — User stack management
- [ ] Push notifications for dosing reminders
- [ ] App Store deployment

## Disclaimer

PepTalk is an educational and research tool. All information is presented for informational purposes only and does not constitute medical advice. Always consult with a qualified healthcare provider before starting any peptide, supplement, or lifestyle protocol.
