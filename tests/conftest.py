"""
AURA-BTC Test Fixtures
Shared pytest fixtures for all test modules.
"""

import os
import sys
import pytest
import duckdb

# Ensure the project root is on the Python path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

_SCHEMA_PATH = os.path.join(_PROJECT_ROOT, "data", "schema.sql")


@pytest.fixture
def duckdb_conn():
    """
    Provides a fresh in-memory DuckDB connection with the full schema loaded.
    Each test gets an independent database — no cross-contamination.
    """
    con = duckdb.connect(":memory:")

    # Load schema
    if os.path.exists(_SCHEMA_PATH):
        with open(_SCHEMA_PATH, "r") as f:
            schema_sql = f.read()
        con.execute(schema_sql)
    else:
        pytest.fail(f"Schema file not found at {_SCHEMA_PATH}")

    yield con
    con.close()
