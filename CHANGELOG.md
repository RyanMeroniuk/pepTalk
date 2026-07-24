# Changelog

All notable changes to PepTalk are documented here. Newest first.

## 2026-07-24 — Add-to-stack suggestions back to bottom chips; larger FAB

- **Add-to-stack suggestions:** reverted the inline "＋ Add" pill (RN can't
  reliably vertically-center a rounded control mid-paragraph) back to the bottom
  "SUGGESTED FOR YOUR STACK" chip row. The model still places `{{add:…}}` tags
  inline and the backend still parses them into `suggestions`; `MarkdownBubble`
  now just strips the tags from the displayed text and renders every validated
  suggestion as a chip below the answer. No backend/prompt change.
- **Center "+" FAB:** enlarged from 58→84 px (icon 28→40) with a stronger shadow
  and more lift, so it's clearly the primary action (`components/CenterTabButton.js`).

## 2026-07-19 — Center "+" FAB & Current Stack master list

- **Problem:** adding items was a small quick-action card at the top of the
  Protocol screen (easy to miss, only reachable from that tab), and there was no
  way to see or manage the whole stack at once — the daily view only shows items
  scheduled for the selected date, so removing everything meant flipping through
  many days to find each item.
- **Outcome:**
  - **Center "+" FAB** — a raised circular button now sits in the middle of the
    bottom tab bar, between Protocol and AI, and opens the Add-to-Stack flow from
    anywhere in the app.
  - The top quick action changed from **"Add item" → "Current stack"**, opening a
    new master-list screen.
  - **Current Stack screen** — lists every item in the stack (regardless of
    schedule), grouped into Peptides / Supplements, each row editable in place
    (tap → pre-filled schedule form → update) or removable (with confirm). One
    place to edit or clear the whole stack.
- **Frontend:**
  - `App.js` — added a middle `AddTab` whose `tabBarButton` renders the FAB, plus
    `AddItem` and `CurrentStack` modal routes on the root stack.
  - `components/CenterTabButton.js` (new) — the raised circular "+" button;
    `navigate('AddItem')` bubbles from the tab navigator to the root modal.
  - `screens/AddItemScreen.js` (new) — the add flow (category → item → schedule)
    extracted out of `StackScreen` into its own modal, with the item catalog
    fetched on mount.
  - `screens/CurrentStackScreen.js` (new) — the master list with edit/delete.
  - `components/ScheduleFormModal.js` — new `confirmLabel` and `subtitle` props so
    the same form serves both "Add to Stack" and "Save changes" (edit) modes.
  - `components/QuickActions.js` — the `add` action is now `stack` ("Current
    stack", `onCurrentStack`).
  - `screens/StackScreen.js` — removed the in-screen add flow, its catalog fetch,
    and the load gate (now handled by `AddItemScreen`); QuickActions points at the
    `CurrentStack` modal.

## 2026-07-14 — Inline "＋ Add" buttons from AI answers & Stack Review

- **Problem:** when the AI recommended a peptide/supplement, the user had to
  leave the answer, open the Stack tab, run the 3-step add flow, and re-find the
  item by name. There was no path from a recommendation to the user's stack.
- **Outcome:** the AI now marks each item it actively recommends (and that the
  user isn't already taking) with an **inline tag** placed right where it names
  the item — `{{add:Name|amount|unit|timeSlot}}`. The backend validates each
  against the item registry and streams a `suggestions` SSE event; the app renders
  a tappable **"＋ Add" button inline, beside the recommendation** (so the user can
  tap it while reading, without scrolling), in **both** regular chat and the Stack
  Review AI deep-dive. Tapping opens the schedule form **pre-filled with the AI's
  suggested dose/unit/time**; confirming adds it to the stack. Any validated
  suggestion not placed inline (e.g. the free-text fallback) still appears as a
  chip below the answer.
- **Backend:**
  - `app/config.py` — appended an inline `{{add:…}}`-tag spec to both
    `SYSTEM_PROMPT` and `STACK_REVIEW_PROMPT` (model places the tag next to each
    recommended item; emits none if recommending nothing new).
  - `app/item_registry.py` — new cached `_item_catalog()` (slug → name/category,
    name from each item's `overview.md` H1) and `resolve_recommendation(raw_name)`,
    which normalizes (alias-aware) and validates against real slugs. `_item_slugs()`
    now derives from the catalog (single source).
  - `app/routers/chat.py` — `parse_recommendations()` extracts the inline tags,
    resolves + dedupes items, drops anything in the user's stack, parses dose
    fields, and carries `matchName` (the raw name the model wrote) so the frontend
    can bind a rendered tag to its validated suggestion; `stream_response()` buffers
    the answer and emits the `suggestions` event. Both `/chat` and
    `/chat/stack-review` pass the stack's slugs as the exclusion set. Falls back to
    free-text `detect_items()` when no tags are present.
- **Frontend:**
  - `components/MarkdownBubble.js` — now accepts a `suggestions` prop; transforms
    `{{add:…}}` tags into inline "＋ Add" buttons via a custom markdown `link` rule
    (`add:<slug>` scheme), owns the `ScheduleFormModal` + `addItem`, hides items
    already in the stack/added this session, and renders any un-inlined suggestion
    as a fallback chip.
  - `components/ScheduleFormModal.js` — new optional `initialValues` prop, synced to
    the form each time it opens (manual add flow unchanged); unknown emitted units
    fall back to `mg`.
  - `screens/ChatScreen.js` / `screens/ReviewScreen.js` — pass `suggestions` to
    `MarkdownBubble`; keep tags in the displayed answer but strip them from the chat
    history sent back to the model.
- **Known limitations:** days-of-week defaults to every day for the user to adjust
  — the model emits dose/unit/time only, not a weekly cadence (reliable schedule
  emission is the brittle part). RN can't apply padding/border-radius to inline
  text, so the inline button is an accent-filled "＋ Add" label rather than a bordered
  pill. If the model omits the tags entirely, the backend falls back to free-text
  item detection (lower precision), surfaced as bottom chips.
- **Note:** `components/StackSuggestions.js` (the earlier bottom-chip-only
  component) is now superseded by `MarkdownBubble` and unused.

## 2026-05-30 — Fix intermittently truncated LLM answers

- **Problem:** a chat asking for a daily supplement/lifestyle routine cut off
  mid-sentence before giving any recommendations. The stream completed normally
  (sources rendered), so the model stopped early — most likely an intermittent
  Gemini safety-filter trip on the health/peptide content (it did not reproduce
  deterministically; the same prompt later returned a full answer). The code
  passed no safety settings and discarded `finish_reason`, so the cause was invisible.
- **Fix (`backend/app/routers/chat.py::stream_response` + `config.py`):**
  - Relaxed Gemini safety thresholds to `BLOCK_ONLY_HIGH` (`GEMINI_SAFETY_SETTINGS`),
    appropriate for an educational, grounded tool with disclaimers — reduces
    intermittent blocks on legitimate peptide/supplement content.
  - Set explicit `LLM_MAX_TOKENS` (4096) and a bounded `LLM_REASONING_EFFORT`
    (`low`) so Gemini 2.5's thinking can't starve the visible answer.
  - Gemini-only params are attached conditionally so swapping providers via
    LiteLLM still works.
  - **Capture `finish_reason`** (and whether any content streamed): logged
    server-side, included in the `done` SSE event, and — when the model stops
    abnormally (length/safety/empty) — an inline notice is appended to the answer
    so truncation is never silent again.

## 2026-05-30 — Query-aware retrieval & dynamic chat starters

Compound-specific questions now actually work, and the chat starter prompts no
longer mislead.

### Query→item detection (backend)
- **Problem:** Retrieval only guaranteed sections for items in the user's stack.
  A question about a compound *not* in the stack (e.g. the "What should I eat on
  tirzepatide?" starter) pulled no tirzepatide sections, so — combined with the
  prompt's bias toward the stack — the AI answered about the user's stack instead.
- **Fix:** New `backend/app/item_registry.py` is the single source of truth for
  item slugs + the brand/dev-code/alias map (e.g. Ozempic→semaglutide,
  Mounjaro→tirzepatide), shared with `build_graph.py` (its `normalize_id` now
  imports from here — no behavior change, graph rebuild verified identical).
  `detect_items(text)` finds peptides/supplements named in a question (whole-word,
  longest-match-first, alias-aware). `search_knowledge_base` now adds a third pass
  that expands detected non-stack items with their core + query-relevant sections.
- Added `RAG_MAX_QUERY_ITEMS` config. Added a `SYSTEM_PROMPT` line telling the model
  to answer about a specifically-asked item directly, using the stack only as context.

### Focused retrieval — don't over-share un-asked stack items (backend)
- **Problem:** when a question named one item (e.g. "foods on tirzepatide?"), the
  per-stack-item pass still rank-expanded *every* stack item, dragging each one's
  foods/lifestyle into context — so the answer padded in foods for unrelated stack
  items (GHK-Cu, etc.).
- **Fix:** stack items always contribute their safety-core sections (so interactions
  and overlaps are still caught), but a stack item's other sections are rank-expanded
  only when the question is general or names that item. Strengthened `SYSTEM_PROMPT`
  to mention stack items only for a genuine interaction/overlap/caution, not padding.
  (Semantically-related siblings — e.g. retatrutide when asking about tirzepatide,
  both GLP-1s — can still surface via the global discovery pass, which is desired.)

### Dynamic chat starter prompts (frontend)
- `ChatScreen.js` starter prompts are now built from the user's actual stack
  (`buildStarters`) — e.g. the food question targets a peptide they really take —
  so they always retrieve real context. Empty-stack users get general/educational
  prompts, which also work now via query→item detection.
- Previously the starters just sent their hardcoded `title` as a plain `/chat`
  message (the "tirzepatide" one assumed a compound the user wasn't taking).

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
