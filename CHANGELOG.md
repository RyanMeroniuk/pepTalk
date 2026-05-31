# Changelog

All notable changes to PepTalk are documented here. Newest first.

## 2026-05-30 — Dose accuracy & retrieval overhaul (backend + scheduler)

### Structure-first hybrid retrieval (backend)
Reworked how the chat pipeline selects knowledge-base context so the AI always
has the right sections for the user's stack — not just whatever a fuzzy vector
search happened to rank highly.

- **Problem:** Each knowledge-base section is one coarse chunk embedded by a small
  model, so a relevant section (e.g. a peptide's dosing protocol) often failed to
  rank into the top results. The AI then answered as if the data didn't exist —
  e.g. claiming there was "no recommended daily dose range" for GHK-Cu when the
  file plainly says "1-2mg daily."
- **Fix:** `search_knowledge_base` is now a two-pass hybrid (`backend/app/routers/chat.py`):
  1. **Global discovery (semantic)** — vector search across the whole KB for breadth.
  2. **Per-stack-item (structural)** — for each stack item, always fetch its
     safety-core sections by metadata (`dosing-protocols`, `side-effects`,
     `drug-interactions`, `things-to-avoid`, interactions) *and* rank that item's
     own sections against the question to add the most relevant extras (foods,
     lifestyle, …). Ranking within one item's ~14 sections is far more reliable
     than ranking 1-of-1,837.
- Added reusable retrieval primitives `fetch_item_sections()` and
  `rank_item_sections()` (also usable as agent tools later).
- Stack review (`get_stack_chunks`) now uses the same deterministic fetch with an
  expanded `REVIEW_SECTIONS` set (adds stacking + lifestyle/timing context).
- New config tunables in `backend/app/config.py`: `RAG_PER_ITEM_RELEVANT_K`,
  `RAG_MAX_STACK_ITEMS`.
- No re-ingest required — retrieval logic only.

### Dose × frequency → weekly totals (backend)
The AI now understands a dose in context of how often it's taken.

- The backend serializes each stack item with pre-computed, **unit-labeled**
  figures: per-dose, per-day (for daily items), and a cumulative weekly total
  (`format_stack_for_prompt` in `backend/app/routers/chat.py`). Example:
  `- GHK-Cu [peptide] — 2 mg per dose; taken Daily; = 2 mg per day; = 14 mg per week`.
- Prompt guidance (`SYSTEM_PROMPT` + `STACK_REVIEW_PROMPT` in `config.py`) now tells
  the model to identify whether the knowledge base states a dose **per day** or
  **per week** for that item and compare the matching figure — fixing both the
  weekly-dosed case (e.g. retatrutide 2 mg × 2 days = 4 mg/week) and the
  daily-dosed case (e.g. GHK-Cu 2 mg/day compared against a per-day range, not a
  weekly total).

### Structured dose entry (scheduler / frontend)
- Dose is now stored as structured `doseAmount` (number) + `doseUnit` instead of a
  free-text string — reliable math, no parsing guesswork.
- `ScheduleFormModal` uses a numeric amount input + unit pill selector
  (mg, mcg, IU, g, mL, capsule, …).
- `utils/schedule.js` gains `formatDose`, `parseDose`, `describeFrequency`; legacy
  free-text doses are auto-migrated on load via `migrateItem`.
- Chat and Stack Review now send the full schedule (`doseAmount`, `doseUnit`,
  `daysOfWeek`, `timeSlot`, `route`) to the backend.

### Known limitations
- Sub-weekly cadences (e.g. "every other day") can't be represented by the
  weekly-granularity `daysOfWeek`, so the weekly total can over-count for those —
  tracked for a future schedule-model change.
