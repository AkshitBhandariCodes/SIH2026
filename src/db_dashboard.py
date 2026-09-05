"""
AURA-BTC DuckDB Forensic Database Studio
Dedicated Database Dashboard running on port 8080.
Provides live table inspection, row counts, schema exploration, and an interactive SQL query terminal.
100% offline, zero external dependencies.
"""

import json
import os
import time
import duckdb
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_DB_PATH = os.path.join(_PROJECT_ROOT, "data", "aura_database.duckdb")

app = FastAPI(
    title="AURA-BTC DuckDB Studio",
    description="Offline DuckDB Forensic Database Dashboard & Interactive SQL Console",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    query: str


def _get_read_connection():
    """Create a read-only concurrent connection to DuckDB."""
    os.makedirs(os.path.dirname(_DB_PATH), exist_ok=True)
    return duckdb.connect(_DB_PATH, read_only=True)


import urllib.request
import urllib.error

_BACKEND_URL = "http://127.0.0.1:8000"


def _call_backend_json(path: str, method: str = "GET", data: dict = None):
    """Helper to query backend API with low timeout."""
    try:
        url = f"{_BACKEND_URL}{path}"
        req_data = json.dumps(data).encode("utf-8") if data else None
        headers = {"Content-Type": "application/json"} if data else {}
        req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=1.5) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception:
        return None


@app.get("/api/health")
def health():
    return {
        "status": "ONLINE",
        "service": "DuckDB Forensic Studio",
        "port": 8080,
        "database": _DB_PATH,
        "exists": os.path.exists(_DB_PATH),
    }


@app.get("/api/overview")
def get_overview():
    """Return database statistics and list of tables with row counts."""
    # 1. Try backend API bridge first (handles file locks gracefully)
    remote = _call_backend_json("/api/db_overview")
    if remote:
        return remote

    # 2. Fallback to direct local connection
    if not os.path.exists(_DB_PATH):
        return {"tables": [], "database_size_bytes": 0, "total_rows": 0}

    try:
        con = _get_read_connection()
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

        db_size = os.path.getsize(_DB_PATH) if os.path.exists(_DB_PATH) else 0

        return {
            "database_size_bytes": db_size,
            "total_tables": len(table_stats),
            "total_rows": total_rows,
            "tables": table_stats,
            "duckdb_version": duckdb.__version__,
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        try:
            con.close()
        except Exception:
            pass


@app.get("/api/table/{table_name}")
def get_table_data(table_name: str, limit: int = 50, offset: int = 0):
    """Fetch paginated records for a specific table."""
    # Try via raw_query on backend
    query = f'SELECT * FROM "{table_name}" LIMIT {limit} OFFSET {offset};'
    res = execute_query(QueryRequest(query=query))
    if isinstance(res, dict) and res.get("success"):
        cols = [{"name": c, "type": "VARCHAR"} for c in res.get("columns", [])]
        return {
            "table": table_name,
            "total": res.get("row_count", 0),
            "limit": limit,
            "offset": offset,
            "columns": cols,
            "rows": res.get("rows", []),
        }
    return {"table": table_name, "total": 0, "limit": limit, "offset": offset, "columns": [], "rows": []}


@app.post("/api/query")
def execute_query(req: QueryRequest):
    """Execute raw SQL query with execution timing and error capture."""
    sql = req.query.strip()
    if not sql:
        return {"columns": [], "rows": [], "row_count": 0, "execution_ms": 0}

    # 1. Try backend API bridge first
    remote = _call_backend_json("/api/raw_query", method="POST", data={"query": sql})
    if remote:
        return remote

    # 2. Fallback to direct DuckDB
    start_time = time.perf_counter()
    try:
        con = _get_read_connection()
        cursor = con.execute(sql)
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        if cursor.description:
            col_names = [d[0] for d in cursor.description]
            raw_rows = cursor.fetchmany(200)
            serialized_rows = []
            for row in raw_rows:
                record = {}
                for col_name, val in zip(col_names, row):
                    if hasattr(val, "isoformat"):
                        record[col_name] = val.isoformat()
                    else:
                        record[col_name] = val
                serialized_rows.append(record)

            return {
                "success": True,
                "columns": col_names,
                "rows": serialized_rows,
                "row_count": len(serialized_rows),
                "execution_ms": duration_ms,
            }
        else:
            return {
                "success": True,
                "columns": ["Result"],
                "rows": [{"Result": "Query executed successfully with 0 return rows."}],
                "row_count": 0,
                "execution_ms": duration_ms,
            }
    except Exception as e:
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "success": False,
            "error": str(e),
            "execution_ms": duration_ms,
        }
    finally:
        try:
            con.close()
        except Exception:
            pass


@app.get("/", response_class=HTMLResponse)
def serve_dashboard():
    """Serve the sleek DuckDB Forensic Studio HTML interface."""
    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AURA-BTC | DuckDB Forensic Studio</title>
  <style>
    :root {
      --bg: #090a0f;
      --card-bg: #12151f;
      --card-border: #1e2433;
      --text: #f1f5f9;
      --text-mute: #818cf8;
      --accent: #00d2ff;
      --accent-purple: #7928ca;
      --accent-green: #00f5a0;
      --accent-red: #ff0055;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      --mono: "SF Mono", "Fira Code", Consolas, Menlo, monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font);
      font-size: 13px;
      line-height: 1.5;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    header {
      background: linear-gradient(90deg, #111422 0%, #171b2e 100%);
      border-bottom: 1px solid var(--card-border);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-badge {
      background: linear-gradient(135deg, #00d2ff 0%, #7928ca 100%);
      color: #000;
      font-weight: 800;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 4px;
      letter-spacing: 1px;
    }
    .title {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }
    .stats-bar {
      display: flex;
      gap: 16px;
      font-size: 12px;
    }
    .stat-pill {
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--card-border);
      padding: 4px 10px;
      border-radius: 6px;
      display: flex;
      gap: 6px;
    }
    .stat-val { font-weight: 700; color: var(--accent); }
    .layout {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    aside {
      width: 260px;
      background: #0d101a;
      border-right: 1px solid var(--card-border);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow-y: auto;
    }
    aside h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #94a3b8;
      margin-bottom: 4px;
    }
    .table-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .table-item {
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 1px solid transparent;
      transition: all 0.15s;
    }
    .table-item:hover {
      background: rgba(0, 210, 255, 0.08);
      border-color: rgba(0, 210, 255, 0.2);
    }
    .table-item.active {
      background: rgba(0, 210, 255, 0.15);
      border-color: var(--accent);
      color: #fff;
      font-weight: 600;
    }
    .badge {
      background: #1e2433;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-family: var(--mono);
      color: #cbd5e1;
    }
    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: var(--bg);
      overflow: hidden;
    }
    .console-pane {
      background: #0f121d;
      border-bottom: 1px solid var(--card-border);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .presets {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }
    .preset-label {
      font-size: 11px;
      color: #94a3b8;
      font-weight: 600;
    }
    .preset-btn {
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--card-border);
      color: #e2e8f0;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s;
      font-family: var(--mono);
    }
    .preset-btn:hover {
      background: var(--accent);
      color: #000;
      border-color: var(--accent);
    }
    .query-box {
      display: flex;
      gap: 10px;
    }
    textarea {
      flex: 1;
      background: #07090e;
      border: 1px solid var(--card-border);
      border-radius: 6px;
      color: #00f5a0;
      font-family: var(--mono);
      font-size: 12px;
      padding: 10px 12px;
      resize: vertical;
      min-height: 65px;
      outline: none;
    }
    textarea:focus { border-color: var(--accent); }
    .run-btn {
      background: linear-gradient(135deg, #00d2ff 0%, #0070f3 100%);
      color: #000;
      font-weight: 700;
      border: none;
      border-radius: 6px;
      padding: 0 20px;
      cursor: pointer;
      font-size: 12px;
      letter-spacing: 0.5px;
      transition: opacity 0.2s;
    }
    .run-btn:hover { opacity: 0.9; }
    .results-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 16px;
    }
    .results-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .table-container {
      flex: 1;
      overflow: auto;
      border: 1px solid var(--card-border);
      border-radius: 6px;
      background: #0b0e17;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-family: var(--mono);
      font-size: 11px;
      text-align: left;
    }
    th {
      position: sticky;
      top: 0;
      background: #141926;
      padding: 8px 12px;
      border-bottom: 1px solid var(--card-border);
      color: #94a3b8;
      font-weight: 600;
      white-space: nowrap;
      z-index: 2;
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid #161b28;
      white-space: nowrap;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    tr:hover td { background: rgba(255,255,255,0.03); }
    .status-tag {
      font-size: 11px;
      color: var(--accent-green);
      font-family: var(--mono);
    }
    .error-box {
      background: rgba(255, 0, 85, 0.1);
      border: 1px solid var(--accent-red);
      color: #ff6b8b;
      padding: 12px;
      border-radius: 6px;
      font-family: var(--mono);
      font-size: 12px;
      margin-top: 10px;
    }
    .refresh-btn {
      background: transparent;
      border: 1px solid var(--card-border);
      color: #cbd5e1;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
    }
    .refresh-btn:hover { border-color: var(--accent); color: var(--accent); }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span class="logo-badge">DUCKDB</span>
      <span class="title">AURA-BTC Forensic Database Studio</span>
    </div>
    <div class="stats-bar">
      <div class="stat-pill">Tables: <span class="stat-val" id="stat-tables">-</span></div>
      <div class="stat-pill">Total Rows: <span class="stat-val" id="stat-rows">-</span></div>
      <div class="stat-pill">DB Size: <span class="stat-val" id="stat-size">-</span></div>
      <div class="stat-pill">Engine: <span class="stat-val" id="stat-engine">-</span></div>
      <button class="refresh-btn" onclick="loadOverview()">↻ Refresh</button>
    </div>
  </header>

  <div class="layout">
    <aside>
      <h3>Forensic Tables</h3>
      <ul class="table-list" id="table-list">
        <li style="color: #64748b; padding: 8px;">Loading tables...</li>
      </ul>
      <div style="margin-top: auto; padding-top: 12px; border-top: 1px solid var(--card-border); font-size: 11px; color: #64748b;">
        Offline Air-Gapped Engine<br/>Localhost:8080
      </div>
    </aside>

    <main>
      <div class="console-pane">
        <div class="presets">
          <span class="preset-label">Forensic Presets:</span>
          <button class="preset-btn" onclick="setQuery('SELECT * FROM alerts ORDER BY risk_score DESC LIMIT 20;')">Top Alerts</button>
          <button class="preset-btn" onclick="setQuery('SELECT * FROM wallet_features WHERE fan_out_degree > 3 ORDER BY fan_out_degree DESC;')">Mixer Fan-Out</button>
          <button class="preset-btn" onclick="setQuery('SELECT src_ip, country, asn, count(*) as tx_cnt FROM network_events GROUP BY src_ip, country, asn ORDER BY tx_cnt DESC LIMIT 15;')">IP Telemetry</button>
          <button class="preset-btn" onclick="setQuery('SELECT source_wallet, destination_wallet, amount FROM wallet_flows ORDER BY amount DESC LIMIT 15;')">Top Flows</button>
          <button class="preset-btn" onclick="setQuery('SELECT severity, count(*) as count FROM alerts GROUP BY severity;')">Alert Triage Summary</button>
        </div>
        <div class="query-box">
          <textarea id="sql-input" placeholder="Enter SQL query (e.g. SELECT * FROM alerts LIMIT 10;)">SELECT * FROM alerts ORDER BY risk_score DESC LIMIT 10;</textarea>
          <button class="run-btn" onclick="runQuery()">EXECUTE SQL</button>
        </div>
      </div>

      <div class="results-pane">
        <div class="results-header">
          <div style="font-weight: 600;" id="active-view-title">Query Results</div>
          <div class="status-tag" id="status-tag">Ready</div>
        </div>
        <div class="table-container" id="results-container">
          <div style="padding: 24px; text-align: center; color: #64748b;">Select a table or execute a SQL query to inspect data.</div>
        </div>
      </div>
    </main>
  </div>

  <script>
    let activeTable = null;

    async function loadOverview() {
      try {
        const res = await fetch('/api/overview');
        const data = await res.json();
        document.getElementById('stat-tables').innerText = data.total_tables || 0;
        document.getElementById('stat-rows').innerText = (data.total_rows || 0).toLocaleString();
        document.getElementById('stat-size').innerText = ((data.database_size_bytes || 0) / (1024*1024)).toFixed(2) + ' MB';
        document.getElementById('stat-engine').innerText = 'v' + (data.duckdb_version || '0.10.x');

        const list = document.getElementById('table-list');
        list.innerHTML = '';
        (data.tables || []).forEach(t => {
          const li = document.createElement('li');
          li.className = 'table-item' + (activeTable === t.name ? ' active' : '');
          li.onclick = () => viewTable(t.name);
          li.innerHTML = `<span>${t.name}</span><span class="badge">${t.row_count}</span>`;
          list.appendChild(li);
        });
      } catch (err) {
        console.error('Failed to load DB overview:', err);
      }
    }

    function setQuery(sql) {
      document.getElementById('sql-input').value = sql;
      runQuery();
    }

    async function runQuery() {
      const sql = document.getElementById('sql-input').value.trim();
      const statusTag = document.getElementById('status-tag');
      const container = document.getElementById('results-container');
      document.getElementById('active-view-title').innerText = 'SQL Query Results';
      statusTag.innerText = 'Executing...';
      statusTag.style.color = 'var(--accent)';

      try {
        const res = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: sql })
        });
        const data = await res.json();

        if (!data.success) {
          statusTag.innerText = `Error (${data.execution_ms}ms)`;
          statusTag.style.color = 'var(--accent-red)';
          container.innerHTML = `<div class="error-box"><strong>SQL Error:</strong> ${data.error}</div>`;
          return;
        }

        statusTag.innerText = `${data.row_count} rows in ${data.execution_ms}ms`;
        statusTag.style.color = 'var(--accent-green)';
        renderTable(data.columns, data.rows);
      } catch (err) {
        statusTag.innerText = 'Network Failure';
        statusTag.style.color = 'var(--accent-red)';
        container.innerHTML = `<div class="error-box">${err.message}</div>`;
      }
    }

    async function viewTable(tableName) {
      activeTable = tableName;
      document.querySelectorAll('.table-item').forEach(el => el.classList.remove('active'));
      event?.currentTarget?.classList.add('active');

      document.getElementById('active-view-title').innerText = `Table: ${tableName}`;
      const statusTag = document.getElementById('status-tag');
      statusTag.innerText = 'Fetching...';

      try {
        const res = await fetch(`/api/table/${tableName}?limit=100`);
        const data = await res.json();
        statusTag.innerText = `Showing ${data.rows.length} of ${data.total} rows`;
        statusTag.style.color = 'var(--accent-green)';
        renderTable(data.columns.map(c => c.name), data.rows);
      } catch (err) {
        statusTag.innerText = 'Failed to load table';
        statusTag.style.color = 'var(--accent-red)';
      }
    }

    function renderTable(columns, rows) {
      const container = document.getElementById('results-container');
      if (!rows || rows.length === 0) {
        container.innerHTML = '<div style="padding: 24px; text-align: center; color: #64748b;">Table has 0 records.</div>';
        return;
      }

      let html = '<table><thead><tr>';
      columns.forEach(col => { html += `<th>${col}</th>`; });
      html += '</tr></thead><tbody>';

      rows.forEach(r => {
        html += '<tr>';
        columns.forEach(col => {
          const val = r[col];
          const displayVal = val === null || val === undefined ? '<span style="color:#64748b">NULL</span>' : (typeof val === 'object' ? JSON.stringify(val) : String(val));
          html += `<td title="${String(val)}">${displayVal}</td>`;
        });
        html += '</tr>';
      });

      html += '</tbody></table>';
      container.innerHTML = html;
    }

    loadOverview();
    runQuery();
  </script>
</body>
</html>
"""
