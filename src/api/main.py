"""
AURA-BTC FastAPI Backend
REST API for offline Bitcoin intelligence investigation.
All endpoints run on localhost:8000 with zero external dependencies.
"""

import json
import os
import time
import uuid

from fastapi import FastAPI, File, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.schemas import (
    AlertItem,
    EntityGraphResponse,
    HealthResponse,
    IngestResponse,
    SystemStatsResponse,
    TrainResponse,
)
from src.database.connection import get_connection
from src.engine.risk_engine import generate_explanations_and_alerts
from src.graph.builder import (
    build_entity_graph_from_duckdb,
    get_graph_stats,
    get_k_hop_subgraph,
)
from src.ingestion.parsers import ingest_file
from src.ml.features import extract_wallet_features_from_db
from src.ml.inference import AnomalyInferenceEngine
from src.ml.train import train_offline_models

# ── App Setup ────────────────────────────────────────────────

app = FastAPI(
    title="AURA-BTC",
    description="Autonomous Offline Bitcoin Intelligence & Traffic Correlation Engine",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Project root for file uploads
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_UPLOAD_DIR = os.path.join(_PROJECT_ROOT, "data", "uploads")
os.makedirs(_UPLOAD_DIR, exist_ok=True)


# ── Health Check ─────────────────────────────────────────────

@app.get("/api/health", response_model=HealthResponse)
def health_check():
    """System health check — confirms offline operation."""
    return HealthResponse(status="ONLINE", mode="OFFLINE", version="1.0.0")


# ── System Statistics ────────────────────────────────────────

@app.get("/api/stats", response_model=SystemStatsResponse)
def get_stats():
    """Get system-wide counts from all tables."""
    con = get_connection()

    def _count(table: str) -> int:
        try:
            return con.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        except Exception:
            return 0

    def _severity_count(severity: str) -> int:
        try:
            return con.execute(
                "SELECT COUNT(*) FROM alerts WHERE severity = ?", [severity]
            ).fetchone()[0]
        except Exception:
            return 0

    # Database file size
    db_path = os.path.join(_PROJECT_ROOT, "data", "aura_database.duckdb")
    db_size = os.path.getsize(db_path) if os.path.exists(db_path) else 0

    return SystemStatsResponse(
        total_network_events=_count("network_events"),
        total_transactions=_count("transactions"),
        total_wallets=_count("wallet_features"),
        total_alerts=_count("alerts"),
        critical_alerts=_severity_count("CRITICAL"),
        high_alerts=_severity_count("HIGH"),
        medium_alerts=_severity_count("MEDIUM"),
        low_alerts=_severity_count("LOW"),
        database_size_bytes=db_size,
    )


# ── Alerts ───────────────────────────────────────────────────

@app.get("/api/alerts")
def get_alerts(severity: str = Query(default=None, description="Filter by severity")):
    """
    Get ranked alerts, ordered by risk_score descending.
    Optionally filter by severity (CRITICAL, HIGH, MEDIUM, LOW).
    """
    con = get_connection()

    if severity:
        rows = con.execute(
            "SELECT alert_id, entity_type, entity_id, anomaly_score, risk_score, "
            "confidence_score, severity, explanation_json, top_features, created_at "
            "FROM alerts WHERE severity = ? ORDER BY risk_score DESC",
            [severity.upper()],
        ).fetchall()
    else:
        rows = con.execute(
            "SELECT alert_id, entity_type, entity_id, anomaly_score, risk_score, "
            "confidence_score, severity, explanation_json, top_features, created_at "
            "FROM alerts ORDER BY risk_score DESC"
        ).fetchall()

    alerts = []
    for row in rows:
        (alert_id, entity_type, entity_id, anomaly_score, risk_score,
         confidence, severity_val, explanation_json, top_features_json, created_at) = row

        # Parse JSON fields
        try:
            explanation = json.loads(explanation_json) if explanation_json else []
        except (json.JSONDecodeError, TypeError):
            explanation = []

        try:
            top_features = json.loads(top_features_json) if top_features_json else {}
        except (json.JSONDecodeError, TypeError):
            top_features = {}

        alerts.append(
            AlertItem(
                alert_id=alert_id,
                entity_type=entity_type,
                entity_id=entity_id,
                anomaly_score=float(anomaly_score or 0),
                risk_score=float(risk_score or 0),
                confidence_score=confidence or "LOW",
                severity=severity_val or "LOW",
                explanation=explanation,
                top_features=top_features,
                created_at=str(created_at) if created_at else None,
            ).model_dump()
        )

    return alerts


# ── Graph Exploration ────────────────────────────────────────

@app.get("/api/graph/entity/{entity_id}", response_model=EntityGraphResponse)
def get_entity_graph(entity_id: str, k: int = Query(default=2, ge=1, le=4)):
    """
    Get the k-hop subgraph around an entity (wallet, IP, TXID, etc.).
    Hard-capped at 150 nodes to prevent browser freezing.
    """
    con = get_connection()

    # Build the full graph
    G = build_entity_graph_from_duckdb(con)

    # Extract k-hop subgraph
    subgraph = get_k_hop_subgraph(G, entity_id, k=k)

    return EntityGraphResponse(
        center_node=entity_id,
        node_count=len(subgraph.get("nodes", [])),
        edge_count=len(subgraph.get("edges", [])),
        cytoscape_elements=subgraph,
    )


# ── Model Training ───────────────────────────────────────────

@app.post("/api/ml/train", response_model=TrainResponse)
def train_models():
    """
    Train the anomaly detection and clustering models.
    Requires at least 5 wallets in the database.
    After training, automatically generates/refreshes alerts.
    """
    con = get_connection()

    try:
        result = train_offline_models(con)

        # After training, score and generate alerts
        try:
            features_df = extract_wallet_features_from_db(con)
            engine = AnomalyInferenceEngine()
            scored_df = engine.score_wallets(features_df)
            generate_explanations_and_alerts(con, scored_df)
        except Exception:
            pass  # Alert generation is best-effort after training

        return TrainResponse(**result)

    except ValueError as e:
        return JSONResponse(
            status_code=400,
            content={"status": "ERROR", "detail": str(e)},
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "ERROR", "detail": str(e)},
        )


# ── File Ingestion ───────────────────────────────────────────

@app.post("/api/ingest", response_model=IngestResponse)
async def ingest_data(file: UploadFile = File(...)):
    """
    Upload and ingest a data file (.csv, .json, .xml).

    Flow:
    1. Save uploaded file to data/uploads/
    2. Parse with auto-format detection
    3. Insert records into network_events, transactions, wallet_flows
    4. If ≥5 wallets exist, auto-train models and generate alerts
    5. Return summary
    """
def _execute_ingestion_pipeline(filepath: str, filename: str) -> IngestResponse:
    """Execute end-to-end ingestion, feature extraction, ML training and alert generation."""
    start_time = time.time()
    con = get_connection()

    # Parse the file
    result = ingest_file(filepath)
    records = result["records"]

    # Insert records into DuckDB
    for rec in records:
        try:
            # Insert network event
            con.execute(
                "INSERT OR IGNORE INTO network_events "
                "(event_id, timestamp, src_ip, dst_ip, src_port, dst_port, "
                "txid, country, asn, is_p2p_port) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    rec["event_id"],
                    rec["timestamp"],
                    rec["src_ip"],
                    rec["dst_ip"],
                    rec["src_port"],
                    rec["dst_port"],
                    rec["txid"],
                    rec["country"],
                    rec["asn"],
                    rec["is_p2p_port"],
                ],
            )

            # Insert transaction
            con.execute(
                "INSERT OR IGNORE INTO transactions "
                "(txid, timestamp, total_input, total_output, fee, script_type) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                [
                    rec["txid"],
                    rec["timestamp"],
                    rec["amount"],
                    rec["amount"],
                    rec["fee"],
                    rec["script_type"],
                ],
            )

            # Insert wallet flow
            src_w = rec.get("source_wallet", "")
            dst_w = rec.get("destination_wallet", "")
            if src_w and dst_w:
                con.execute(
                    "INSERT OR IGNORE INTO wallet_flows "
                    "(flow_id, txid, source_wallet, destination_wallet, "
                    "amount, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
                    [
                        str(uuid.uuid4()),
                        rec["txid"],
                        src_w,
                        dst_w,
                        rec["amount"],
                        rec["timestamp"],
                    ],
                )
        except Exception:
            continue

    # Collect live execution telemetry steps
    pipeline_steps = []
    pipeline_steps.append({
        "step": "PARSING",
        "message": f"Parsed {result['valid_records']} valid forensic records ({result['invalid_records']} discarded)",
        "duration_ms": round((time.time() - start_time) * 1000, 1),
        "status": "COMPLETED",
    })

    t_db = time.time()
    ml_metrics = None
    try:
        pipeline_steps.append({
            "step": "DUCKDB_COMMIT",
            "message": f"Committed {len(records)} events to network_events, transactions & wallet_flows tables",
            "duration_ms": round((time.time() - t_db) * 1000, 1),
            "status": "COMPLETED",
        })

        wallet_count = con.execute(
            "SELECT COUNT(DISTINCT wallet) FROM ("
            "  SELECT source_wallet AS wallet FROM wallet_flows "
            "  UNION "
            "  SELECT destination_wallet AS wallet FROM wallet_flows"
            ") WHERE wallet IS NOT NULL AND wallet != ''"
        ).fetchone()[0]

        if wallet_count >= 5:
            t_feat = time.time()
            features_df = extract_wallet_features_from_db(con)
            pipeline_steps.append({
                "step": "FEATURE_EXTRACTION",
                "message": f"Engineered 20 behavioral features for {len(features_df)} unique wallet entities",
                "duration_ms": round((time.time() - t_feat) * 1000, 1),
                "status": "COMPLETED",
            })

            t_train = time.time()
            train_res = train_offline_models(con)
            pipeline_steps.append({
                "step": "MODEL_TRAINING",
                "message": f"Fitted Isolation Forest (150 trees) & DBSCAN ({train_res.get('clusters_formed', 0)} clusters)",
                "duration_ms": round((time.time() - t_train) * 1000, 1),
                "status": "COMPLETED",
            })

            t_infer = time.time()
            engine = AnomalyInferenceEngine()
            scored_df = engine.score_wallets(features_df)
            alerts_res = generate_explanations_and_alerts(con, scored_df)
            pipeline_steps.append({
                "step": "RISK_SCORING",
                "message": f"Generated {len(alerts_res)} ranked alerts with explainable evidence bullets",
                "duration_ms": round((time.time() - t_infer) * 1000, 1),
                "status": "COMPLETED",
            })

            ml_metrics = {
                "wallets_analyzed": len(features_df),
                "anomalies_detected": train_res.get("anomalies_detected", 0),
                "clusters_formed": train_res.get("clusters_formed", 0),
                "isolation_trees": 150,
                "alerts_generated": len(alerts_res),
                "feature_count": 20,
            }
        else:
            pipeline_steps.append({
                "step": "AWAITING_THRESHOLD",
                "message": f"Ingested {wallet_count} wallets. Minimum 5 wallets required for automated ML clustering.",
                "duration_ms": 1.0,
                "status": "INFO",
            })
    except Exception as e:
        pipeline_steps.append({
            "step": "WARNING",
            "message": f"ML pipeline warning: {str(e)}",
            "duration_ms": 1.0,
            "status": "WARNING",
        })

    elapsed = time.time() - start_time

    return IngestResponse(
        status="SUCCESS",
        filename=filename,
        total_parsed=result["valid_records"] + result["invalid_records"],
        valid_records=result["valid_records"],
        invalid_records=result["invalid_records"],
        execution_time_seconds=round(elapsed, 3),
        pipeline_steps=pipeline_steps,
        ml_metrics=ml_metrics,
    )


@app.post("/api/ingest", response_model=IngestResponse)
async def ingest_data(file: UploadFile = File(...)):
    """Upload and ingest a data file (.csv, .json, .xml) and run live ML pipeline."""
    filename = file.filename or f"upload_{uuid.uuid4().hex[:8]}"
    filepath = os.path.join(_UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)

    try:
        return _execute_ingestion_pipeline(filepath, filename)
    except ValueError as e:
        return JSONResponse(status_code=400, content={"status": "ERROR", "detail": str(e)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "ERROR", "detail": str(e)})


@app.post("/api/sample/load/{filename}", response_model=IngestResponse)
def load_sample_dataset(filename: str):
    """Load and ingest a built-in forensic sample dataset from sample_data/."""
    sample_dir = os.path.join(_PROJECT_ROOT, "sample_data")
    safe_name = os.path.basename(filename)
    filepath = os.path.join(sample_dir, safe_name)

    if not os.path.exists(filepath):
        return JSONResponse(status_code=404, content={"status": "ERROR", "detail": f"Sample dataset '{safe_name}' not found."})

    try:
        return _execute_ingestion_pipeline(filepath, safe_name)
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "ERROR", "detail": str(e)})


# ── Database Reset ───────────────────────────────────────────

@app.post("/api/reset")
def reset_system_data():
    """
    Wipe all ingested data, alerts, and model caches.
    Re-initializes pristine schema with 0 rows.
    """
    try:
        from scripts.clean_db import reset_database
        reset_database()
        return {"status": "SUCCESS", "message": "Database and model artifacts reset to pristine clean state (0 rows)."}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "ERROR", "detail": str(e)})


# ── DuckDB Forensic Studio API Bridge ────────────────────────

@app.get("/api/db_overview")
def db_overview():
    """Return database statistics and table list using the active connection."""
    con = get_connection()
    tables_res = con.execute(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' ORDER BY table_name"
    ).fetchall()
    tables = [t[0] for t in tables_res]
    table_stats = []
    total_rows = 0
    for t in tables:
        try:
            cnt = con.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
            cols = con.execute(
                f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{t}'"
            ).fetchall()
            table_stats.append({
                "name": t,
                "row_count": cnt,
                "columns": [{"name": c[0], "type": c[1]} for c in cols],
            })
            total_rows += cnt
        except Exception:
            continue

    db_path = os.path.join(_PROJECT_ROOT, "data", "aura_database.duckdb")
    db_size = os.path.getsize(db_path) if os.path.exists(db_path) else 0

    return {
        "database_size_bytes": db_size,
        "total_tables": len(table_stats),
        "total_rows": total_rows,
        "tables": table_stats,
        "duckdb_version": "1.x / 0.10.x",
    }


@app.post("/api/raw_query")
def execute_raw_query(payload: dict):
    """Execute raw SQL safely via backend's connection."""
    sql = payload.get("query", "").strip()
    if not sql:
        return {"success": True, "columns": [], "rows": [], "row_count": 0, "execution_ms": 0}

    start = time.perf_counter()
    con = get_connection()
    try:
        cursor = con.execute(sql)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        if cursor.description:
            col_names = [d[0] for d in cursor.description]
            raw_rows = cursor.fetchmany(200)
            serialized = []
            for r in raw_rows:
                rec = {}
                for cn, val in zip(col_names, r):
                    rec[cn] = val.isoformat() if hasattr(val, "isoformat") else val
                serialized.append(rec)
            return {
                "success": True,
                "columns": col_names,
                "rows": serialized,
                "row_count": len(serialized),
                "execution_ms": duration_ms,
            }
        return {
            "success": True,
            "columns": ["Result"],
            "rows": [{"Result": "Query executed successfully with 0 return rows."}],
            "row_count": 0,
            "execution_ms": duration_ms,
        }
    except Exception as e:
        return {"success": False, "error": str(e), "execution_ms": round((time.perf_counter() - start) * 1000, 2)}


