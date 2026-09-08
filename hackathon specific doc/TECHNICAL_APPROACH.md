# AURA-BTC: AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic
## Technical Approach, Model Selection & Explainability Documentation

**Problem Statement:** PS-5 (National Technical Research Organisation - NTRO)  
**Category:** Software | **Theme:** Cryptocurrency / Financial Intelligence  
**System Architecture:** 100% Air-Gapped Offline Intelligence Engine  

---

## 1. Executive Summary

**AURA-BTC** is an enterprise-grade, fully offline intelligence system engineered specifically for military, defense, and law enforcement agencies (e.g., NTRO) to monitor, analyze, and detect illegal Bitcoin transaction patterns.

The system ingests raw, un-redacted Bitcoin transaction metadata alongside network-layer telemetry (`timestamp`, `src_ip`, `dst_ip`, `src_port`, `dst_port`, `txid`, `input_addresses[]`, `output_addresses[]`, `input_amounts[]`, `output_amounts[]`, `geo_country/asn`). It correlates Layer 3/4 network activity with Layer 7 blockchain flows to detect obfuscation techniques such as **peeling-chain laundering**, **CoinJoin mixing**, **high-velocity botnet bursts**, and **IP hopping ransomware operations**.

Key System Innovations:
1. **100% Air-Gapped & Offline Architecture**: Zero dependence on cloud APIs or external block explorers; powered by an in-process **DuckDB** database and local **Scikit-learn** models.
2. **Unsupervised Multidimensional Anomaly Detection**: Combines **Isolation Forest** anomaly scoring with **DBSCAN** entity clustering across 20+ behavioral vectors.
3. **Algorithmic Forensic Evidence Generation**: Replaces traditional "black-box" risk percentages with human-readable, court-admissible forensic bullets explaining *why* an entity was flagged.
4. **Interactive Link-Analysis Canvas**: A Vercel-inspired interactive graph visualizer allowing investigators to trace 1-hop/N-hop neighbor networks and isolate suspect entities.

---

## 2. System Architecture & Offline Design

The system is constructed with a microservices architecture designed for immediate deployment on air-gapped Linux/Windows environments via Docker containers or PowerShell automation scripts (`start_system.ps1`).

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                OFFLINE INGESTION & PIPELINE                        │
│   CSV / JSON / XML Bulk Metadata ──►   PyArrow / Pydantic Parser                   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           DUCKDB DATA STORE                             │
│   network_events  │  transactions  │  wallet_flows  │  wallet_features  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       AI/ML ENGINE & RISK ENGINE                        │
│   • 20+ Feature Engineering          • Isolation Forest (Anomaly Score) │
│   • DBSCAN Entity Clustering         • Risk Propagation Algorithm                                   │
│   • Heuristic Rule Engine (Peeling)  • XAI Evidence Generation Bullets  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  FRONTEND DASHBOARD & LINK ANALYSIS                     │
│   • Alerts Triage Queue              • Interactive Graph Canvas         │
│   • Live Pipeline Feed               • Case Dossier JSON Exporter       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Technical Specs:
- **Database**: DuckDB (Columnar analytical engine capable of parsing millions of rows in milliseconds with 0 MB external footprint).
- **Backend API**: FastAPI (Python 3.12) running under uvicorn.
- **Frontend**: Next.js 15 (React 19, TypeScript, Tailwind CSS) with native SVG graph canvas.

---

## 3. Ingestion & Multi-Layer Telemetry Correlation

The ingestion engine (`src/api/ingest.py`) processes bulk metadata files in CSV, JSON, or XML formats without requiring prior dataset transformations.

### 3.1 Normalized Schema Mapping
Every ingested record is mapped into three relational DuckDB tables:
1. `network_events`: Captures network telemetry (`src_ip`, `dst_ip`, `src_port`, `dst_port`, `timestamp`, `geo_country`, `asn`).
2. `transactions`: Captures blockchain transactions (`txid`, `fee`, `timestamp`).
3. `wallet_flows`: Captures entity flows (`txid`, `address`, `flow_type` [INPUT/OUTPUT], `amount`).

### 3.2 Feature Engineering (Behavioral Vectors)
The system aggregates raw records by wallet address to build a 20+ dimensional feature matrix $X \in \mathbb{R}^{N \times D}$:
- **Transaction Velocity**: `transactions_per_hour`, `total_tx_count`.
- **Flow Economics**: `total_sent`, `total_received`, `net_flow`, `in_out_ratio`, `avg_amount`, `amount_variance`.
- **Topological Features**: `fan_in_degree`, `fan_out_degree`, `unique_counterparties`.
- **Network Telemetry**: `unique_ip_count`, `unique_asn_count`, `top_country`.

---

## 4. AI/ML Focus Areas & Model Selection

### 4.1 Entity Clustering (Common-Input-Ownership + DBSCAN)
- **Common-Input-Ownership (CIO) Heuristic**: Wallets co-signed as inputs within the same transaction are clustered into a single logical entity.
- **DBSCAN Clustering**: Density-Based Spatial Clustering of Applications with Noise (`eps=1.5`, `min_samples=3`) groups behavioral feature profiles without requiring pre-specified cluster counts ($k$).

### 4.2 Anomaly Detection (Isolation Forest)
- **Model Choice**: `sklearn.ensemble.IsolationForest` (`n_estimators=100`, `contamination=0.1`).
- **Rationale**: Isolation Forest isolates anomalies by randomly selecting a feature and split value. Anomalous wallets (mixers, peeling chains, botnets) require significantly fewer splits to isolate than normal benign transactions.
- **Anomaly Score Output**: Scaled between $[0.0, 1.0]$.

### 4.3 Topological Pattern Detection
- **Peeling-Chain Detection**: Identifies transaction sequences where a wallet splits funds into 2 outputs (one small payment and one change output) repeatedly across short time windows.
- **CoinJoin / Mixing Detection**: Identifies transactions with high equal-value output distributions ($N \ge 5$) originating from disparate input sources.
- **High-Velocity Bursts**: Identifies addresses with transaction rates exceeding 10.0 tx/hour.

### 4.4 Risk Scoring & Graph Propagation Algorithm
The **Composite Risk Score** ($R$) is calculated on a scale of $0 - 100$:
$$R = \min\left(100, \; 40 \cdot S_{\text{anomaly}} + 30 \cdot R_{\text{graph}} + 30 \cdot R_{\text{network}}\right)$$
Where:
- $S_{\text{anomaly}}$ is the Isolation Forest score $[0, 1]$.
- $R_{\text{graph}}$ measures graph centrality (fan-in/fan-out imbalance).
- $R_{\text{network}}$ measures IP/ASN hopping metrics.

---

## 5. Explainable AI (XAI) & Evidence Dossier Generation

In accordance with NTRO guidelines, **AURA-BTC does not use black-box scoring**. The `_generate_evidence_bullets` engine compares an anomalous wallet's features against the population medians and generates human-readable forensic evidence:

*Example Generated Evidence:*
- 🚨 **Peeling-Chain Topology Detected**: 2-output split with balanced flow indicates sequential change-address peeling.
- ⚡ **High-Velocity Burst**: `36.0 tx/hr` — rapid automated execution deviates significantly from human baseline.
- 🌐 **ASN Diversity Anomaly**: Entity accessed across 4 distinct ASNs within a 1-hour window (IP Hopping).
- 🌲 **Isolation Forest Anomaly Score**: `0.412` — statistically isolated from benign clusters across behavioral vectors.

Every flagged entity can be exported with 1-click as a **Case Dossier JSON file** containing raw telemetry, model confidence, and forensic evidence bullets.

---

## 6. How to Run & Validate Offline

### Step 1: Launch System (Offline Docker / PowerShell)
```powershell
.\start_system.ps1
```
*Outputs:*
- Dashboard UI: `http://localhost:3000`
- REST API: `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`

### Step 2: Clean Existing Data (For Fresh Testing)
```powershell
.\deletedata.ps1
```

### Step 3: Test Real Scenarios
1. Open `http://localhost:3000` and go to **ML Pipeline** tab.
2. Load any sample dataset (`peeling_chain_attack.json`, `ip_hopping_ransomware.csv`, `mixer_fanout.xml`).
3. Click **Ingest File to Database** and then **Train Anomaly Engine & Cluster Entities**.
4. View real-time findings in **Alerts Triage** and inspect the **Interactive Link Graph**.

---

## 7. Deliverables & Compliance Summary

| NTRO Requirement | Compliance |
| :--- | :--- |
| **Offline Solution** | 100% Offline (DuckDB + Scikit-learn + Local Next.js) |
| **Multi-format Ingest** | Native support for CSV, JSON, XML |
| **Entity Clustering** | CIO Heuristic + DBSCAN Clustering |
| **Link Analysis Graph** | Native SVG Graph Canvas with neighbor focus & node drag |
| **Explainable AI** | Automated Algorithmic Forensic Evidence generation bullets |
| **Exportable Evidence** | JSON Case Dossiers with full telemetry audit trails |
