"""Knowledge graph query utilities."""

import json
from itertools import combinations
from pathlib import Path

import networkx as nx
from networkx.readwrite import json_graph

from app.item_registry import resolve_item_id

GRAPH_PATH = Path(__file__).resolve().parent.parent / "graph.json"

_graph = None


def get_graph() -> nx.MultiDiGraph:
    """Load the knowledge graph (cached after first load)."""
    global _graph
    if _graph is None:
        if not GRAPH_PATH.exists():
            # Return empty graph if not built yet
            _graph = nx.MultiDiGraph()
        else:
            with open(GRAPH_PATH, "r") as f:
                data = json.load(f)
            _graph = json_graph.node_link_graph(data)
    return _graph


def reload_graph():
    """Force reload the graph from disk."""
    global _graph
    _graph = None
    return get_graph()


def get_synergies(item: str) -> list[dict]:
    """Get all supplements/peptides that synergize with an item."""
    G = get_graph()
    item = resolve_item_id(item)
    if not G.has_node(item):
        return []

    synergies = []
    for _, target, data in G.edges(item, data=True):
        if data.get("relationship") in ("SYNERGIZES_WITH", "SUPPORTS"):
            synergies.append({
                "target": target,
                "target_type": G.nodes[target].get("type", "unknown"),
                "relationship": data.get("relationship"),
                "strength": data.get("strength", ""),
                "mechanism": data.get("mechanism", ""),
                "protocol": data.get("protocol", ""),
            })

    # Deduplicate by target
    seen = set()
    unique = []
    for s in synergies:
        if s["target"] not in seen:
            seen.add(s["target"])
            unique.append(s)
    return unique


def get_conflicts(stack: list[str]) -> list[dict]:
    """Find all known conflicts between items in a stack."""
    G = get_graph()
    conflicts = []

    normalized = [resolve_item_id(item) for item in stack]

    for item_a, item_b in combinations(normalized, 2):
        if not G.has_node(item_a) or not G.has_node(item_b):
            continue

        # Check edges in both directions
        for u, v in [(item_a, item_b), (item_b, item_a)]:
            if G.has_edge(u, v):
                for key, data in G[u][v].items():
                    rel = data.get("relationship", "")
                    if rel in ("CONFLICTS_WITH", "TIMING_CONFLICT", "CONTRAINDICATED_IN"):
                        conflicts.append({
                            "items": [item_a, item_b],
                            "relationship": rel,
                            "severity": data.get("severity", "unknown"),
                            "mechanism": data.get("mechanism", ""),
                            "management": data.get("management", ""),
                            "rule": data.get("rule", ""),
                        })

    # Deduplicate
    seen = set()
    unique = []
    for c in conflicts:
        key = (tuple(sorted(c["items"])), c["relationship"])
        if key not in seen:
            seen.add(key)
            unique.append(c)
    return unique


def get_timing_conflicts(stack: list[str]) -> list[dict]:
    """Get items in the stack that shouldn't be taken at the same time."""
    G = get_graph()
    timing = []

    normalized = [resolve_item_id(item) for item in stack]

    for item_a, item_b in combinations(normalized, 2):
        if not G.has_node(item_a) or not G.has_node(item_b):
            continue

        for u, v in [(item_a, item_b), (item_b, item_a)]:
            if G.has_edge(u, v):
                for key, data in G[u][v].items():
                    if data.get("relationship") == "TIMING_CONFLICT":
                        timing.append({
                            "items": [item_a, item_b],
                            "rule": data.get("rule", "Take at different times"),
                            "mechanism": data.get("mechanism", ""),
                        })

    # Deduplicate
    seen = set()
    unique = []
    for t in timing:
        key = tuple(sorted(t["items"]))
        if key not in seen:
            seen.add(key)
            unique.append(t)
    return unique


def get_stack_context(stack: list[str]) -> str:
    """Build a rich text summary of all relationships between stack items.

    This is injected into the LLM prompt so it has explicit relationship
    knowledge beyond what vector search retrieves.
    """
    G = get_graph()
    if G.number_of_nodes() == 0:
        return ""

    normalized = [resolve_item_id(item) for item in stack]
    lines = []

    # Conflicts between stack items
    conflicts = get_conflicts(normalized)
    if conflicts:
        lines.append("KNOWN CONFLICTS in user's stack:")
        for c in conflicts:
            severity = c.get("severity", "")
            mech = c.get("mechanism", "")
            items = " + ".join(c["items"])
            line = f"  ⚠️ {items}: {c['relationship']}"
            if severity:
                line += f" (severity: {severity})"
            if mech:
                line += f" — {mech}"
            lines.append(line)
    else:
        unknown = [item for item in normalized if not G.has_node(item)]
        if unknown:
            # Don't claim "no conflicts" for items the graph knows nothing about
            lines.append(
                "No known conflicts found, but these items are not in the knowledge graph: "
                + ", ".join(unknown)
            )
        elif normalized:
            lines.append("No known conflicts between items in user's stack ✓")

    # Synergies between stack items
    lines.append("")
    lines.append("KNOWN SYNERGIES in user's stack:")
    synergy_found = False
    for item_a, item_b in combinations(normalized, 2):
        if not G.has_node(item_a) or not G.has_node(item_b):
            continue
        for u, v in [(item_a, item_b), (item_b, item_a)]:
            if G.has_edge(u, v):
                for key, data in G[u][v].items():
                    rel = data.get("relationship", "")
                    if rel in ("SYNERGIZES_WITH", "STACKS_WITH", "SUPPORTS"):
                        mech = data.get("mechanism", "")
                        lines.append(f"  ✓ {u} + {v}: {mech}")
                        synergy_found = True
                        break
    if not synergy_found:
        lines.append("  (no explicit synergies found between current stack items)")

    # Key relationships for each stack item
    lines.append("")
    lines.append("KEY RELATIONSHIPS for stack items:")
    for item in normalized:
        if not G.has_node(item):
            continue
        edges = list(G.edges(item, data=True))
        if edges:
            conflict_targets = []
            synergy_targets = []
            for _, target, data in edges[:20]:  # limit to avoid huge context
                rel = data.get("relationship", "")
                if rel in ("CONFLICTS_WITH", "CONTRAINDICATED_IN"):
                    conflict_targets.append(f"{target} ({data.get('severity', '')})")
                elif rel in ("SYNERGIZES_WITH", "SUPPORTS"):
                    synergy_targets.append(target)

            if conflict_targets:
                lines.append(f"  {item} conflicts with: {', '.join(conflict_targets[:8])}")
            if synergy_targets:
                lines.append(f"  {item} pairs well with: {', '.join(synergy_targets[:8])}")

    return "\n".join(lines)


def get_related_items(item: str, depth: int = 1) -> list[dict]:
    """Get everything connected to an item up to N hops away."""
    G = get_graph()
    item = resolve_item_id(item)
    if not G.has_node(item):
        return []

    related = []
    visited = {item}

    current_level = [item]
    for d in range(depth):
        next_level = []
        for node in current_level:
            for _, target, data in G.edges(node, data=True):
                if target not in visited:
                    visited.add(target)
                    next_level.append(target)
                    related.append({
                        "item": target,
                        "type": G.nodes[target].get("type", "unknown"),
                        "relationship": data.get("relationship", ""),
                        "via": node if d > 0 else None,
                        "depth": d + 1,
                    })
        current_level = next_level

    return related


def get_graph_stats() -> dict:
    """Return graph statistics."""
    G = get_graph()

    node_types = {}
    for _, data in G.nodes(data=True):
        t = data.get("type", "unknown")
        node_types[t] = node_types.get(t, 0) + 1

    edge_types = {}
    for _, _, data in G.edges(data=True):
        t = data.get("relationship", "unknown")
        edge_types[t] = edge_types.get(t, 0) + 1

    return {
        "nodes": G.number_of_nodes(),
        "edges": G.number_of_edges(),
        "node_types": node_types,
        "edge_types": edge_types,
    }
