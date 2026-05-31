"""Item registry + query→item detection.

Single source of truth for item-name normalization and aliases (shared with
``build_graph.py``), plus a runtime registry of valid peptide/supplement slugs
loaded from the data directories. Used to detect which items a free-text chat
question mentions so the retrieval pipeline can pull their sections even when the
item is not in the user's stack.
"""

import re
from functools import lru_cache

from app.config import DATA_DIR

# Brand names, dev codes, and alternate forms → canonical directory slug.
# Shared with build_graph.py (graph construction) so the two never drift.
ITEM_ALIASES = {
    "thymosin-alpha-1": "thymosin-alpha-1", "ta-1": "thymosin-alpha-1",
    "tb-500": "tb-500", "thymosin-beta-4": "tb-500",
    "mk-677": "mk-677", "ibutamoren": "mk-677",
    "mod-grf-1-29": "cjc-1295", "mod-grf": "cjc-1295",
    "bremelanotide": "pt-141", "vyleesi": "pt-141",
    "ozempic": "semaglutide", "wegovy": "semaglutide", "rybelsus": "semaglutide",
    "mounjaro": "tirzepatide", "zepbound": "tirzepatide",
    "ghk-cu": "ghk-cu", "copper-peptide": "ghk-cu",
    "epithalon": "epitalon",
    "5-amino-1mq": "5-amino-1mq",
    "ksm-66": "ashwagandha",
    "fish-oil": "omega-3", "krill-oil": "omega-3", "epa-dha": "omega-3",
    "nmn": "nmn", "nicotinamide-mononucleotide": "nmn",
    "nad": "nad-plus", "nad+": "nad-plus", "nad+-precursors": "nmn",
    # Added 2026-05 — aliases / dev codes / brand names for new entries
    "elamipretide": "ss-31", "mtp-131": "ss-31", "bendavia": "ss-31",
    "am833": "cagrilintide",
    "bi-456906": "survodutide",
    "ibi362": "mazdutide", "ly3305677": "mazdutide",
    "fst-344": "follistatin-344", "follistatin": "follistatin-344",
    "gnrh": "gonadorelin",
    "hng": "humanin",
    "mgf": "peg-mgf", "mechano-growth-factor": "peg-mgf",
    "mini-spadin": "pe-22-28",
    "p021": "p21",
    "acetyl-hexapeptide-8": "argireline", "acetyl-hexapeptide-3": "argireline",
    "acetyl-octapeptide-3": "snap-8",
    "afamelanotide": "melanotan-i", "scenesse": "melanotan-i",
    "mt-1": "melanotan-i", "mt-i": "melanotan-i",
    "thymosin-beta-4-fragment": "ac-sdkp",
    "ramatercept": "ace-031",
    "ftpp": "adipotide",
    "somatropin": "growth-hormone", "hgh": "growth-hormone",
    "genotropin": "growth-hormone", "norditropin": "growth-hormone",
    "humatrope": "growth-hormone", "omnitrope": "growth-hormone",
    "methylene-blue": "methylene-blue", "slu-pp-332": "slu-pp-332",
    # Added 2026-05 — supplement aliases / alternate forms / brand names
    "l-taurine": "taurine",
    "citrulline": "l-citrulline", "citrulline-malate": "l-citrulline",
    "n-acetylcysteine": "nac", "n-acetyl-cysteine": "nac", "n-acetyl-l-cysteine": "nac",
    "cdp-choline": "citicoline", "cytidine-diphosphate-choline": "citicoline", "cognizin": "citicoline",
    "bacopa-monnieri": "bacopa", "brahmi": "bacopa",
    "rhodiola-rosea": "rhodiola", "golden-root": "rhodiola",
    "tyrosine": "l-tyrosine", "n-acetyl-l-tyrosine": "l-tyrosine", "nalt": "l-tyrosine",
    "myo-inositol": "inositol", "d-chiro-inositol": "inositol",
    "lutein": "lutein-zeaxanthin", "zeaxanthin": "lutein-zeaxanthin",
    "eurycoma-longifolia": "tongkat-ali", "longjack": "tongkat-ali",
    "calcium-alpha-ketoglutarate": "ca-akg", "alpha-ketoglutarate": "ca-akg", "akg": "ca-akg",
    "trimethylglycine": "tmg", "betaine": "tmg", "betaine-anhydrous": "tmg",
    "methylsulfonylmethane": "msm",
    "sodium-hyaluronate": "hyaluronic-acid",
    "saffron-extract": "saffron", "crocus-sativus": "saffron",
    "urolithin": "urolithin-a", "mitopure": "urolithin-a",
    "broccoli-sprout-extract": "sulforaphane", "glucoraphanin": "sulforaphane", "sulphoraphane": "sulforaphane",
    "l-ergothioneine": "ergothioneine", "egt": "ergothioneine",
    "tauroursodeoxycholic-acid": "tudca",
    "velvet-bean": "mucuna-pruriens", "mucuna": "mucuna-pruriens",
    "gamma-aminobutyric-acid": "gaba", "pharmagaba": "gaba",
    "5-hydroxytryptophan": "5-htp",
    "tryptophan": "l-tryptophan",
    "dehydroepiandrosterone": "dhea",
    "fadogia": "fadogia-agrestis",
    "vitamin-b-complex": "b-complex", "b-vitamins": "b-complex",
    "lions-mane": "lions-mane", "lion's-mane": "lions-mane",
    "magnesium-glycinate": "magnesium", "magnesium-l-threonate": "magnesium",
    "magnesium-citrate": "magnesium", "magnesium-taurate": "magnesium",
}


def normalize_id(name: str) -> str:
    """Normalize an entity name to a canonical item ID/slug."""
    name = name.lower().strip()
    name = re.sub(r"\s*\(.*?\)\s*", "", name)  # remove parentheticals
    name = name.replace(" ", "-")
    name = name.replace("/", "-")
    name = re.sub(r"-+", "-", name)
    name = name.strip("-")
    return ITEM_ALIASES.get(name, name)


@lru_cache(maxsize=1)
def _item_slugs() -> frozenset:
    """Valid peptide + supplement directory slugs (excludes _guide dirs)."""
    slugs = set()
    for category in ("peptides", "supplements"):
        category_dir = DATA_DIR / category
        if category_dir.exists():
            for entry in category_dir.iterdir():
                if entry.is_dir() and not entry.name.startswith("_"):
                    slugs.add(entry.name)
    return frozenset(slugs)


@lru_cache(maxsize=1)
def _phrase_lookup() -> dict:
    """Searchable phrase → canonical slug.

    Includes each real slug (hyphenated and space-separated forms) plus every
    alias whose target is a real item. Phrases under 3 chars are dropped to avoid
    false positives on short prose words.
    """
    slugs = _item_slugs()
    lookup = {}

    def register(phrase: str, slug: str) -> None:
        phrase = phrase.strip()
        if len(phrase) >= 3:
            lookup[phrase] = slug
            spaced = phrase.replace("-", " ")
            if spaced != phrase:
                lookup[spaced] = slug

    for slug in slugs:
        register(slug, slug)
    for alias, target in ITEM_ALIASES.items():
        if target in slugs:
            register(alias, target)
    return lookup


def detect_items(text: str, exclude=frozenset()) -> list:
    """Return canonical slugs of items mentioned in free text.

    Matches whole words/phrases (longest first, so 'magnesium glycinate' beats
    'magnesium'), skipping anything in ``exclude`` (e.g. items already in the
    user's stack). Order reflects first match by phrase length.
    """
    norm = " " + re.sub(r"[^a-z0-9]+", " ", text.lower()).strip() + " "
    lookup = _phrase_lookup()
    found = []
    seen = set(exclude)
    for phrase in sorted(lookup, key=len, reverse=True):
        slug = lookup[phrase]
        if slug in seen:
            continue
        if f" {phrase} " in norm:
            found.append(slug)
            seen.add(slug)
    return found
