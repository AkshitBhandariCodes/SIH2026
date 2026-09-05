"""
Tests for src.graph.builder
"""

import pytest
import networkx as nx

from src.graph.builder import get_k_hop_subgraph, get_graph_stats, K_HOP_NODE_CAP


def _build_simple_graph():
    """Helper: Build a small test graph."""
    G = nx.MultiDiGraph()
    G.add_node("wallet_A", node_type="WALLET", label="A")
    G.add_node("tx_1", node_type="TRANSACTION", label="TX1")
    G.add_edge("wallet_A", "tx_1", edge_type="INPUT_TO")
    return G


def _build_large_graph(n_nodes=200):
    """Helper: Build a graph with many nodes in a star topology."""
    G = nx.MultiDiGraph()
    G.add_node("center", node_type="WALLET", label="Center")
    for i in range(n_nodes):
        node_id = f"node_{i}"
        G.add_node(node_id, node_type="IP", label=node_id)
        G.add_edge("center", node_id, edge_type="OBSERVED_WITH")
    return G


class TestKHopSubgraph:

    def test_k_hop_single_node(self):
        """k-hop from wallet_A with k=1 should return 2 nodes and 1 edge."""
        G = _build_simple_graph()
        result = get_k_hop_subgraph(G, "wallet_A", k=1)

        assert len(result["nodes"]) == 2
        assert len(result["edges"]) == 1

    def test_k_hop_missing_node(self):
        """k-hop on a node that doesn't exist should return empty."""
        G = _build_simple_graph()
        result = get_k_hop_subgraph(G, "nonexistent_node", k=2)

        assert result["nodes"] == []
        assert result["edges"] == []

    def test_k_hop_limit_150_nodes(self):
        """k-hop subgraph should be capped at 150 nodes max."""
        G = _build_large_graph(200)
        result = get_k_hop_subgraph(G, "center", k=2)

        assert len(result["nodes"]) <= K_HOP_NODE_CAP


class TestGraphStats:

    def test_graph_stats(self):
        """Graph stats should return correct counts and type breakdowns."""
        G = _build_simple_graph()
        stats = get_graph_stats(G)

        assert stats["total_nodes"] == 2
        assert stats["total_edges"] == 1
        assert stats["node_types"]["WALLET"] == 1
        assert stats["node_types"]["TRANSACTION"] == 1
        assert stats["edge_types"]["INPUT_TO"] == 1
