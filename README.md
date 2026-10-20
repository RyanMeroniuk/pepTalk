# PepTalk

An AI chat app for researching peptides, supplements, and lifestyle changes. I built it for friends who got curious during the peptide boom and wanted answers grounded in real information instead of forum threads.

You add what you're taking to your stack, log doses day by day, and ask questions. The backend answers from a curated knowledge base of 1,837 markdown files, not from the model's general training data.

> **Not medical advice.** PepTalk is an educational research tool. Talk to a qualified healthcare provider before starting any peptide, supplement, or lifestyle protocol.

## Features

- **AI chat**: ask things like "Can I take magnesium with BPC-157?" or "What should I eat on tirzepatide?" The answer is built from knowledge-base pages, and the sources are shown.
- **Tap-to-add suggestions**: when the AI recommends an item, it appears as a button you can tap to add it to your stack. Every suggestion is checked against the 125 compounds in the knowledge base, so a made-up name never gets added.
- **AI stack review**: reviews your whole stack for conflicts, timing, and doses against the knowledge-base ranges.
- **Daily protocol**: schedule each item by dose, time of day, route (oral, subQ, etc.), and days of the week, then check off doses as you take them. You can browse past and upcoming days.
- **Syringe calculator**: converts a mcg dose into insulin-syringe units from the mg of peptide in the vial and the mL of water added.
- **Works offline for logging**: your stack and dose log are stored on the device.

## How it works

```
React Native app  ──question + stack──▶  FastAPI backend
                                          1. Find relevant knowledge-base pages
                                          2. Add knowledge-graph facts about the stack
                                          3. Send everything to the LLM
                  ◀──answer + sources───  4. Return the answer and suggested items
```

### Retrieval

Each peptide and supplement in the knowledge base is split into the same set of section files: dosing, side effects, drug interactions, and so on. Retrieval uses that layout instead of relying on vector search alone:

1. **Safety pages always come first.** For every item in your stack, the backend fetches its dosing, side-effect, and interaction pages by direct lookup. These never depend on a similarity score, so they can't be missed.
2. **Then vector search fills in the rest.** The question is embedded locally (all-MiniLM-L6-v2, 384 dimensions), and the 8 most similar files across the whole knowledge base are added from ChromaDB.
3. **Items you mention are included too.** If you ask about something that isn't in your stack, it's detected by name or alias (for example, Ozempic resolves to semaglutide), and its pages are pulled the same way.

### Knowledge graph

`build_graph.py` parses 331 interaction and stacking files with regex and keyword rules into a NetworkX graph. It makes no LLM calls and builds in about a second.

- **167 nodes:** 64 supplements, 60 peptides, 28 drugs, 15 conditions
- **5,867 edges** across 6 relationship types: synergizes with, conflicts with, stacks with, contraindicated in, supports, timing conflict

Vector search finds text that *sounds* related. The graph adds explicit facts, like "A conflicts with B", that the model can reason over.

### Dose normalization

Before an AI stack review, each dose is converted into per-dose, per-day, and per-week totals. The model then compares like with like against the knowledge-base ranges. Without this, a weekly total compared to a daily range can look like a 7× overdose that isn't real.

## Knowledge base

| Category | Items | Sections per item |
|---|---|---|
| Peptides | 61 | 14 (overview, mechanisms, dosing, side effects, interactions, foods, regulatory status, ...) |
| Supplements | 64 | 14 (forms and bioavailability, dosing, food sources, absorption, peptide synergies, ...) |
| Lifestyle topics | 10 | 8 (science, protocols, common mistakes, quick wins, ...) |

That's 1,837 markdown files in total, plus guides on subcutaneous injection and stacking.

## Tech stack

| Layer | Technology |
|---|---|
| Mobile app | React Native (Expo) |
| Backend | Python, FastAPI |
| LLM | Gemini Flash through LiteLLM (the provider can be swapped in config) |
| Vector search | ChromaDB with a local sentence-transformers model |
| Knowledge graph | NetworkX, saved as JSON |

## Running locally

**Backend**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Download the embedding model (~87 MB)
python3 -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2').save('models/all-MiniLM-L6-v2')"

# Add your API key (Gemini key from https://aistudio.google.com/apikey)
cp .env.example .env

# Build the vector database and knowledge graph (under a minute)
python ingest.py
python build_graph.py

uvicorn app.main:app --reload --host 0.0.0.0
```

**App**

```bash
cd frontend
npm install
npx expo start
```

Set `API_URL` in `frontend/config.js` to your machine's LAN IP when running on a phone, or to `http://localhost:8000` for the iOS Simulator.

`./dev.sh` starts the backend and the app together once both are set up.

The embedding model, vector database, and graph are gitignored. The steps above rebuild them locally.

## Project structure

```
pepTalk/
├── data/                 # Knowledge base: peptides/, supplements/, lifestyle/
├── backend/
│   ├── app/
│   │   ├── main.py       # FastAPI entry point
│   │   ├── config.py     # Settings and prompts
│   │   ├── item_registry.py  # Item catalog and alias resolution
│   │   ├── graph_utils.py    # Knowledge graph queries
│   │   └── routers/      # chat, search, browse
│   ├── ingest.py         # Builds the ChromaDB index
│   └── build_graph.py    # Builds the knowledge graph
└── frontend/             # React Native (Expo) app
```

## Roadmap

- Stream answers token by token in the app (the backend already streams over SSE)
- Dose reminders through push notifications
- Tests and an evaluation set for answer quality
