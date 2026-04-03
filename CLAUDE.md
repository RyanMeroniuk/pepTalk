# PepTalk - Peptide Research & Recommendation App

## Project Overview
A mobile app that aggregates peptide research data and lets users chat with an LLM to get accurate, research-backed information about peptides. The app recommends supplements and lifestyle habits based on what peptides a user is taking.

## Target Peptides

### Growth Hormone Secretagogues
- **CJC-1295** — GHRH analog (with DAC and without DAC/Mod GRF 1-29)
- **Ipamorelin** — selective GHRP, cleanest GH secretagogue
- **Ibutamoren (MK-677)** — oral GH secretagogue, muscle/fat/sleep
- **Tesamorelin** — FDA-approved GHRH analog, visceral fat reduction
- **Sermorelin** — synthetic GHRH, stimulates natural GH production
- **GHRP-2** — growth hormone releasing peptide, strong GH release, increases appetite
- **GHRP-6** — growth hormone releasing peptide, potent GH release, significant appetite increase
- **Hexarelin** — GHRP, strongest GH release of the secretagogues

### Healing & Tissue Repair
- **BPC-157** — tissue repair, gut healing, neuroprotection
- **TB-500 (Thymosin Beta-4)** — wound healing, tissue repair, anti-inflammatory, flexibility
- **GHK-Cu (Copper Peptide)** — skin regeneration, collagen production, wound healing, anti-aging
- **KPV** — anti-inflammatory tripeptide, gut healing, skin inflammation, wound healing

### Weight Loss & Metabolic
- **Retatrutide** — triple agonist (GLP-1/GIP/glucagon), weight loss, metabolic
- **Semaglutide** — FDA-approved GLP-1 agonist, weight loss, diabetes
- **Tirzepatide** — FDA-approved dual GLP-1/GIP agonist, weight loss, diabetes
- **AOD-9604** — modified GH fragment, targeted fat metabolism without GH side effects
- **MOTS-c** — mitochondrial peptide, exercise mimetic, metabolic, longevity
- **5-Amino-1MQ** — fat metabolism, inhibits NNMT enzyme, weight management

### Nootropic & Cognitive
- **Semax** — nootropic peptide, BDNF upregulation, cognitive enhancement
- **Selank** — anxiolytic peptide, GABA modulation, calm focus, immune support
- **Dihexa** — potent nootropic, synapse formation, crosses blood-brain barrier
- **Pinealon** — neuroprotective tripeptide, memory, circadian rhythm regulation

### Sleep & Recovery
- **DSIP (Delta Sleep-Inducing Peptide)** — sleep regulation, cortisol reduction, circadian rhythm
- **Epitalon (Epithalon)** — telomerase activation, anti-aging, melatonin regulation, sleep

### Immune Support
- **Thymosin Alpha-1** — immune modulation, T-cell function, infection defense, autoimmune
- **Thymulin** — T-cell differentiation, anti-inflammatory, immune regulation
- **LL-37** — antimicrobial peptide, innate immune defense, anti-biofilm

### Sexual Health & Hormonal
- **PT-141 (Bremelanotide)** — FDA-approved for HSDD, sexual arousal, melanocortin agonist
- **Melanotan II** — skin tanning, sexual function, melanocortin agonist
- **Kisspeptin** — reproductive hormone regulation, fertility, gonadotropin release

### Anti-Aging & Longevity
- **NAD+ (and precursors NMN/NR)** — cellular energy, mitochondrial function, DNA repair
- **GHK-Cu** — (also listed under healing) skin anti-aging, collagen, elasticity

### Gut & Anti-Inflammatory
- **VIP (Vasoactive Intestinal Peptide)** — gut health, vasodilation, anti-inflammatory, CIRS/mold illness
- **Larazotide** — tight junction regulator, leaky gut, celiac disease

## Architecture

### Stack
- **Mobile app**: React Native or Expo (iOS target, eventual App Store)
- **Backend API**: Python (FastAPI)
- **LLM Provider**: Gemini Flash free tier (primary), Claude Haiku as fallback
- **RAG Database**: Vector store (ChromaDB or similar) with curated peptide data
- **Data source**: NotebookLM notebook `355d565d-31b7-4bf6-98cc-d2014770c0c7` in `/Users/synovion/notebooklm-py`

### RAG Pipeline
```
User question → Search vector DB → Retrieve relevant chunks → Assemble prompt → Send to LLM API → Response
```
- The LLM API has NO internet access by default — it only sees what we send it
- System prompt instructs the model to answer ONLY from provided context
- If context doesn't cover the question, respond with "I don't have information on that"
- Google Search grounding is OFF by default (opt-in later if we want hybrid)

### Scheduler & Tracker
Like a calorie tracking app, but for peptides and supplements. Core features:
- **Daily protocol view** — Everything the user needs to take today, organized by time (morning, midday, evening, bedtime)
- **Stack management** — Add peptides/supplements with dose, frequency, route (oral, subQ, intranasal), and time of day
- **Dosing reminders** — Push notifications for each scheduled dose
- **Dose logging** — Tap to confirm a dose was taken. Track adherence over time.
- **Cycle tracking** — Set cycle length (e.g., 8 weeks on / 4 off), app tracks position in cycle and reminds when to stop/restart
- **Fasting windows** — For GH peptides requiring fasted injection, show countdown timers based on last logged meal
- **History & calendar** — View any past day, spot missed doses, track consistency
- **Smart conflicts** — Flag timing conflicts from the knowledge base (e.g., zinc + copper same time, eating too close to GH peptide injection)
- **Feeds the AI** — The scheduler data is passed as user context to the RAG pipeline, so the AI knows the user's full active protocol when answering questions

### Key Design Decisions
- Do NOT bundle the LLM model with the app (too large)
- Mobile app is a thin chat UI + scheduler/tracker; all AI logic lives on the backend
- Scheduler data lives on-device (local storage) with optional cloud sync later
- LLM provider is swappable via config (use LiteLLM or similar abstraction)
- Frame all responses as research/education, not medical advice
- System prompt: "You are a peptide research assistant. Provide factual, research-backed information from the provided sources. You are not providing medical advice."

## Data Coverage Per Peptide
Each peptide entry should include:
- Overview and classification
- Mechanisms of action
- Documented benefits (with research backing)
- Dosing protocols (routes, amounts, timing, cycling)
- Side effects and safety profile
- Supplement interactions and recommendations
- Lifestyle recommendations
- Stacking protocols with other peptides
- Drug interactions and contraindications
- Regulatory/FDA status

## NotebookLM Data
Peptide research data is stored in a NotebookLM notebook:
- 75 web sources (clinical studies, FDA docs, research papers)
- 8 comprehensive notes (one per peptide + stacking/lifestyle guide)
- CLI tool at `/Users/synovion/notebooklm-py` (Python venv in `.venv`)
- To query: `cd /Users/synovion/notebooklm-py && source .venv/bin/activate && notebooklm ask "your question"`

## Development Philosophy
- **Do it right the first time.** Never take a shortcut with plans to "fix it later" or "make it fit the standard eventually." That's lazy and leads to compounding tech debt. The only exception is when doing it properly would be insanely difficult or when there's a clear logical reason to defer (e.g., a dependency doesn't exist yet).
- Build to the final standard from day one — data formats, file structures, naming conventions, API contracts. If we know what "right" looks like, just do it now.

## Development
- Primary dev machine: MacBook Air M4 13-inch, 16GB RAM, macOS Tahoe 26.3.1
- Local testing with Ollama is an option but not the primary path
- Gemini Flash free tier: 15 req/min, 1M tokens/day — plenty for dev and light production
- Backend hosting (when ready): Railway, Fly.io, or Render free tiers

## Cost Projections (Production)
- LLM API: $5-20/month (Claude Haiku) or free (Gemini Flash)
- Backend hosting: $0-5/month on free tiers
- Apple Developer: $99/year
- RAG database hosting: negligible (peptide data is a few MB)

## Commands
```bash
# NotebookLM CLI
cd /Users/synovion/notebooklm-py && source .venv/bin/activate
notebooklm ask "question"          # Query the peptide notebook
notebooklm source list             # List sources
notebooklm note list               # List notes
notebooklm source add-research "query" --mode deep --import-all  # Add research
```
