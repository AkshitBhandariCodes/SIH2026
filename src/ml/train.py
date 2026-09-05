"""
AURA-BTC Model Training Pipeline
Trains Isolation Forest for anomaly detection and DBSCAN for entity clustering.
All models are saved locally for offline inference.
"""

import os

import joblib
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import RobustScaler

from src.ml.features import FEATURE_COLUMNS, extract_wallet_features_from_db

# Paths relative to project root
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_MODELS_DIR = os.path.join(_PROJECT_ROOT, "models")
_ANOMALY_MODEL_PATH = os.path.join(_MODELS_DIR, "anomaly_detector.joblib")
_CLUSTERING_MODEL_PATH = os.path.join(_MODELS_DIR, "entity_clustering.joblib")

# Minimum wallets required for meaningful training
MIN_WALLETS = 5


def train_offline_models(con) -> dict:
    """
    Complete offline training pipeline:
    1. Extract wallet features from DuckDB
    2. Train RobustScaler → IsolationForest pipeline
    3. Train DBSCAN for entity clustering
    4. Save models to disk
    5. Update wallet_features table with cluster_id

    Args:
        con: DuckDB connection

    Returns:
        Dict with status, wallets_trained, anomalies_detected, clusters_formed

    Raises:
        ValueError: If fewer than MIN_WALLETS wallets are available
    """
    # 1. Extract features
    df = extract_wallet_features_from_db(con)

    if len(df) < MIN_WALLETS:
        raise ValueError(
            f"Need at least {MIN_WALLETS} wallets for training, "
            f"but only found {len(df)}. Ingest more data first."
        )

    # Prepare feature matrix
    X = df[FEATURE_COLUMNS].values.astype(np.float64)

    # Replace any inf/nan
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

    # 2. Train anomaly detection pipeline: RobustScaler → IsolationForest
    anomaly_pipeline = Pipeline([
        ("scaler", RobustScaler()),
        ("detector", IsolationForest(
            n_estimators=150,
            contamination=0.05,
            random_state=42,
            n_jobs=-1,
        )),
    ])
    anomaly_pipeline.fit(X)

    # Get anomaly predictions (-1 = anomaly, 1 = normal)
    predictions = anomaly_pipeline.predict(X)
    anomalies_detected = int(np.sum(predictions == -1))

    # 3. Train DBSCAN clustering
    scaler = RobustScaler()
    X_scaled = scaler.fit_transform(X)

    clustering = DBSCAN(eps=1.5, min_samples=3)
    cluster_labels = clustering.fit_predict(X_scaled)
    clusters_formed = len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0)

    # 4. Save models to disk
    os.makedirs(_MODELS_DIR, exist_ok=True)
    joblib.dump(anomaly_pipeline, _ANOMALY_MODEL_PATH)
    joblib.dump(
        {"scaler": scaler, "clustering": clustering},
        _CLUSTERING_MODEL_PATH,
    )

    # 5. Update wallet_features table with cluster IDs and features
    for i, row in df.iterrows():
        wallet = row["wallet_address"]
        cluster = int(cluster_labels[i])

        # Upsert into wallet_features
        con.execute(
            """
            INSERT INTO wallet_features (
                wallet_address, transaction_count, incoming_count, outgoing_count,
                total_received, total_sent, average_transaction_value,
                maximum_transaction_value, amount_variance, unique_counterparties,
                fan_in_degree, fan_out_degree, unique_ip_count, unique_asn_count,
                unique_country_count, transactions_per_hour,
                average_time_between_transactions, rapid_transaction_count,
                graph_degree, in_out_ratio, active_duration_seconds, cluster_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (wallet_address) DO UPDATE SET
                transaction_count = EXCLUDED.transaction_count,
                incoming_count = EXCLUDED.incoming_count,
                outgoing_count = EXCLUDED.outgoing_count,
                total_received = EXCLUDED.total_received,
                total_sent = EXCLUDED.total_sent,
                average_transaction_value = EXCLUDED.average_transaction_value,
                maximum_transaction_value = EXCLUDED.maximum_transaction_value,
                amount_variance = EXCLUDED.amount_variance,
                unique_counterparties = EXCLUDED.unique_counterparties,
                fan_in_degree = EXCLUDED.fan_in_degree,
                fan_out_degree = EXCLUDED.fan_out_degree,
                unique_ip_count = EXCLUDED.unique_ip_count,
                unique_asn_count = EXCLUDED.unique_asn_count,
                unique_country_count = EXCLUDED.unique_country_count,
                transactions_per_hour = EXCLUDED.transactions_per_hour,
                average_time_between_transactions = EXCLUDED.average_time_between_transactions,
                rapid_transaction_count = EXCLUDED.rapid_transaction_count,
                graph_degree = EXCLUDED.graph_degree,
                in_out_ratio = EXCLUDED.in_out_ratio,
                active_duration_seconds = EXCLUDED.active_duration_seconds,
                cluster_id = EXCLUDED.cluster_id
            """,
            [
                wallet,
                int(row["transaction_count"]),
                int(row["incoming_count"]),
                int(row["outgoing_count"]),
                float(row["total_received"]),
                float(row["total_sent"]),
                float(row["average_transaction_value"]),
                float(row["maximum_transaction_value"]),
                float(row["amount_variance"]),
                int(row["unique_counterparties"]),
                int(row["fan_in_degree"]),
                int(row["fan_out_degree"]),
                int(row["unique_ip_count"]),
                int(row["unique_asn_count"]),
                int(row["unique_country_count"]),
                float(row["transactions_per_hour"]),
                float(row["average_time_between_transactions"]),
                int(row["rapid_transaction_count"]),
                int(row["graph_degree"]),
                float(row["in_out_ratio"]),
                float(row["active_duration_seconds"]),
                cluster,
            ],
        )

    return {
        "status": "SUCCESS",
        "wallets_trained": len(df),
        "anomalies_detected": anomalies_detected,
        "clusters_formed": clusters_formed,
        "model_path": _ANOMALY_MODEL_PATH,
    }
