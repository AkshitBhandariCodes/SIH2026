"""
AURA-BTC Database Connection Manager
Singleton DuckDB connection with automatic schema initialization.
"""

import os
import duckdb
import threading

# Module-level singleton
_connection = None
_lock = threading.Lock()

# Resolve paths relative to the project root
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_DB_PATH = os.path.join(_PROJECT_ROOT, "data", "aura_database.duckdb")
_SCHEMA_PATH = os.path.join(_PROJECT_ROOT, "data", "schema.sql")


def get_connection() -> duckdb.DuckDBPyConnection:
    """
    Returns a singleton DuckDB connection.
    On first call, creates the database file and executes schema.sql.
    Thread-safe via a module-level lock.
    """
    global _connection

    if _connection is not None:
        return _connection

    with _lock:
        # Double-check after acquiring lock
        if _connection is not None:
            return _connection

        # Ensure the data directory exists
        os.makedirs(os.path.dirname(_DB_PATH), exist_ok=True)

        # Create the connection
        _connection = duckdb.connect(_DB_PATH)

        # Initialize schema on first run
        if os.path.exists(_SCHEMA_PATH):
            with open(_SCHEMA_PATH, "r") as f:
                schema_sql = f.read()
            _connection.execute(schema_sql)
        else:
            raise FileNotFoundError(
                f"Schema file not found at {_SCHEMA_PATH}. "
                "Ensure data/schema.sql exists in the project root."
            )

        return _connection


def close_connection() -> None:
    """Gracefully close the singleton DuckDB connection."""
    global _connection
    with _lock:
        if _connection is not None:
            _connection.close()
            _connection = None


def get_in_memory_connection() -> duckdb.DuckDBPyConnection:
    """
    Returns a fresh in-memory DuckDB connection with schema loaded.
    Useful for testing — each call returns an independent connection.
    """
    con = duckdb.connect(":memory:")
    if os.path.exists(_SCHEMA_PATH):
        with open(_SCHEMA_PATH, "r") as f:
            schema_sql = f.read()
        con.execute(schema_sql)
    return con
