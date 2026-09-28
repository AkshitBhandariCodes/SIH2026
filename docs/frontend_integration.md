# AURA-BTC Frontend Integration Guide

> **Purpose:** This document specifies every API contract, data format, and UI requirement your frontend must implement to integrate with the AURA-BTC backend.

---

## 1. Backend API Base URL

```
Development: http://127.0.0.1:8000
API Docs (Swagger): http://127.0.0.1:8000/docs
```

The backend enables CORS for these frontend origins:
- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:3000`

If your frontend runs on a different port, update `allow_origins` in [`src/api/main.py`](../src/api/main.py).

---

## 2. API Endpoints

### `GET /api/health`
**Response:**
```json
{ "status": "ONLINE", "mode": "OFFLINE", "version": "1.0.0" }
```

### `GET /api/stats`
**Response:**
```json
{
  "total_network_events": 42,
  "total_transactions": 18,
  "total_wallets": 12,
  "total_alerts": 5,
  "critical_alerts": 1,
  "high_alerts": 2,
  "medium_alerts": 2,
  "low_alerts": 0,
  "database_size_bytes": 262144
}
```

### `GET /api/alerts?severity=CRITICAL`
**Query Params:** `severity` (optional) — one of `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`  
**Response:** Array of `AlertItem`:
```json
[
  {
    "alert_id": "uuid",
    "entity_type": "WALLET",
    "entity_id": "1MixerHubCentralXXXXXXXXXXXXXXWvN8b",
    "anomaly_score": 0.8721,
    "risk_score": 82.5,
    "confidence_score": "HIGH",
    "severity": "CRITICAL",
    "explanation": [
      "Fan-out degree of 5 unique recipients exceeds median+3...",
      "Observed across 4 countries..."
    ],
    "top_features": {
      "fan_out_degree": 5.0,
      "unique_country_count": 4.0
    },
    "created_at": "2026-01-15T10:30:00"
  }
]
```

### `GET /api/graph/entity/{entity_id}?k=2`
**Path Params:** `entity_id` — wallet address, IP, TXID, ASN, or country code  
**Query Params:** `k` (default 2, range 1-4) — hop depth  
**Response:**
```json
{
  "center_node": "1MixerHubCentralXXXXXXXXXXXXXXWvN8b",
  "node_count": 15,
  "edge_count": 22,
  "cytoscape_elements": {
    "nodes": [
      { "data": { "id": "wallet_abc", "node_type": "WALLET", "label": "wallet_abc..." } }
    ],
    "edges": [
      { "data": { "id": "e1", "source": "wallet_abc", "target": "tx_123", "edge_type": "INPUT_TO" } }
    ]
  }
}
```

### `POST /api/ingest`
**Body:** `multipart/form-data` with `file` field (.csv, .json, .xml)  
**Response:**
```json
{
  "status": "SUCCESS",
  "filename": "peeling_chain_attack.json",
  "total_parsed": 25,
  "valid_records": 23,
  "invalid_records": 2,
  "execution_time_seconds": 1.234
}
```

### `POST /api/ml/train`
**Body:** None  
**Response:**
```json
{
  "status": "SUCCESS",
  "wallets_trained": 12,
  "anomalies_detected": 3,
  "clusters_formed": 2,
  "model_path": "/path/to/models/anomaly_detector.joblib"
}
```

---

## 3. UI Theme & Design System

### Color Palette
| Token | Hex | Usage |
|---|---|---|
| `aura-bg` | `#0f172a` | Main background |
| `aura-surface` | `#1e293b` | Cards, panels |
| `aura-border` | `#334155` | Borders, dividers |
| `aura-text` | `#e2e8f0` | Primary text |
| `aura-muted` | `#94a3b8` | Secondary text |
| `aura-critical` | `#ef4444` | CRITICAL severity |
| `aura-high` | `#f97316` | HIGH severity |
| `aura-medium` | `#eab308` | MEDIUM severity |
| `aura-low` | `#22c55e` | LOW severity |
| `aura-accent` | `#3b82f6` | Buttons, links |

### Dark Operational Theme
- Background: `#0f172a` (dark navy)
- Surfaces/cards: `#1e293b`
- All text is light on dark
- Accent color for interactive elements: `#3b82f6` (blue)

---

## 4. Required Pages/Views

### 4.1 Header / Top Bar
- AURA-BTC logo/title
- **OFFLINE MODE** badge with green indicator dot
- Live stats from `GET /api/stats`: Events, TXs, Alerts count, CRITICAL count badge

### 4.2 Triage & Alerts View
- Fetch alerts from `GET /api/alerts`
- Severity filter buttons: CRITICAL (red), HIGH (orange), MEDIUM (yellow), LOW (green)
- Each alert card shows:
  - Severity badge (color-coded)
  - Wallet address (truncated, monospace font)
  - Risk Score, ML Anomaly Score, Confidence
  - Expandable evidence bullets section
  - "Investigate in Graph" button → navigates to Graph Canvas with this entity

### 4.3 Graph Canvas (Cytoscape.js)
- Fetches subgraph from `GET /api/graph/entity/{id}?k=2`
- Pass `cytoscape_elements` directly to Cytoscape.js `cy.json()`
- **Node colors by `node_type`:**
  - WALLET → `#ef4444` (red)
  - TRANSACTION → `#eab308` (yellow)
  - IP → `#3b82f6` (blue)
  - ASN → `#a855f7` (purple)
  - COUNTRY → `#22c55e` (green)
- Edge style: bezier curves, arrows, labeled with `edge_type`
- Layout: `cose` (force-directed) with animation
- On node click: re-fetch subgraph centered on clicked node
- Include a color legend

### 4.4 Timeline / Analytics View (Recharts)
- **BarChart:** Alert severity distribution (color-coded bars)
- **AreaChart:** Risk score distribution for top 30 alerts
- Summary stat cards: Total alerts, Risk>80 count, Avg risk, Low severity count

### 4.5 Data Ingestion View
- File input accepting `.csv`, `.json`, `.xml`
- "Ingest File" button → `POST /api/ingest` with `FormData`
- Show result: filename, valid records, execution time
- "Train ML Models" button → `POST /api/ml/train`
- Show training result: wallets trained, anomalies detected, clusters
- List of available sample data files for reference

### 4.6 Evidence Drawer (Right Panel)
- Appears when an alert is selected
- Shows: wallet address, score grid (Risk, ML Anomaly, Confidence, Severity)
- Evidence bullets with left-border accent styling
- Top outlier features list
- "Investigate in Graph" and "Export Case Dossier" buttons

---

## 5. Recommended Libraries

| Purpose | Library | Notes |
|---|---|---|
| Graph Visualization | `cytoscape` + `cytoscape-cose-bilkent` | Force-directed layout |
| Charts | `recharts` | BarChart, AreaChart |
| HTTP Client | `fetch` or `axios` | Native fetch is sufficient |
| Icons | `lucide-react` or similar | Recommended for UI icons |

---

## 6. Key Integration Notes

1. **Proxy Setup:** If using Vite, configure `vite.config.js` to proxy `/api` to `http://127.0.0.1:8000`:
   ```js
   export default defineConfig({
     server: {
       proxy: {
         '/api': 'http://127.0.0.1:8000'
       }
     }
   })
   ```

2. **Auto-refresh:** After a successful ingest or training call, re-fetch `/api/stats` and `/api/alerts` to update the dashboard.

3. **Error handling:** Backend returns `{ "status": "ERROR", "detail": "..." }` on failures with appropriate HTTP codes (400, 500).

4. **Cytoscape data format:** The `cytoscape_elements` field returns `{ "nodes": [...], "edges": [...] }` where each element has a `data` object. Pass this directly to `cy.add()` or `cy.json({ elements })`.

5. **Node cap:** The backend caps k-hop subgraphs at 150 nodes. The frontend should display a warning if `node_count == 150` (indicating truncation).

6. **Wallet address display:** Wallet addresses should be displayed in monospace font, truncated to ~16 chars with ellipsis for cards, full address in the Evidence Drawer.

7. **Offline constraint:** Do NOT use any CDN for fonts, icons, or JS libraries. All assets must be bundled locally. The app must work with Wi-Fi/Ethernet physically disabled.
