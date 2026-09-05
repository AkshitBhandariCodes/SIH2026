"""
AURA-BTC Feature Extraction
Computes 20 engineered features per wallet using a single SQL CTE query
that joins wallet_flows and network_events.
"""

import pandas as pd

# The 20 feature columns used by the ML models
FEATURE_COLUMNS = [
    "transaction_count",
    "incoming_count",
    "outgoing_count",
    "total_received",
    "total_sent",
    "average_transaction_value",
    "maximum_transaction_value",
    "amount_variance",
    "unique_counterparties",
    "fan_in_degree",
    "fan_out_degree",
    "unique_ip_count",
    "unique_asn_count",
    "unique_country_count",
    "transactions_per_hour",
    "average_time_between_transactions",
    "rapid_transaction_count",
    "graph_degree",
    "in_out_ratio",
    "active_duration_seconds",
]

# Massive CTE query for feature extraction
_FEATURE_QUERY = """
WITH wallet_list AS (
    SELECT DISTINCT wallet AS wallet_address FROM (
        SELECT source_wallet AS wallet FROM wallet_flows
        UNION
        SELECT destination_wallet AS wallet FROM wallet_flows
    ) sub
    WHERE wallet IS NOT NULL AND wallet != ''
),

-- Financial aggregations
financial AS (
    SELECT
        w.wallet_address,
        COUNT(DISTINCT wf.txid) AS transaction_count,
        COUNT(DISTINCT CASE WHEN wf.destination_wallet = w.wallet_address THEN wf.flow_id END) AS incoming_count,
        COUNT(DISTINCT CASE WHEN wf.source_wallet = w.wallet_address THEN wf.flow_id END) AS outgoing_count,
        COALESCE(SUM(CASE WHEN wf.destination_wallet = w.wallet_address THEN wf.amount ELSE 0 END), 0) AS total_received,
        COALESCE(SUM(CASE WHEN wf.source_wallet = w.wallet_address THEN wf.amount ELSE 0 END), 0) AS total_sent,
        COALESCE(AVG(wf.amount), 0) AS average_transaction_value,
        COALESCE(MAX(wf.amount), 0) AS maximum_transaction_value,
        COALESCE(VAR_SAMP(wf.amount), 0) AS amount_variance
    FROM wallet_list w
    LEFT JOIN wallet_flows wf
        ON wf.source_wallet = w.wallet_address OR wf.destination_wallet = w.wallet_address
    GROUP BY w.wallet_address
),

-- Graph metrics
graph_metrics AS (
    SELECT
        w.wallet_address,
        COUNT(DISTINCT CASE
            WHEN wf.source_wallet = w.wallet_address THEN wf.destination_wallet
            WHEN wf.destination_wallet = w.wallet_address THEN wf.source_wallet
        END) AS unique_counterparties,
        COUNT(DISTINCT CASE WHEN wf.destination_wallet = w.wallet_address THEN wf.source_wallet END) AS fan_in_degree,
        COUNT(DISTINCT CASE WHEN wf.source_wallet = w.wallet_address THEN wf.destination_wallet END) AS fan_out_degree
    FROM wallet_list w
    LEFT JOIN wallet_flows wf
        ON wf.source_wallet = w.wallet_address OR wf.destination_wallet = w.wallet_address
    GROUP BY w.wallet_address
),

-- Network diversity (join via txid to network_events)
network_div AS (
    SELECT
        w.wallet_address,
        COUNT(DISTINCT ne.src_ip) AS unique_ip_count,
        COUNT(DISTINCT ne.asn) AS unique_asn_count,
        COUNT(DISTINCT ne.country) AS unique_country_count
    FROM wallet_list w
    LEFT JOIN wallet_flows wf
        ON wf.source_wallet = w.wallet_address OR wf.destination_wallet = w.wallet_address
    LEFT JOIN network_events ne ON ne.txid = wf.txid
    GROUP BY w.wallet_address
),

-- Temporal velocity
temporal AS (
    SELECT
        w.wallet_address,
        CASE
            WHEN COUNT(DISTINCT wf.timestamp) > 1
                AND EXTRACT(EPOCH FROM (MAX(wf.timestamp) - MIN(wf.timestamp))) > 0
            THEN COUNT(DISTINCT wf.flow_id)::DOUBLE / (EXTRACT(EPOCH FROM (MAX(wf.timestamp) - MIN(wf.timestamp))) / 3600.0)
            ELSE 0
        END AS transactions_per_hour,
        CASE
            WHEN COUNT(DISTINCT wf.timestamp) > 1
            THEN EXTRACT(EPOCH FROM (MAX(wf.timestamp) - MIN(wf.timestamp)))::DOUBLE / GREATEST(COUNT(DISTINCT wf.flow_id) - 1, 1)
            ELSE 0
        END AS average_time_between_transactions,
        COALESCE(EXTRACT(EPOCH FROM (MAX(wf.timestamp) - MIN(wf.timestamp))), 0) AS active_duration_seconds
    FROM wallet_list w
    LEFT JOIN wallet_flows wf
        ON wf.source_wallet = w.wallet_address OR wf.destination_wallet = w.wallet_address
    GROUP BY w.wallet_address
)

SELECT
    f.wallet_address,
    f.transaction_count,
    f.incoming_count,
    f.outgoing_count,
    f.total_received,
    f.total_sent,
    f.average_transaction_value,
    f.maximum_transaction_value,
    f.amount_variance,
    g.unique_counterparties,
    g.fan_in_degree,
    g.fan_out_degree,
    n.unique_ip_count,
    n.unique_asn_count,
    n.unique_country_count,
    t.transactions_per_hour,
    t.average_time_between_transactions,
    0 AS rapid_transaction_count,
    (g.fan_in_degree + g.fan_out_degree) AS graph_degree,
    CASE
        WHEN f.outgoing_count > 0 THEN f.incoming_count::DOUBLE / f.outgoing_count
        ELSE 0
    END AS in_out_ratio,
    t.active_duration_seconds
FROM financial f
JOIN graph_metrics g ON f.wallet_address = g.wallet_address
JOIN network_div n ON f.wallet_address = n.wallet_address
JOIN temporal t ON f.wallet_address = t.wallet_address
ORDER BY f.transaction_count DESC
"""


def extract_wallet_features_from_db(con) -> pd.DataFrame:
    """
    Extract 20 engineered features per wallet from DuckDB.

    Uses a single massive CTE query that joins wallet_flows + network_events
    to compute financial aggregations, graph metrics, network diversity,
    and temporal velocity.

    Args:
        con: DuckDB connection

    Returns:
        pd.DataFrame with wallet_address as index and 20 feature columns.
        NaN values are filled with 0.
    """
    df = con.execute(_FEATURE_QUERY).fetchdf()

    if df.empty:
        # Return empty DataFrame with correct columns
        return pd.DataFrame(columns=["wallet_address"] + FEATURE_COLUMNS)

    # Fill NaN with 0
    df[FEATURE_COLUMNS] = df[FEATURE_COLUMNS].fillna(0)

    return df
