"""
AURA-BTC Graph Engine
Builds a multi-dimensional entity graph (IP ↔ Wallet ↔ TXID ↔ ASN ↔ Country)
using NetworkX MultiDiGraph for forensic link analysis.
"""

from collections import deque
from typing import Any, Dict, List, Optional, Set

import networkx as nx


# ─── Node type constants ─────────────────────────────────────
NODE_TYPE_WALLET = "WALLET"
NODE_TYPE_TRANSACTION = "TRANSACTION"
NODE_TYPE_IP = "IP"
NODE_TYPE_ASN = "ASN"
NODE_TYPE_COUNTRY = "COUNTRY"

# ─── Edge type constants ─────────────────────────────────────
EDGE_INPUT_TO = "INPUT_TO"
EDGE_OUTPUT_TO = "OUTPUT_TO"
EDGE_SENT_TO = "SENT_TO"
EDGE_OBSERVED_WITH = "OBSERVED_WITH"
EDGE_BELONGS_TO_ASN = "BELONGS_TO_ASN"
EDGE_LOCATED_IN_COUNTRY = "LOCATED_IN_COUNTRY"

# Maximum nodes for k-hop subgraph to prevent browser canvas freezing
K_HOP_NODE_CAP = 150


def build_entity_graph_from_duckdb(con) -> nx.MultiDiGraph:
    """
    Build a complete entity graph from DuckDB tables.

    Queries:
      - transactions → TRANSACTION nodes
      - wallet_flows → WALLET nodes + INPUT_TO/OUTPUT_TO/SENT_TO edges
      - network_events → IP/ASN/COUNTRY nodes + OBSERVED_WITH/BELONGS_TO_ASN/LOCATED_IN_COUNTRY edges

    Args:
        con: DuckDB connection object

    Returns:
        nx.MultiDiGraph with typed nodes and edges
    """
    G = nx.MultiDiGraph()

    # ── 1. Add TRANSACTION nodes ─────────────────────────────
    try:
        tx_rows = con.execute(
            "SELECT txid, timestamp, total_input, total_output, fee, script_type "
            "FROM transactions"
        ).fetchall()

        for row in tx_rows:
            txid, ts, total_in, total_out, fee, script = row
            G.add_node(
                txid,
                node_type=NODE_TYPE_TRANSACTION,
                label=txid[:12] + "...",
                timestamp=str(ts) if ts else "",
                total_input=float(total_in or 0),
                total_output=float(total_out or 0),
                fee=float(fee or 0),
                script_type=script or "UNKNOWN",
            )
    except Exception:
        pass  # Table may be empty

    # ── 2. Add WALLET nodes and flow edges ───────────────────
    try:
        flow_rows = con.execute(
            "SELECT flow_id, txid, source_wallet, destination_wallet, amount, timestamp "
            "FROM wallet_flows"
        ).fetchall()

        for row in flow_rows:
            flow_id, txid, src_wallet, dst_wallet, amount, ts = row

            # Add wallet nodes
            if src_wallet and src_wallet not in G:
                G.add_node(
                    src_wallet,
                    node_type=NODE_TYPE_WALLET,
                    label=src_wallet[:12] + "...",
                )
            if dst_wallet and dst_wallet not in G:
                G.add_node(
                    dst_wallet,
                    node_type=NODE_TYPE_WALLET,
                    label=dst_wallet[:12] + "...",
                )

            # Add edges: source_wallet → TXID → destination_wallet
            if src_wallet and txid and txid in G:
                G.add_edge(
                    src_wallet,
                    txid,
                    edge_type=EDGE_INPUT_TO,
                    amount=float(amount or 0),
                    flow_id=flow_id,
                )
            if txid and dst_wallet and txid in G:
                G.add_edge(
                    txid,
                    dst_wallet,
                    edge_type=EDGE_OUTPUT_TO,
                    amount=float(amount or 0),
                    flow_id=flow_id,
                )
            if src_wallet and dst_wallet:
                G.add_edge(
                    src_wallet,
                    dst_wallet,
                    edge_type=EDGE_SENT_TO,
                    amount=float(amount or 0),
                    txid=txid,
                )
    except Exception:
        pass

    # ── 3. Add IP / ASN / COUNTRY nodes and edges ────────────
    try:
        net_rows = con.execute(
            "SELECT DISTINCT txid, src_ip, asn, country FROM network_events "
            "WHERE txid IS NOT NULL AND txid != ''"
        ).fetchall()

        for row in net_rows:
            txid, src_ip, asn, country = row

            # IP node
            if src_ip:
                if src_ip not in G:
                    G.add_node(
                        src_ip,
                        node_type=NODE_TYPE_IP,
                        label=src_ip,
                    )
                # IP ↔ TXID
                if txid and txid in G:
                    G.add_edge(
                        src_ip,
                        txid,
                        edge_type=EDGE_OBSERVED_WITH,
                    )

            # ASN node
            if asn and asn != "UNKNOWN":
                if asn not in G:
                    G.add_node(
                        asn,
                        node_type=NODE_TYPE_ASN,
                        label=asn,
                    )
                if src_ip:
                    G.add_edge(
                        src_ip,
                        asn,
                        edge_type=EDGE_BELONGS_TO_ASN,
                    )

            # Country node
            if country and country != "UNKNOWN":
                if country not in G:
                    G.add_node(
                        country,
                        node_type=NODE_TYPE_COUNTRY,
                        label=country,
                    )
                if src_ip:
                    G.add_edge(
                        src_ip,
                        country,
                        edge_type=EDGE_LOCATED_IN_COUNTRY,
                    )

    except Exception:
        pass

    return G


def get_k_hop_subgraph(
    G: nx.MultiDiGraph, center_node: str, k: int = 2
) -> Dict[str, Any]:
    """
    Extract a k-hop neighborhood subgraph around a center node,
    formatted for Cytoscape.js consumption.

    Uses BFS with a hard cap of 150 nodes to prevent browser freezing.

    Args:
        G: The full entity graph
        center_node: Node ID to center the subgraph on
        k: Number of hops (default 2)

    Returns:
        Dict with "nodes" and "edges" lists in Cytoscape.js format.
        Returns empty lists if center_node not in graph.
    """
    if center_node not in G:
        return {"nodes": [], "edges": []}

    # BFS to collect nodes within k hops
    visited: Set[str] = {center_node}
    queue: deque = deque([(center_node, 0)])

    while queue:
        current, depth = queue.popleft()

        if depth >= k:
            continue

        if len(visited) >= K_HOP_NODE_CAP:
            break

        # Explore both successors and predecessors (undirected BFS)
        neighbors = set(G.successors(current)) | set(G.predecessors(current))
        for neighbor in neighbors:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, depth + 1))

                if len(visited) >= K_HOP_NODE_CAP:
                    break

    # Build Cytoscape.js elements
    cy_nodes = []
    for node_id in visited:
        node_data = dict(G.nodes[node_id])
        node_data["id"] = node_id
        cy_nodes.append({"data": node_data})

    cy_edges = []
    for u, v, key, edge_data in G.edges(keys=True, data=True):
        if u in visited and v in visited:
            ed = dict(edge_data)
            ed["id"] = f"{u}-{v}-{key}"
            ed["source"] = u
            ed["target"] = v
            cy_edges.append({"data": ed})

    return {"nodes": cy_nodes, "edges": cy_edges}


def get_graph_stats(G: nx.MultiDiGraph) -> Dict[str, Any]:
    """
    Compute summary statistics for the entity graph.

    Returns:
        Dict with total_nodes, total_edges, node_types (counts), edge_types (counts)
    """
    node_type_counts: Dict[str, int] = {}
    for _, data in G.nodes(data=True):
        nt = data.get("node_type", "UNKNOWN")
        node_type_counts[nt] = node_type_counts.get(nt, 0) + 1

    edge_type_counts: Dict[str, int] = {}
    for _, _, data in G.edges(data=True):
        et = data.get("edge_type", "UNKNOWN")
        edge_type_counts[et] = edge_type_counts.get(et, 0) + 1

    return {
        "total_nodes": G.number_of_nodes(),
        "total_edges": G.number_of_edges(),
        "node_types": node_type_counts,
        "edge_types": edge_type_counts,
    }
