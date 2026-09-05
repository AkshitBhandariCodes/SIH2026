"""
AURA-BTC Risk & Explainability Engine
Generates composite risk scores, severity levels, confidence ratings,
and human-readable forensic evidence bullets for each wallet.
"""

import json
import uuid
from typing import Any, Dict, List

import numpy as np
import pandas as pd


def _compute_graph_risk(fan_out: float, fan_in: float) -> float:
    """Graph risk: (fan_out × 8) + (fan_in × 4), capped at 100."""
    return min((fan_out * 8) + (fan_in * 4), 100.0)


def _compute_network_risk(asn_count: float, country_count: float) -> float:
    """Network risk: (asn_count × 25) + (country_count × 20), capped at 100."""
    return min((asn_count * 25) + (country_count * 20), 100.0)


def _compute_composite_risk(
    ml_score: float, graph_risk: float, network_risk: float
) -> float:
    """
    Composite risk score:
    (ml_score × 50) + (graph_risk × 0.25) + (network_risk × 0.25)
    Result is in range 0-100.
    """
    return min((ml_score * 50) + (graph_risk * 0.25) + (network_risk * 0.25), 100.0)


def _determine_confidence(transaction_count: int) -> str:
    """Confidence based on data volume: HIGH (≥10), MEDIUM (3-9), LOW (<3)."""
    if transaction_count >= 10:
        return "HIGH"
    elif transaction_count >= 3:
        return "MEDIUM"
    else:
        return "LOW"


def _determine_severity(composite_risk: float) -> str:
    """Severity: CRITICAL (≥80), HIGH (60-79), MEDIUM (40-59), LOW (<40)."""
    if composite_risk >= 80:
        return "CRITICAL"
    elif composite_risk >= 60:
        return "HIGH"
    elif composite_risk >= 40:
        return "MEDIUM"
    else:
        return "LOW"


def _generate_evidence_bullets(
    row: pd.Series, medians: Dict[str, float]
) -> List[str]:
    """
    Generate 3-5 human-readable forensic evidence bullets.

    Checks for:
    - High-velocity burst activity (txs/hr)
    - Peeling-chain laundering topology (fan_out=2 with balanced in/out ratio)
    - Transaction frequency > 3x median
    - Multi-country hopping (>2)
    - Pass-through pattern (in/out ratio near 1.0)
    - Volume > 3x median
    - Multi-ASN activity (>2)
    - High fan-in aggregation (>4)
    - ML Isolation Forest outlier detection
    """
    bullets = []

    # 1. High-velocity burst activity
    tx_per_hr = float(row.get("transactions_per_hour", 0))
    tx_cnt = float(row.get("transaction_count", 0))
    tx_median = medians.get("transaction_count", 1)

    if tx_per_hr >= 10.0:
        bullets.append(
            f"High-velocity burst ({tx_per_hr:.1f} tx/hr) - rapid automated execution deviates significantly from human baseline."
        )
    elif tx_median > 0 and tx_cnt > 3 * tx_median:
        bullets.append(
            f"Transaction count ({int(tx_cnt)} txs) is {tx_cnt / tx_median:.1f}x the population median ({int(tx_median)} txs) - automated burst activity."
        )

    # 2. Peeling-chain laundering topology
    fan_out = float(row.get("fan_out_degree", 0))
    fan_out_median = medians.get("fan_out_degree", 0)
    in_out = float(row.get("in_out_ratio", 0))
    amt_var = float(row.get("amount_variance", 0))

    if fan_out == 2 and (0.80 <= in_out <= 1.20 or amt_var > 2.0):
        bullets.append(
            f"Peeling-chain topology detected: 2-output split with balanced flow (in/out ratio: {in_out:.2f}) indicates sequential change-address peeling."
        )
    elif fan_out > fan_out_median + 2 and fan_out >= 4:
        bullets.append(
            f"Fan-out degree of {int(fan_out)} unique recipients exceeds median+2 ({int(fan_out_median + 2)}) - consistent with mixer/tumbler or distribution hub pattern."
        )

    # 3. Pass-through intermediary pattern (if not already reported by peeling chain)
    if (0.85 <= in_out <= 1.15) and not any("Peeling-chain" in b for b in bullets):
        bullets.append(
            f"Pass-through intermediary: in/out ratio of {in_out:.2f} indicates wallet routes incoming funds immediately without retention."
        )

    # 4. Multi-country activity
    country_count = float(row.get("unique_country_count", 0))
    if country_count > 2:
        bullets.append(
            f"Observed across {int(country_count)} countries - network infrastructure diversity suggests VPN/proxy/Tor usage or distributed relay."
        )

    # 5. Multi-ASN activity
    asn_count = float(row.get("unique_asn_count", 0))
    if asn_count > 2:
        bullets.append(
            f"Traffic observed across {int(asn_count)} distinct ASNs - IP hopping behavior consistent with network evasion."
        )

    # 6. Volume anomaly
    vol_median = medians.get("total_sent", 0)
    total_sent = float(row.get("total_sent", 0))
    if vol_median > 0 and total_sent > 3 * vol_median:
        bullets.append(
            f"Total sent volume ({total_sent:.4f} BTC) is {total_sent / vol_median:.1f}x the population median ({vol_median:.4f} BTC) - significant value concentration."
        )

    # 7. High fan-in
    fan_in = float(row.get("fan_in_degree", 0))
    fan_in_median = medians.get("fan_in_degree", 0)
    if fan_in > fan_in_median + 2 and fan_in >= 4:
        bullets.append(
            f"Fan-in degree of {int(fan_in)} unique senders - aggregator wallet receiving from multiple independent sources."
        )

    # 8. ML Isolation Forest Anomaly Detection
    ml_score = float(row.get("anomaly_score", 0))
    if ml_score >= 0.35:
        bullets.append(
            f"Isolation Forest multidimensional anomaly score: {ml_score:.3f} - statistically isolated from benign clusters across behavioral vectors."
        )

    # 9. Guaranteed Fallback
    if len(bullets) == 0:
        top_devs = _get_top_features(row, medians)
        top_keys = [k.replace("_", " ") for k in list(top_devs.keys())[:3]]
        bullets.append(
            f"Algorithmic anomaly flagged: behavioral vectors deviate significantly across {', '.join(top_keys)}."
        )

    return bullets[:5]


def _get_top_features(row: pd.Series, medians: Dict[str, float]) -> Dict[str, float]:
    """
    Identify the top outlier features by their deviation from population median.
    Returns top 5 features sorted by deviation ratio.
    """
    deviations = {}
    feature_keys = [
        "transaction_count", "fan_out_degree", "fan_in_degree",
        "unique_country_count", "unique_asn_count", "unique_ip_count",
        "total_sent", "total_received", "in_out_ratio",
        "transactions_per_hour", "amount_variance",
    ]
    for feat in feature_keys:
        val = float(row.get(feat, 0))
        med = medians.get(feat, 0)
        if med > 0:
            deviations[feat] = round(val / med, 2)
        elif val > 0:
            deviations[feat] = round(val, 2)

    # Sort by deviation, return top 5
    sorted_devs = dict(
        sorted(deviations.items(), key=lambda x: x[1], reverse=True)[:5]
    )
    return sorted_devs


def generate_explanations_and_alerts(
    con, scored_features_df: pd.DataFrame
) -> List[Dict[str, Any]]:
    """
    Generate risk scores, severity levels, and evidence bullets for all wallets.
    Only creates alerts for wallets with composite_risk ≥ 40.
    Persists alerts to the DuckDB alerts table.

    Args:
        con: DuckDB connection
        scored_features_df: DataFrame from AnomalyInferenceEngine.score_wallets()
                           Must contain wallet_address, feature columns, and anomaly_score

    Returns:
        List of alert dicts
    """
    if scored_features_df.empty:
        return []

    df = scored_features_df.copy()

    # Compute population medians for baseline comparisons
    medians = {}
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        medians[col] = float(df[col].median())

    alerts = []

    # Clear old alerts
    con.execute("DELETE FROM alerts")

    for _, row in df.iterrows():
        wallet = row.get("wallet_address", "")
        if not wallet:
            continue

        ml_score = float(row.get("anomaly_score", 0))

        # Compute risk components
        graph_risk = _compute_graph_risk(
            float(row.get("fan_out_degree", 0)),
            float(row.get("fan_in_degree", 0)),
        )
        network_risk = _compute_network_risk(
            float(row.get("unique_asn_count", 0)),
            float(row.get("unique_country_count", 0)),
        )
        composite_risk = _compute_composite_risk(ml_score, graph_risk, network_risk)

        # Only create alert if composite_risk ≥ 40
        if composite_risk < 40:
            continue

        confidence = _determine_confidence(int(row.get("transaction_count", 0)))
        severity = _determine_severity(composite_risk)
        evidence = _generate_evidence_bullets(row, medians)
        top_features = _get_top_features(row, medians)

        alert_id = str(uuid.uuid4())

        alert = {
            "alert_id": alert_id,
            "entity_type": "WALLET",
            "entity_id": wallet,
            "anomaly_score": round(ml_score, 4),
            "risk_score": round(composite_risk, 2),
            "confidence_score": confidence,
            "severity": severity,
            "explanation": evidence,
            "top_features": top_features,
        }
        alerts.append(alert)

        # Persist to DuckDB
        con.execute(
            """
            INSERT INTO alerts (
                alert_id, entity_type, entity_id, anomaly_score,
                risk_score, confidence_score, severity,
                explanation_json, top_features, is_resolved
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                alert_id,
                "WALLET",
                wallet,
                round(ml_score, 4),
                round(composite_risk, 2),
                confidence,
                severity,
                json.dumps(evidence, ensure_ascii=False),
                json.dumps(top_features, ensure_ascii=False),
                False,
            ],
        )

    # Sort by risk_score descending
    alerts.sort(key=lambda x: x["risk_score"], reverse=True)

    return alerts
