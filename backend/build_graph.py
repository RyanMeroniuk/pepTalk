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

# Config
BACKEND_DIR = Path(__file__).resolve().parent
DATA_DIR = BACKEND_DIR.parent / "data"
GRAPH_PATH = BACKEND_DIR / "graph.json"


def normalize_id(name: str) -> str:
    """Normalize entity names to consistent IDs."""
    name = name.lower().strip()
    name = re.sub(r"\s*\(.*?\)\s*", "", name)  # remove parentheticals
    name = name.replace(" ", "-")
    name = name.replace("/", "-")
    name = re.sub(r"-+", "-", name)
    name = name.strip("-")

    aliases = {
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
        "nad+": "nmn", "nad+-precursors": "nmn",
        "vitamin-b-complex": "b-complex", "b-vitamins": "b-complex",
        "lions-mane": "lions-mane", "lion's-mane": "lions-mane",
        "magnesium-glycinate": "magnesium", "magnesium-l-threonate": "magnesium",
        "magnesium-citrate": "magnesium", "magnesium-taurate": "magnesium",
    }
    return aliases.get(name, name)


# Known entities for type detection
KNOWN_PEPTIDES = {
    "bpc-157", "tb-500", "cjc-1295", "ipamorelin", "mk-677", "tesamorelin",
    "sermorelin", "ghrp-2", "ghrp-6", "hexarelin", "semaglutide", "tirzepatide",
    "retatrutide", "aod-9604", "mots-c", "5-amino-1mq", "semax", "selank",
    "dihexa", "pinealon", "dsip", "epitalon", "thymosin-alpha-1", "thymulin",
    "ll-37", "pt-141", "melanotan-ii", "kisspeptin", "ghk-cu", "kpv", "vip",
    "larazotide",
}

KNOWN_SUPPLEMENTS = {
    "zinc", "magnesium", "selenium", "chromium", "copper", "vitamin-d3",
    "vitamin-c", "b-complex", "vitamin-k2", "l-glutamine", "glycine",
    "creatine", "collagen-peptides", "alpha-gpc", "omega-3", "ashwagandha",
    "lions-mane", "berberine", "turmeric-curcumin", "coq10", "pqq", "nmn",
    "alpha-lipoic-acid", "resveratrol", "melatonin", "l-theanine", "apigenin",
    "tart-cherry-extract", "probiotics", "zinc-carnosine", "glucosamine-chondroitin",
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
            pattern = re.escape(entity.replace("-", " ")) + r"|" + re.escape(entity)
            if re.search(pattern, line_lower):
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
            pattern = re.escape(condition.replace("-", " ")) + r"|" + re.escape(condition)
            if re.search(pattern, line_lower):
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
            pattern = re.escape(entity.replace("-", " ")) + r"|" + re.escape(entity)
            if re.search(pattern, line_lower):
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
            pattern = re.escape(entity.replace("-", " ")) + r"|" + re.escape(entity)
            if re.search(pattern, line_lower):
                mechanism = line.strip("- *")[:200]
                rels.append({
                    "source": source, "target": entity,
                    "relationship": relationship,
                    "strength": strength,
                    "mechanism": mechanism,
                })

    return rels


def extract_from_peptide_synergies(content: str, source: str, source_type: str) -> list[dict]:
    """Extract SYNERGIZES_WITH from peptide-synergies.md (supplement files)."""
    rels = []

    # These files have ### headers for each peptide
    current_peptide = None
    lines = content.split("\n")

    for line in lines:
        line_stripped = line.strip()

        if line_stripped.startswith("### "):
            # Extract peptide name from header
            header_text = line_stripped[4:].strip()
            for peptide in KNOWN_PEPTIDES:
                if peptide.replace("-", " ") in header_text.lower() or peptide in header_text.lower():
                    current_peptide = peptide
                    break

        elif line_stripped.startswith("- ") and current_peptide:
            mechanism = line_stripped.strip("- *")[:200]
            rels.append({
                "source": source, "target": current_peptide,
                "relationship": "SYNERGIZES_WITH",
                "strength": "moderate",
                "mechanism": mechanism,
            })

        # Also check for inline peptide mentions
        elif line_stripped.startswith("- "):
            line_lower = line_stripped.lower()
            for peptide in KNOWN_PEPTIDES:
                pattern = re.escape(peptide.replace("-", " ")) + r"|" + re.escape(peptide)
                if re.search(pattern, line_lower):
                    mechanism = line_stripped.strip("- *")[:200]
                    rels.append({
                        "source": source, "target": peptide,
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
            pattern = re.escape(entity.replace("-", " ")) + r"|" + re.escape(entity)
            if re.search(pattern, line_lower):
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
