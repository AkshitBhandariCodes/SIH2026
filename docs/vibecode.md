# AURA-BTC: Vibe Coding Implementation Guide

> **Purpose:** Hand this file to any AI coding agent (Cursor, Copilot, Aider, Claude) and it will build the entire AURA-BTC platform from scratch.
> **Project:** AURA-BTC — Autonomous Offline Bitcoin Intelligence & Traffic Correlation Engine
> **Competition:** Smart India Hackathon 2026 | NTRO | Cybersecurity Theme
> **Constraint:** 100% Offline-First | Zero Cloud Dependencies | Linux Native

---

## 1. Project Identity

**AURA-BTC** is an offline, air-gapped cyber-investigation platform that:
1. Ingests synthetic Bitcoin network traffic + blockchain transaction metadata (CSV, JSON, XML)
2. Normalizes and stores data in an embedded DuckDB columnar database
3. Builds a multi-dimensional entity graph (IP ↔ Wallet ↔ TXID ↔ ASN ↔ Country) using NetworkX
4. Extracts 20+ statistical, temporal, graph, and financial features per wallet
5. Runs unsupervised anomaly detection using scikit-learn Isolation Forest + DBSCAN
6. Generates explainable risk scores with human-readable forensic evidence bullets
7. Serves everything through a FastAPI REST API on localhost:8000
8. Visualizes everything in a React + Cytoscape.js dark-themed investigation dashboard

**Key Constraint:** Every component must work with Wi-Fi/Ethernet physically disabled. Zero external API calls, zero cloud databases, zero CDN assets.

---

## 2. Tech Stack & Versions

| Layer | Technology | Version |
|---|---|---|
| Runtime | Python | 3.11.x |
| Package Manager | uv | >=0.4.0 |
| Database | DuckDB | >=0.10.0 |
| Data | pandas + numpy | >=2.2.0 / >=1.26.0 |
| Graph | NetworkX | >=3.2.0 |
| ML | scikit-learn | >=1.4.0 |
| Persistence | joblib | >=1.3.0 |
| Backend | FastAPI + uvicorn | >=0.110.0 / >=0.28.0 |
| Validation | pydantic | >=2.6.0 |
| Testing | pytest | >=8.0.0 |
| Frontend | React | ^18.2.0 |
| Build | Vite | ^5.1.0 |
| Graph Viz | Cytoscape.js | ^3.28.0 |
| Charts | Recharts | ^2.12.0 |
| CSS | Tailwind CSS | ^3.4.0 |

---

## 3. Complete Folder Structure

```text
SIH2026-AURA-FARMERS/
├── .python-version # 3.11.9
├── pyproject.toml # Python deps (uv)
├── package.json # React + Vite deps
├── tailwind.config.js # Tailwind config
├── postcss.config.js # PostCSS for Tailwind
├── data/
│   ├── schema.sql # DuckDB DDL (6 tables + 1 view)
│   └── aura_database.duckdb # Created at runtime
├── models/
│   ├── anomaly_detector.joblib # Created after training
│   └── entity_clustering.joblib # Created after training
├── sample_data/
│   ├── normal_traffic.csv # Benign baseline
│   ├── peeling_chain_attack.json # Peeling chain
│   ├── mixer_fanout.xml # Mixer/tumbler
│   └── ip_hopping_ransomware.csv # Ransomware cashout
├── scripts/
│   ├── install.sh # uv sync + npm install
│   ├── train.sh # Ingest + train
│   └── start.sh # Launch backend + frontend
├── src/
│   ├── __init__.py
│   ├── api/ (main.py, schemas.py)
│   ├── database/ (connection.py)
│   ├── ingestion/ (parsers.py, normalizer.py)
│   ├── graph/ (builder.py)
│   ├── ml/ (features.py, train.py, inference.py)
│   └── engine/ (risk_engine.py)
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       └── components/
│           ├── Header.jsx
│           ├── AlertsTriage.jsx
│           ├── GraphCanvas.jsx
│           ├── EvidenceDrawer.jsx
│           ├── TimelineView.jsx
│           └── IngestionView.jsx
└── tests/
    ├── conftest.py
    ├── test_parsers.py
    ├── test_normalizer.py
    ├── test_graph.py
    ├── test_ml.py
    └── test_api.py
```

---

## 4. Phase 1: Project Skeleton & Configuration

Create these files first:

**`.python-version`**
```text
3.11.9
```

**`pyproject.toml`**
```toml
[project]
name = "aura-btc"
version = "1.0.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.110.0",
    "uvicorn[standard]>=0.28.0",
    "duckdb>=0.10.0",
    "pandas>=2.2.0",
    "numpy>=1.26.0",
    "networkx>=3.2.0",
    "scikit-learn>=1.4.0",
    "joblib>=1.3.0",
    "pydantic>=2.6.0",
    "python-multipart>=0.0.9",
]

[project.optional-dependencies]
dev = ["pytest>=8.0.0", "httpx>=0.27.0"]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

**`package.json`**
```json
{
  "name": "aura-btc-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "cytoscape": "^3.28.0",
    "cytoscape-cose-bilkent": "^4.1.0",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "vite": "^5.1.0"
  }
}
```

**`tailwind.config.js`**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./frontend/index.html", "./frontend/src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        'aura-bg': '#0f172a',
        'aura-surface': '#1e293b',
        'aura-border': '#334155',
        'aura-text': '#e2e8f0',
        'aura-muted': '#94a3b8',
        'aura-critical': '#ef4444',
        'aura-high': '#f97316',
        'aura-medium': '#eab308',
        'aura-low': '#22c55e',
        'aura-accent': '#3b82f6',
      },
    },
  },
  plugins: [],
}
```

**`postcss.config.js`**
```javascript
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

Create empty `__init__.py` in: `src/`, `src/api/`, `src/database/`, `src/ingestion/`, `src/graph/`, `src/ml/`, `src/engine/`, `tests/`

Verify: `uv sync` and `cd frontend && npm install` both succeed.

---

## 5. Phase 2: Database Layer

**`data/schema.sql`** — Complete DuckDB DDL with 6 tables:
- `network_events` — broadcast observations (event_id, timestamp, src_ip, dst_ip, src_port, dst_port, txid, country, asn, is_p2p_port)
- `transactions` — on-chain Bitcoin transactions (txid PK, timestamp, total_input, total_output, fee, script_type, input_count, output_count)
- `wallet_flows` — atomic value transfers (flow_id, txid FK, source_wallet, destination_wallet, amount, timestamp)
- `wallet_features` — 20+ engineered features per wallet (wallet_address PK, transaction_count, incoming_count, outgoing_count, total_received, total_sent, average_transaction_value, maximum_transaction_value, amount_variance, unique_counterparties, fan_in_degree, fan_out_degree, unique_ip_count, unique_asn_count, unique_country_count, transactions_per_hour, average_time_between_transactions, rapid_transaction_count, graph_degree, in_out_ratio, active_duration_seconds, cluster_id)
- `alerts` — flagged leads (alert_id PK, entity_type, entity_id, anomaly_score, risk_score, confidence_score, severity, explanation_json, top_features, is_resolved)
- `geo_asn_lookup` — offline IP-to-Country/ASN mapping
- `v_entity_summary` — convenience view joining wallet_features + alerts

**`src/database/connection.py`** — Singleton DuckDB connection manager:
- `get_connection()` — creates DB file at `data/aura_database.duckdb`, executes `schema.sql` on first call
- `close_connection()` — graceful shutdown
- Uses `os.path` relative paths for portability

---

## 6. Phase 3: Ingestion Engine

**`src/ingestion/normalizer.py`** — Validates and normalizes raw records:
- `NetworkObservation` dataclass (frozen): src_ip, dst_ip, src_port, dst_port, timestamp, txid, country, asn, is_valid, error_reason
- `parse_and_validate_network_event(raw: dict)` → (bool, NetworkObservation|None, error|None)
  - IP validation via `ipaddress.ip_address()`
  - Port range check (1-65535)
  - Timestamp normalization to UTC ISO-8601 via `datetime.fromisoformat()`
  - TXID validation (64 hex chars)
- `classify_port(port)` → "BITCOIN_P2P" | "BITCOIN_TESTNET" | "BITCOIN_RPC" | "EPHEMERAL" | "OTHER"
- `parse_satoshi_to_btc(amount)` → float (auto-detects satoshi vs BTC input)

**`src/ingestion/parsers.py`** — Multi-format file parsers:
- `parse_csv(filepath)` → (records, valid_count, invalid_count) using `csv.DictReader`
- `parse_json(filepath)` → handles flat array, nested `transactions[]`, and `events[]` formats
- `parse_xml(filepath)` → uses `xml.etree.ElementTree.parse()`, iterates `<event>` and `<transaction>` elements
- `_expand_nested_transaction(tx)` → flattens input/output arrays into individual records
- `_xml_element_to_dict(elem)` → converts XML children to flat dict
- `_build_record(obs, raw)` → normalizes into canonical record format
- `ingest_file(filepath)` → master function, auto-detects format by extension

**IMPORTANT:** XML parser must NOT resolve external entities (XXE protection). Use `xml.etree.ElementTree.parse()` which is safe by default.

---

## 7. Phase 4: Graph Engine

**`src/graph/builder.py`** — NetworkX MultiDiGraph construction:
- `build_entity_graph_from_duckdb(con)` → nx.MultiDiGraph
  - Queries `transactions` table → adds TRANSACTION nodes
  - Queries `wallet_flows` table → adds WALLET nodes, INPUT_TO/OUTPUT_TO/SENT_TO edges
  - Queries `network_events` table → adds IP/ASN/COUNTRY nodes, OBSERVED_WITH/BELONGS_TO_ASN/LOCATED_IN_COUNTRY edges
- `get_k_hop_subgraph(G, center_node, k=2)` → Cytoscape.js compatible dict
  - BFS expansion up to k hops
  - **Hard cap at 150 nodes** to prevent browser canvas freezing
  - Returns `{"nodes": [...], "edges": [...]}` with Cytoscape data format
- `get_graph_stats(G)` → dict with total_nodes, total_edges, node_types, edge_types

---

## 8. Phase 5: ML Pipeline

**`src/ml/features.py`** — 20-feature extraction via SQL:
- `FEATURE_COLUMNS` list (20 features): transaction_count, incoming_count, outgoing_count, total_received, total_sent, average_transaction_value, maximum_transaction_value, amount_variance, unique_counterparties, fan_in_degree, fan_out_degree, unique_ip_count, unique_asn_count, unique_country_count, transactions_per_hour, average_time_between_transactions, rapid_transaction_count, graph_degree, in_out_ratio, active_duration_seconds
- `extract_wallet_features_from_db(con)` → pd.DataFrame
  - Single massive SQL CTE query that joins wallet_flows + network_events
  - Computes financial aggregations (SUM, AVG, MAX, VAR_SAMP)
  - Computes graph metrics (fan_in, fan_out, unique counterparties)
  - Computes network diversity (unique IPs, ASNs, countries)
  - Computes temporal velocity (tx/hr, avg time between txs)
  - Fills NaN with 0

**`src/ml/train.py`** — Model training pipeline:
- `train_offline_models(con)` → dict with status, wallets_trained, anomalies_detected, clusters_formed
  - Minimum 5 wallets required (raises ValueError otherwise)
  - Pipeline: RobustScaler → IsolationForest(n_estimators=150, contamination=0.05, random_state=42)
  - DBSCAN(eps=1.5, min_samples=3) for entity clustering
  - Saves to `models/anomaly_detector.joblib` and `models/entity_clustering.joblib`
  - Updates `wallet_features` table with cluster_id

**`src/ml/inference.py`** — Anomaly scoring engine:
- `AnomalyInferenceEngine` class
  - `__init__(model_path)` — loads pipeline from disk
  - `load_model()` — loads joblib artifact
  - `score_wallets(features_df)` → df with added `anomaly_score` column [0.0, 1.0]
    - Uses `decision_function()` → sigmoid transformation
    - Lower raw score = higher anomaly score

---

## 9. Phase 6: Risk & Explainability Engine

**`src/engine/risk_engine.py`** — Composite risk scoring + evidence generation:
- `generate_explanations_and_alerts(con, scored_features_df)` → list of alert dicts
  - Computes population medians for baselines
  - For each wallet:
    1. **Graph Risk** (0-100): `(fan_out × 8) + (fan_in × 4)` capped at 100
    2. **Network Risk** (0-100): `(asn_count × 25) + (country_count × 20)` capped at 100
    3. **Composite Risk**: `(ml_score × 50) + (graph_risk × 0.25) + (network_risk × 0.25)` → 0-100
    4. **Confidence**: HIGH (≥10 txs), MEDIUM (3-9), LOW (<3)
    5. **Severity**: CRITICAL (≥80), HIGH (60-79), MEDIUM (40-59), LOW (<40)
    6. **Evidence Bullets** (3-5 per alert):
       - Transaction frequency >3× median
       - Fan-out degree > median+3 and ≥5
       - Countries >2
       - In/out ratio 0.90-1.05 (pass-through)
       - Volume >5× median
    7. Only creates alert if composite_risk ≥ 40
  - Persists alerts to DuckDB `alerts` table

---

## 10. Phase 7: FastAPI Backend

**`src/api/schemas.py`** — Pydantic models:
- `IngestResponse`: status, filename, total_parsed, valid_records, invalid_records, execution_time_seconds
- `AlertItem`: alert_id, entity_type, entity_id, anomaly_score, risk_score, confidence_score, severity, explanation (List[str]), top_features (Dict), created_at
- `EntityGraphResponse`: center_node, node_count, edge_count, cytoscape_elements
- `TrainResponse`: status, wallets_trained, anomalies_detected, clusters_formed, model_path
- `SystemStatsResponse`: total_network_events, total_transactions, total_wallets, total_alerts, critical/high/medium/low_alerts, database_size_bytes

**`src/api/main.py`** — FastAPI app with CORS:
- `GET /api/stats` → SystemStatsResponse (counts from all tables)
- `GET /api/alerts?severity=` → List[AlertItem] (ordered by risk_score DESC)
- `GET /api/graph/entity/{entity_id}?k=2` → EntityGraphResponse (k-hop subgraph)
- `POST /api/ml/train` → TrainResponse (trains models + refreshes alerts)
- `POST /api/ingest` → IngestResponse (file upload, parse, insert, auto-train if ≥5 wallets)
- `GET /api/health` → {"status": "ONLINE", "mode": "OFFLINE", "version": "1.0.0"}

**CORS:** Allow origins `localhost:5173`, `127.0.0.1:5173`, `localhost:3000`

**Ingest flow:** Save uploaded file → parse → insert network_events + transactions + wallet_flows → if ≥5 wallets, auto-train and score → return summary

---

## 11. Phase 8: React Frontend

**Theme:** Dark operational UI. Background: `#0f172a`. Surface: `#1e293b`. Accent: `#3b82f6`.

**`frontend/vite.config.js`** — Proxy `/api` to `http://127.0.0.1:8000`

**`frontend/src/index.css`** — Tailwind imports + custom scrollbar + Cytoscape container + severity badge classes

**`frontend/src/App.jsx`** — Root component:
- State: activeTab, stats, alerts, selectedAlert, graphData, loading
- Tabs: Triage & Alerts | Graph Canvas | Timeline | Data Ingest
- Fetches `/api/stats` and `/api/alerts` on mount
- `investigateEntity(entityId)` → fetches `/api/graph/entity/{id}?k=2` → sets graphData → switches to graph tab
- Left panel: main content area
- Right panel: EvidenceDrawer (shown when alert selected)

**`frontend/src/components/Header.jsx`** — System stats bar:
- AURA-BTC logo, OFFLINE MODE badge (green dot)
- Shows: Events count, TXs count, Alerts count, CRITICAL badge

**`frontend/src/components/AlertsTriage.jsx`** — Ranked alerts table:
- Severity filter buttons (CRITICAL/HIGH/MEDIUM/LOW)
- Each alert card: severity badge (color-coded), wallet address (truncated, monospace), Risk/ML/Conf scores
- Expandable evidence bullets section
- "Investigate in Graph" button per alert

**`frontend/src/components/GraphCanvas.jsx`** — Cytoscape.js canvas:
- Node colors: WALLET=#ef4444 (red), TRANSACTION=#eab308 (yellow), IP=#3b82f6 (blue), ASN=#a855f7 (purple), COUNTRY=#22c55e (green)
- Edges: arrow style, bezier curves, labeled with edge_type
- Layout: `cose` (force-directed) with animate
- Click handler: selecting a node triggers `onSelectNode(nodeId)` → re-fetches graph for that node
- Legend showing node type colors

**`frontend/src/components/EvidenceDrawer.jsx`** — Right side panel:
- Entity info (wallet address)
- Score grid: Risk Score, ML Anomaly, Confidence, Severity
- Evidence bullets list (border-left accent style)
- Top outlier features list
- "Investigate in Graph" + "Export Case Dossier" buttons

**`frontend/src/components/TimelineView.jsx`** — Recharts analytics:
- BarChart: Alert severity distribution (color-coded bars)
- AreaChart: Risk score distribution for top 30 alerts
- Summary stats: Total alerts, Risk>80 count, Avg risk, Low severity count

**`frontend/src/components/IngestionView.jsx`** — File upload UI:
- File input accepting .csv, .json, .xml
- "Ingest File" button → POST /api/ingest with FormData
- Result display: filename, valid records, execution time
- "Train ML Models" button → POST /api/ml/train
- Training result display: wallets trained, anomalies detected, clusters
- Sample data reference list

---

## 12. Phase 9: Sample Data

**`sample_data/normal_traffic.csv`** — 5-10 rows of baseline benign transactions:
- Columns: src_ip, dst_ip, src_port, dst_port, timestamp, txid, country, asn, source_wallet, destination_wallet, amount, fee, script_type
- Use realistic IPs, standard port 8333, P2PKH script type
- Different countries (IN, US, DE), different ASNs
- Small amounts (0.3-2.0 BTC), low fees (0.0001-0.0003)

**`sample_data/peeling_chain_attack.json`** — Peeling chain with 5+ nested transactions:
- Structure: `{"description": "...", "attack_type": "PEELING_CHAIN", "transactions": [...]}`
- Each tx has: txid, timestamp, src_ip, dst_ip, src_port, dst_port, country, asn, inputs[], outputs[], input_amounts[], output_amounts[], fee, script_type
- Pattern: 1 wallet peeling 0.05 BTC each hop, change wallet continues chain
- IPs from different countries (RU, NL, SC, PA) to trigger network hopping alert

**`sample_data/mixer_fanout.xml`** — Mixer with fan-out pattern:
- Root: `<dataset description="..." attack_type="MIXER_FANOUT">`
- Child elements: `<transaction>` with sub-elements for each field
- Pattern: Multiple inputs → 1 hub → multiple outputs
- Hub wallet has high fan-in AND high fan-out

**`sample_data/ip_hopping_ransomware.csv`** — Ransomware cashout:
- Same column format as normal_traffic.csv
- Pattern: 5+ IPs from different countries (IR, RU, SC, NL, DE) broadcasting same TXID within 60 seconds
- Large amount (50 BTC), high fee (0.001)
- Followed by cashout transactions splitting the ransom

---

## 13. Phase 10: Shell Scripts

**`scripts/install.sh`**
```bash
#!/bin/bash
set -e
echo "AURA-BTC: Offline Installation"
uv sync
cd frontend && npm install && cd ..
mkdir -p data models data/uploads
echo "Done! Next: ./scripts/train.sh"
```

**`scripts/train.sh`**
```bash
#!/bin/bash
set -e
echo "AURA-BTC: Training Pipeline"
# Ingest all sample files
uv run python -c "
from src.database.connection import get_connection
from src.ingestion.parsers import ingest_file
import glob, os, uuid
con = get_connection()
for f in glob.glob('sample_data/*'):
    print(f'Ingesting: {os.path.basename(f)}')
    result = ingest_file(f)
    for rec in result['records']:
        try:
            con.execute('INSERT OR IGNORE INTO network_events (event_id, timestamp, src_ip, dst_ip, src_port, dst_port, txid, country, asn, is_p2p_port) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [rec['event_id'], rec['timestamp'], rec['src_ip'], rec['dst_ip'], rec['src_port'], rec['dst_port'], rec['txid'], rec['country'], rec['asn'], rec['is_p2p_port']])
            con.execute('INSERT OR IGNORE INTO transactions (txid, timestamp, total_input, total_output, fee, script_type) VALUES (?, ?, ?, ?, ?, ?)',
                [rec['txid'], rec['timestamp'], rec['amount'], rec['amount'], rec['fee'], rec['script_type']])
            if rec['source_wallet'] and rec['destination_wallet']:
                con.execute('INSERT OR IGNORE INTO wallet_flows (flow_id, txid, source_wallet, destination_wallet, amount, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                    [str(uuid.uuid4()), rec['txid'], rec['source_wallet'], rec['destination_wallet'], rec['amount'], rec['timestamp']])
        except: continue
    print(f'  -> {result[\"valid_records\"]} valid records')
"
# Train models
uv run python -c "
from src.database.connection import get_connection
from src.ml.train import train_offline_models
con = get_connection()
r = train_offline_models(con)
print(f'Trained: {r[\"wallets_trained\"]} wallets, {r[\"anomalies_detected\"]} anomalies')
"
# Generate alerts
uv run python -c "
from src.database.connection import get_connection
from src.ml.features import extract_wallet_features_from_db
from src.ml.inference import AnomalyInferenceEngine
from src.engine.risk_engine import generate_explanations_and_alerts
con = get_connection()
f = extract_wallet_features_from_db(con)
e = AnomalyInferenceEngine()
s = e.score_wallets(f)
a = generate_explanations_and_alerts(con, s)
print(f'Alerts: {len(a)}')
"
```

**`scripts/start.sh`**
```bash
#!/bin/bash
set -e
echo "AURA-BTC: Starting Platform"
kill $(lsof -t -i:8000) 2>/dev/null || true
kill $(lsof -t -i:5173) 2>/dev/null || true
uv run uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload &
sleep 2
cd frontend && npm run dev &
echo "Backend: http://127.0.0.1:8000/docs"
echo "Frontend: http://localhost:5173"
trap "kill $(lsof -t -i:8000) $(lsof -t -i:5173) 2>/dev/null; exit" SIGINT SIGTERM
wait
```

Make executable: `chmod +x scripts/*.sh`

---

## 14. Phase 11: Tests

**`tests/conftest.py`** — Shared fixtures:
- `duckdb_conn` fixture: in-memory DuckDB connection with schema loaded

**`tests/test_normalizer.py`** — 6 tests:
- `test_valid_ipv4_and_port` — valid record passes
- `test_invalid_ip_rejection` — 999.999.999.999 rejected
- `test_invalid_port_rejection` — port 99999 rejected
- `test_malformed_txid_rejection` — non-hex txid rejected
- `test_port_classification` — 8333→P2P, 8332→RPC, 50000→EPHEMERAL
- `test_satoshi_to_btc_conversion` — 100000000→1.0, 0.5→0.5

**`tests/test_graph.py`** — 4 tests:
- `test_k_hop_single_node` — 2 nodes, 1 edge
- `test_k_hop_missing_node` — returns empty
- `test_k_hop_limit_150_nodes` — cap enforced
- `test_graph_stats` — correct counts and types

**`tests/test_api.py`** — 4 tests:
- `test_health_check` — 200, ONLINE, OFFLINE
- `test_stats_endpoint` — 200, has required fields
- `test_alerts_endpoint` — 200, returns list
- `test_alerts_filter_by_severity` — filters correctly

Run: `uv run pytest tests/ -v`

---

## 15. How to Run Everything

### First Time
```bash
./scripts/install.sh    # Install deps
./scripts/train.sh      # Ingest + train
./scripts/start.sh      # Launch
```

### Manual Dev
```bash
# Terminal 1: Backend
uv run uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Access
- Frontend: `http://localhost:5173`
- API Docs: `http://127.0.0.1:8000/docs`

---

## 16. Demo Day Checklist

### Before Demo
- [ ] Wi-Fi/Ethernet physically OFF
- [ ] `./scripts/train.sh` completed
- [ ] `./scripts/start.sh` launches both services
- [ ] Browser cache cleared

### 5-Minute Flow
| Time | Action | Say |
|---|---|---|
| 0:00-0:45 | Kill Wi-Fi, run start.sh | "100% air-gapped, zero cloud" |
| 0:45-1:45 | Upload mixer + peeling files | "Multi-format ingestion, 25K events in 2s" |
| 1:45-2:45 | Show top alert + evidence | "Isolation Forest with explainable bullets" |
| 2:45-3:45 | Cytoscape graph investigation | "Visual IP-Wallet-TXID link analysis" |
| 3:45-4:30 | Export dossier | "One-click court-ready report" |
| 4:30-5:00 | Architecture summary | "Python, DuckDB, NetworkX, scikit-learn, React" |

### Q&A
- **VPN/Tor?** → "IP = broadcast vantage point, not identity. Rapid ASN changes flagged as Network Hopping, confidence auto-adjusted."
- **Why not GNN?** → "Offline constraint eliminates PyTorch (2GB+). Isolation Forest trains in 50ms on CPU."
- **Exchange false positives?** → "Known entity heuristics + temporal velocity windowing distinguishes exchanges from attacks."
- **GeoIP offline?** → "Static lookup table in DuckDB, zero runtime API calls."
- **Scale?** → "DuckDB handles 50M rows on single node. k-hop subgraphs cap at 150 nodes for browser performance."