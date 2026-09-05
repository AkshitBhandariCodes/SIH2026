"""
AURA-BTC Database Reset Utility
Safely clears all ingested data, alerts, and model artifacts,
restoring the database to a pristine, clean schema with 0 rows.
Can be run via python scripts/clean_db.py or called by deletedata.ps1.
"""

import os
import glob
import sys
import duckdb

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_DB_PATH = os.path.join(_PROJECT_ROOT, "data", "aura_database.duckdb")
_SCHEMA_PATH = os.path.join(_PROJECT_ROOT, "data", "schema.sql")
_UPLOADS_DIR = os.path.join(_PROJECT_ROOT, "data", "uploads")
_MODELS_DIR = os.path.join(_PROJECT_ROOT, "models")


def reset_database():
    print("=" * 60)
    print("  AURA-BTC: Resetting Platform & Database to Clean State")
    print("=" * 60)

    # 1. Connect to DuckDB
    print("\n[1/4] Connecting to DuckDB...")
    should_close = False
    try:
        from src.database.connection import get_connection
        con = get_connection()
    except Exception:
        os.makedirs(os.path.dirname(_DB_PATH), exist_ok=True)
        con = duckdb.connect(_DB_PATH)
        should_close = True

    try:
        # 2. Drop existing views and tables
        print("[2/4] Dropping existing views and tables...")
        con.execute("DROP VIEW IF EXISTS v_entity_summary;")
        con.execute("DROP TABLE IF EXISTS alerts;")
        con.execute("DROP TABLE IF EXISTS wallet_features;")
        con.execute("DROP TABLE IF EXISTS wallet_flows;")
        con.execute("DROP TABLE IF EXISTS transactions;")
        con.execute("DROP TABLE IF EXISTS network_events;")
        con.execute("DROP TABLE IF EXISTS geo_asn_lookup;")

        # 3. Re-execute schema.sql
        print("[3/4] Re-initializing pristine database schema from data/schema.sql...")
        if not os.path.exists(_SCHEMA_PATH):
            raise FileNotFoundError(f"Schema file not found at {_SCHEMA_PATH}")

        with open(_SCHEMA_PATH, "r", encoding="utf-8") as f:
            schema_sql = f.read()
        con.execute(schema_sql)

        # 4. Clear uploads and model artifacts
        print("[4/4] Purging upload caches and cached ML models...")
        if os.path.exists(_UPLOADS_DIR):
            for f in glob.glob(os.path.join(_UPLOADS_DIR, "*")):
                try:
                    if os.path.isfile(f):
                        os.remove(f)
                except Exception as e:
                    print(f"  Warning: Could not remove {f}: {e}")

        for model_file in ["anomaly_detector.joblib", "entity_clustering.joblib"]:
            mp = os.path.join(_MODELS_DIR, model_file)
            if os.path.exists(mp):
                try:
                    os.remove(mp)
                    print(f"  Removed model cache: {model_file}")
                except Exception as e:
                    print(f"  Warning: Could not remove {mp}: {e}")

        # Verification
        print("\n" + "-" * 60)
        print("  VERIFICATION: Table Row Counts (Must all be 0)")
        print("-" * 60)
        tables = ["network_events", "transactions", "wallet_flows", "wallet_features", "alerts", "geo_asn_lookup"]
        all_zero = True
        for t in tables:
            cnt = con.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
            status = "CLEAN (0)" if cnt == 0 else f"NOT CLEAN ({cnt})"
            if cnt != 0:
                all_zero = False
            print(f"  - {t:<22} : {status}")

        print("-" * 60)
        if all_zero:
            print("  SUCCESS: Database completely cleared and ready for new data!")
        else:
            print("  WARNING: Some tables still have rows.")
        print("=" * 60)

    finally:
        if should_close:
            con.close()


if __name__ == "__main__":
    reset_database()
