"""
PepTalk Knowledge Graph Builder

Parses relationship-heavy files from data/ and extracts structured relationships
into a NetworkX graph. Uses regex/text parsing — no LLM needed.

Run once to build the graph. Re-run if data files change.

Usage:
    cd backend
    source .venv/bin/activate
    python build_graph.py
"""

import json
import os
import re
from pathlib import Path

import networkx as nx
from networkx.readwrite import json_graph

# Canonical item-name normalization + alias map (shared with the chat retrieval
# pipeline so the two never drift). build_graph runs from backend/, so the `app`
# package is importable.
from app.item_registry import normalize_id

# Config
BACKEND_DIR = Path(__file__).resolve().parent
DATA_DIR = BACKEND_DIR.parent / "data"
GRAPH_PATH = BACKEND_DIR / "graph.json"


# Known entities for type detection
KNOWN_PEPTIDES = {
    "bpc-157", "tb-500", "cjc-1295", "ipamorelin", "mk-677", "tesamorelin",
    "sermorelin", "ghrp-2", "ghrp-6", "hexarelin", "semaglutide", "tirzepatide",
    "retatrutide", "aod-9604", "mots-c", "5-amino-1mq", "semax", "selank",
    "dihexa", "pinealon", "dsip", "epitalon", "thymosin-alpha-1", "thymulin",
    "ll-37", "pt-141", "melanotan-ii", "kisspeptin", "ghk-cu", "kpv", "vip",
    "larazotide",
    # Added 2026-05 — library expansion (28 new entries incl. blends + peptide hormones)
    "ss-31", "cagrilintide", "survodutide", "mazdutide", "follistatin-344",
    "gonadorelin", "oxytocin", "humanin", "foxo4-dri", "peg-mgf", "pe-22-28",
    "p21", "cerebrolysin", "argireline", "snap-8", "melanotan-i", "ac-sdkp",
    "ace-031", "adipotide", "ghrp-1", "glutathione", "glow", "klow",
    "growth-hormone", "insulin", "methylene-blue", "nad-plus", "slu-pp-332",
}

KNOWN_SUPPLEMENTS = {
    "zinc", "magnesium", "selenium", "chromium", "copper", "vitamin-d3",
    "vitamin-c", "b-complex", "vitamin-k2", "l-glutamine", "glycine",
    "creatine", "collagen-peptides", "alpha-gpc", "omega-3", "ashwagandha",
    "lions-mane", "berberine", "turmeric-curcumin", "coq10", "pqq", "nmn",
    "alpha-lipoic-acid", "resveratrol", "melatonin", "l-theanine", "apigenin",
    "tart-cherry-extract", "probiotics", "zinc-carnosine", "glucosamine-chondroitin",
    # Added 2026-05 — supplement library expansion (33 new entries)
    "taurine", "l-citrulline", "nac", "citicoline", "bacopa", "rhodiola",
    "l-tyrosine", "inositol", "astaxanthin", "lutein-zeaxanthin", "tongkat-ali",
    "shilajit", "cordyceps", "reishi", "quercetin", "fisetin", "spermidine",
    "ca-akg", "tmg", "boron", "msm", "hyaluronic-acid", "saffron", "urolithin-a",
    "sulforaphane", "ergothioneine", "tudca", "mucuna-pruriens", "gaba", "5-htp",
    "l-tryptophan", "dhea", "fadogia-agrestis",
}

KNOWN_CONDITIONS = {
    "pregnancy", "breastfeeding", "active-cancer", "cancer", "pancreatitis",
    "mtc-history", "men2-syndrome", "pituitary-tumors", "wilsons-disease",
    "hyperthyroidism", "hypothyroidism", "diabetes", "liver-disease",
    "kidney-disease", "autoimmune", "transplant", "bleeding-disorders",
}


def get_entity_type(entity_id: str) -> str:
    """Determine entity type from its normalized ID."""
    if entity_id in KNOWN_PEPTIDES:
        return "peptide"
    if entity_id in KNOWN_SUPPLEMENTS:
        return "supplement"
    if entity_id in KNOWN_CONDITIONS:
        return "condition"
    return "drug"  # default to drug for unknown entities


def mentions_entity(entity: str, text_lower: str) -> bool:
    """True if `entity` is named in text as a whole token (not a substring).

    Uses alphanumeric boundaries so short IDs like "nac" don't match inside
    words like "inactive" or "erinacine". Hyphens count as boundaries, so both
    "nac" and the spaced "n-acetylcysteine" forms still match standalone.
    """
    spaced = entity.replace("-", " ")
    alt = re.escape(entity) + r"|" + re.escape(spaced)
    pattern = r"(?<![a-z0-9])(?:" + alt + r")(?![a-z0-9])"
    return re.search(pattern, text_lower) is not None


def extract_from_stacking(content: str, source: str, source_type: str) -> list[dict]:
    """Extract STACKS_WITH relationships from stacking-protocols.md files."""
    rels = []
    # Match patterns like: "**Stack Name**: Peptide1 (dose) + Peptide2 (dose) — purpose"
    lines = content.split("\n")
    for line in lines:
        line = line.strip()
        if not line.startswith("- "):
            continue

        # Find bold stack name
        name_match = re.search(r"\*\*(.+?)\*\*", line)
        stack_name = name_match.group(1) if name_match else ""

        # Find entities mentioned (look for known peptides/supplements in the line)
        mentioned = set()
        line_lower = line.lower()
        for entity in KNOWN_PEPTIDES | KNOWN_SUPPLEMENTS:
            # Check for the entity name with word boundaries
            if mentions_entity(entity, line_lower):
                mentioned.add(entity)

        # Create edges between source and each mentioned entity
        mentioned.discard(source)
        for target in mentioned:
            # Extract purpose (text after — or :)
            purpose = ""
            for sep in ["—", "–", ":"]:
                if sep in line:
                    purpose = line.split(sep, 1)[-1].strip()[:150]
                    break

            rels.append({
                "source": source, "target": target,
                "relationship": "STACKS_WITH",
                "stack_name": stack_name,
                "purpose": purpose,
            })

    return rels


def extract_from_drug_interactions(content: str, source: str, source_type: str) -> list[dict]:
    """Extract CONFLICTS_WITH and CONTRAINDICATED_IN from drug-interactions.md."""
    rels = []
    lines = content.split("\n")

    for line in lines:
        line = line.strip()
        if not line.startswith("- "):
            continue

        line_lower = line.lower()

        # Determine severity
        severity = "moderate"
        if "contraindicated" in line_lower:
            severity = "high"
        elif "caution" in line_lower or "monitor" in line_lower:
            severity = "moderate"
        elif "theoretical" in line_lower:
            severity = "theoretical"

        # Check for conditions
        for condition in KNOWN_CONDITIONS:
            if mentions_entity(condition, line_lower):
                mechanism = line.strip("- *").split(":")[-1].strip()[:200] if ":" in line else ""
                rels.append({
                    "source": source, "target": condition,
                    "relationship": "CONTRAINDICATED_IN",
                    "severity": severity,
                    "mechanism": mechanism,
                })

        # Check for known drugs/entities
        for entity in KNOWN_PEPTIDES | KNOWN_SUPPLEMENTS:
            if entity == source:
                continue
            if mentions_entity(entity, line_lower):
                mechanism = line.strip("- *")[:200]
                relationship = "CONFLICTS_WITH"

                # Check if it's a timing conflict
                if any(w in line_lower for w in ["same time", "hours apart", "separate", "timing"]):
                    relationship = "TIMING_CONFLICT"

                rels.append({
                    "source": source, "target": entity,
                    "relationship": relationship,
                    "severity": severity,
                    "mechanism": mechanism,
                })

        # Extract drug class mentions
        drug_classes = {
            "sulfonylureas": "sulfonylureas", "ssris": "ssris", "snris": "snris",
            "benzodiazepines": "benzodiazepines", "maois": "maois",
            "blood thinners": "anticoagulants", "anticoagulants": "anticoagulants",
            "warfarin": "warfarin", "insulin": "insulin",
            "immunosuppressants": "immunosuppressants", "corticosteroids": "corticosteroids",
            "pde5 inhibitors": "pde5-inhibitors", "beta-blockers": "beta-blockers",
            "statins": "statins", "metformin": "metformin",
            "oral contraceptives": "oral-contraceptives",
            "levothyroxine": "levothyroxine", "thyroid meds": "thyroid-medications",
        }

        for drug_name, drug_id in drug_classes.items():
            if drug_name in line_lower:
                mechanism = line.strip("- *")[:200]
                rels.append({
                    "source": source, "target": drug_id,
                    "relationship": "CONFLICTS_WITH",
                    "severity": severity,
                    "mechanism": mechanism,
                })

    return rels


def extract_from_supplement_interactions(content: str, source: str, source_type: str) -> list[dict]:
    """Extract SYNERGIZES_WITH and SUPPORTS from supplement-interactions.md."""
    rels = []
    lines = content.split("\n")

    for line in lines:
        line = line.strip()
        if not line.startswith("- "):
            continue

        line_lower = line.lower()

        # Determine relationship type
        relationship = "SYNERGIZES_WITH"
        strength = "moderate"

        if any(w in line_lower for w in ["synergistic", "best stack", "enhanced by", "critical"]):
            strength = "strong"
        elif any(w in line_lower for w in ["caution", "avoid", "contraindicated", "monitor"]):
            relationship = "CONFLICTS_WITH"
            strength = ""

        # Find mentioned entities
        for entity in KNOWN_PEPTIDES | KNOWN_SUPPLEMENTS:
            if entity == source:
                continue
            if mentions_entity(entity, line_lower):
                mechanism = line.strip("- *")[:200]
                rels.append({
                    "source": source, "target": entity,
                    "relationship": relationship,
                    "strength": strength,
                    "mechanism": mechanism,
                })

    return rels


def extract_from_peptide_synergies(content: str, source: str, source_type: str) -> list[dict]:
    """Extract SYNERGIZES_WITH from peptide-synergies.md.

    Links the source to peptides mentioned (the primary use), and ALSO to other
    supplements mentioned — this captures supplement-supplement clusters like
    GlyNAC (glycine + NAC), the joint stack (MSM + glucosamine + collagen + HA),
    the functional-mushroom trio, and the testosterone cluster.
    """
    rels = []

    # ### headers may name a peptide that scopes the bullets beneath it
    current_peptide = None
    targets_all = KNOWN_PEPTIDES | KNOWN_SUPPLEMENTS
    lines = content.split("\n")

    for line in lines:
        line_stripped = line.strip()

        if line_stripped.startswith("### "):
            # Reset and re-scan the header for a peptide scope
            header_text = line_stripped[4:].strip().lower()
            current_peptide = None
            for peptide in KNOWN_PEPTIDES:
                if peptide.replace("-", " ") in header_text or peptide in header_text:
                    current_peptide = peptide
                    break

        elif line_stripped.startswith("- "):
            line_lower = line_stripped.lower()
            mechanism = line_stripped.strip("- *")[:200]

            matched = set()
            if current_peptide:
                matched.add(current_peptide)
            # Inline mentions of any known peptide OR supplement
            for entity in targets_all:
                if mentions_entity(entity, line_lower):
                    matched.add(entity)

            matched.discard(source)
            for target in matched:
                rels.append({
                    "source": source, "target": target,
                    "relationship": "SYNERGIZES_WITH",
                    "strength": "moderate",
                    "mechanism": mechanism,
                })

    return rels


def extract_from_connections(content: str, source: str, source_type: str, connection_type: str) -> list[dict]:
    """Extract from lifestyle peptide-connections.md and supplement-connections.md."""
    rels = []
    lines = content.split("\n")

    target_set = KNOWN_PEPTIDES if connection_type == "peptide" else KNOWN_SUPPLEMENTS

    for line in lines:
        line_stripped = line.strip()
        if not line_stripped.startswith("- "):
            continue

        line_lower = line_stripped.lower()
        for entity in target_set:
            if mentions_entity(entity, line_lower):
                mechanism = line_stripped.strip("- *")[:200]
                rels.append({
                    "source": source, "target": entity,
                    "relationship": "SUPPORTS",
                    "mechanism": mechanism,
                })

    return rels


def process_file(filepath: Path, source_entity: str, source_type: str) -> list[dict]:
    """Process a single file and extract relationships."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    filename = filepath.name

    if filename == "stacking-protocols.md":
        return extract_from_stacking(content, source_entity, source_type)
    elif filename == "drug-interactions.md":
        return extract_from_drug_interactions(content, source_entity, source_type)
    elif filename == "supplement-interactions.md":
        return extract_from_supplement_interactions(content, source_entity, source_type)
    elif filename == "peptide-synergies.md":
        return extract_from_peptide_synergies(content, source_entity, source_type)
    elif filename == "peptide-connections.md":
        return extract_from_connections(content, source_entity, source_type, "peptide")
    elif filename == "supplement-connections.md":
        return extract_from_connections(content, source_entity, source_type, "supplement")

    return []


def build_graph(all_relationships: list[dict]) -> nx.MultiDiGraph:
    """Build a NetworkX graph from extracted relationships."""
    G = nx.MultiDiGraph()

    for rel in all_relationships:
        source = normalize_id(rel.get("source", ""))
        target = normalize_id(rel.get("target", ""))

        if not source or not target or source == target:
            continue

        source_type = get_entity_type(source)
        target_type = get_entity_type(target)

        # Add nodes
        if not G.has_node(source):
            G.add_node(source, type=source_type, name=source)
        if not G.has_node(target):
            G.add_node(target, type=target_type, name=target)

        # Build edge properties
        props = {"relationship": rel.get("relationship", "RELATED_TO")}
        for key in ["mechanism", "severity", "strength", "protocol", "purpose", "stack_name", "rule"]:
            if rel.get(key):
                props[key] = rel[key]

        G.add_edge(source, target, **props)

        # Bidirectional for symmetric relationships
        if rel.get("relationship") in ("SYNERGIZES_WITH", "STACKS_WITH", "TIMING_CONFLICT"):
            G.add_edge(target, source, **props)

    return G


def main():
    print("PepTalk Knowledge Graph Builder")
    print("=" * 50)

    # Find relationship files
    relationship_files = [
        "stacking-protocols.md", "drug-interactions.md", "supplement-interactions.md",
        "peptide-synergies.md", "peptide-connections.md", "supplement-connections.md",
    ]

    files_to_process = []
    for root, dirs, filenames in os.walk(DATA_DIR):
        for filename in filenames:
            if filename in relationship_files:
                filepath = Path(root) / filename
                rel_path = filepath.relative_to(DATA_DIR)
                parts = list(rel_path.parts)

                top_dir = parts[0]
                item_dir = parts[1] if len(parts) > 2 else None

                if item_dir and not item_dir.startswith("_"):
                    source_type = {"peptides": "peptide", "supplements": "supplement", "lifestyle": "lifestyle"}.get(top_dir, "unknown")
                    files_to_process.append({
                        "path": filepath,
                        "source_entity": item_dir,
                        "source_type": source_type,
                    })

    print(f"Found {len(files_to_process)} relationship files\n")

    # Extract relationships
    all_relationships = []
    for i, file_info in enumerate(files_to_process):
        rels = process_file(
            file_info["path"],
            file_info["source_entity"],
            file_info["source_type"],
        )
        if rels:
            print(f"[{i+1}/{len(files_to_process)}] {file_info['source_entity']}/{file_info['path'].name}: {len(rels)} relationships")
            all_relationships.extend(rels)

    print(f"\nTotal relationships extracted: {len(all_relationships)}")

    # Build graph
    print("\nBuilding graph...")
    G = build_graph(all_relationships)

    # Stats
    node_types = {}
    for node, data in G.nodes(data=True):
        t = data.get("type", "unknown")
        node_types[t] = node_types.get(t, 0) + 1

    edge_types = {}
    for u, v, data in G.edges(data=True):
        t = data.get("relationship", "unknown")
        edge_types[t] = edge_types.get(t, 0) + 1

    print(f"\nNodes: {G.number_of_nodes()}")
    for t, count in sorted(node_types.items()):
        print(f"  {t}: {count}")

    print(f"\nEdges: {G.number_of_edges()}")
    for t, count in sorted(edge_types.items()):
        print(f"  {t}: {count}")

    # Save
    print(f"\nSaving to {GRAPH_PATH}...")
    graph_data = json_graph.node_link_data(G)
    with open(GRAPH_PATH, "w") as f:
        json.dump(graph_data, f, indent=2)
    print(f"Saved ({os.path.getsize(GRAPH_PATH) / 1024:.0f} KB)")

    # Test
    print(f"\n{'=' * 50}")
    print("Test: semaglutide connections")
    if G.has_node("semaglutide"):
        edges = list(G.edges("semaglutide", data=True))
        for _, target, data in edges[:15]:
            rel = data.get("relationship", "?")
            mech = data.get("mechanism", "")[:80]
            print(f"  → {rel} → {target}: {mech}")
        if len(edges) > 15:
            print(f"  ... and {len(edges) - 15} more")
    else:
        print("  semaglutide not found")

    print("\nDone!")


if __name__ == "__main__":
    main()
