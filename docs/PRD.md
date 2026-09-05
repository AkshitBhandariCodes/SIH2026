# PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Project Title:** AURA-BTC (Autonomous Offline Bitcoin Intelligence & Traffic Correlation Engine)  
**Organization:** National Technical Research Organisation (NTRO) / Smart India Hackathon 2026  
**Document Version:** 1.0.0 (Final Architecture Baseline)  
**Target Environment:** Offline Ubuntu Linux 22.04 LTS (Air-Gapped)

---

## 1. Product Name
**AURA-BTC**: Autonomous Offline Bitcoin Intelligence & Traffic Correlation Engine.

---

## 2. Executive Summary
AURA-BTC is a specialized, air-gapped cyber-threat intelligence platform engineered for defense, national security, and financial intelligence analysts. It solves the critical operational challenge of correlating volatile P2P network metadata (IP, Port, ASN, Country) with cryptographic blockchain ledger activity (TXIDs, Wallets, UTXO amounts, fees). Running completely offline on standard Linux hardware, it extracts 20+ multi-dimensional topological and temporal features, detects anomalous transaction laundering patterns via unsupervised machine learning (`IsolationForest` and `DBSCAN`), generates evidence-backed forensic explanations, and renders interactive link-analysis entity graphs.

---

## 3. Problem Statement
Illicit actors utilize cryptocurrency to obfuscate ransom proceeds, money laundering, and covert financing through complex topologies such as peeling chains, mixer services, and multi-jurisdictional network hopping. Existing tools are split between on-chain-only block explorers and network-only packet monitors. Investigators require an integrated, 100% offline, privacy-compliant intelligence workstation capable of ingesting bulk heterogeneous synthetic data, discovering hidden linkages, and generating explainable, prioritized investigative leads.

---

## 4. User Personas
1. **Cyber Intelligence Analyst (Primary):** Triages high-velocity feeds, monitors suspicious clusters, explores link-analysis graphs, and identifies high-risk nodes.
2. **Law Enforcement Investigator:** Searches specific wallet addresses or TXIDs, reviews chronological evidence dossiers, and exports formal case documentation.
3. **Data Scientist / Threat Researcher:** Evaluates model anomaly thresholds, analyzes feature distributions, and fine-tunes clustering parameters.

---

## 5. Objectives
- **O1 (Multi-Format Parsing):** Ingest CSV, JSON, and XML metadata files at $\ge 10,000\text{ records/second}$.
- **O2 (Accurate Correlation):** Correlate 100% of valid network observation events with corresponding transaction records.
- **O3 (Graph Synthesis):** Construct in-memory MultiDiGraph models connecting IP, Wallet, Transaction, ASN, and Country entities.
- **O4 (Local AI/ML Scoring):** Execute local CPU-based unsupervised anomaly detection in $<50\text{ ms}$ per batch.
- **O5 (Explainability):** Provide ranked, human-readable forensic evidence for 100% of generated alerts.
- **O6 (Air-Gap Compliance):** Guarantee zero external network sockets or third-party cloud dependencies.

---

## 6. Non-Objectives
- Live hardware packet interception (PCAP / TAP sniffing) or automated firewall rule injection.
- Cryptographic private key recovery or brute-force wallet decryption.
- Mining Bitcoin blocks or altering blockchain consensus protocols.
- Automated public naming or physical legal attribution of individuals without judicial process.

---

## 7. Functional Requirements (FR)
- **FR-01 (Multi-Format Ingestion):** Ingest bulk files in `.csv`, `.json`, and `.xml` formats.
- **FR-02 (Data Normalization):** Sanitize IP addresses (IPv4/IPv6), convert timestamps to ISO-8601 UTC, validate port numbers (1–65535), and standardize amounts.
- **FR-03 (Offline Enrichment):** Match IPs against local DuckDB tables to enrich Country Code and ASN metadata.
- **FR-04 (Entity Graph Construction):** Create directed graphs representing Wallets, Transactions, IPs, ASNs, and Countries.
- **FR-05 (Feature Calculation):** Compute 20+ topological, temporal, and monetary features for each wallet address.
- **FR-06 (ML Anomaly Scoring):** Execute local scikit-learn `IsolationForest` model to assign anomaly scores $[0.0, 1.0]$.
- **FR-07 (Entity Clustering):** Apply DBSCAN to group structurally similar transaction patterns into entity clusters.
- **FR-08 (Risk & Confidence Calibration):** Calculate Composite Risk Score (0–100) and Confidence Level (LOW/MED/HIGH).
- **FR-09 (Explainability Engine):** Compute statistical baseline deviations (Z-scores) to generate readable evidence bullets.
- **FR-10 (Triage Dashboard):** Render ranked alerts with filtering by severity, country, and risk threshold.
- **FR-11 (Interactive Graph Canvas):** Cytoscape.js interactive visualization with node drag, zoom, neighborhood expansion, and metadata drawer.
- **FR-12 (Case Dossier Export):** Export evidence summaries into structured Markdown/PDF formats.

---

## 8. Non-Functional Requirements (NFR)
- **NFR-01 (Air-Gapped Operation):** Operates without an active internet connection or external runtime daemon.
- **NFR-02 (Sub-Second Latency):** Entity graph extraction and alert search respond in $<100\text{ ms}$.
- **NFR-03 (Memory Footprint):** Total resident set size (RSS) memory consumption $<2\text{ GB}$ for $500,000$ records.
- **NFR-04 (Reproducibility):** Deterministic execution guaranteed via fixed random seed (`seed=42`) and locked package files.
- **NFR-05 (Linux Compatibility):** Runs natively on Ubuntu 20.04/22.04/24.04 LTS.

---

## 9. Offline Requirements
- All frontend packages (React, Vite, Cytoscape.js, Recharts) bundled locally into self-contained static assets; zero external CDN `<script>` or `<link>` tags.
- Python packages managed via `uv` with offline wheel cache support.
- Embedded database (DuckDB) running in-process without requiring external database server processes.

---

## 10. Security Requirements
- Input sanitization against XML External Entity (XXE) attacks using standard, safe parsing routines.
- Parameterized SQL execution within DuckDB to prevent SQL injection vulnerabilities.
- FastAPI server bound strictly to local loopback interface (`127.0.0.1`).

---

## 11. Data Requirements
- Support flat 1:1 transaction-network records as well as nested multi-input/multi-output transaction arrays.
- Automatic imputation of missing non-critical fields (e.g., unknown ASN $\rightarrow$ `"ASN-UNKNOWN"`).

---

## 12. Network-Analysis Requirements
- Classify network ports: Bitcoin P2P (8333), Testnet (18333), RPC (8332), and dynamic/ephemeral ports (49152–65535).
- Detect multi-homed broadcasting (single TXID broadcast across $\ge 3$ distinct subnets within 5 seconds).

---

## 13. Graph-Analysis Requirements
- NetworkX `MultiDiGraph` supporting node types: `WALLET`, `TRANSACTION`, `IP`, `ASN`, `COUNTRY`.
- Extract $k$-hop ego-networks around any target wallet or TXID.
- Calculate In-Degree (fan-in), Out-Degree (fan-out), and graph degree metrics.

---

## 14. ML Requirements
- Unsupervised `IsolationForest` model trained on normalized feature matrix.
- Ability to retrain model on newly ingested datasets via single API call (`POST /api/ml/train`).
- Model artifacts serialized locally as `models/anomaly_detector.joblib`.

---

## 15. Explainability Requirements
- Dynamic generation of 3 to 5 clear evidence bullets for every alert.
- Quantitative comparison against dataset medians (e.g., *"Transaction volume is 14.2× higher than dataset median"*).

---

## 16. Dashboard Requirements
- Single-page dark-themed operational UI with instant search, interactive Cytoscape canvas, risk badges, and tabular triage queue.

---

## 17. API Requirements
- RESTful JSON API using FastAPI with automatic OpenAPI docs (`/docs`) available locally.

---

## 18. Database Requirements
- Columnar DuckDB file stored at `data/aura_database.duckdb`. Support ACID transactions and in-memory fallback.

---

## 19. Performance Requirements
- Ingestion rate: $\ge 10,000\text{ records/sec}$.
- Feature extraction: $\ge 5,000\text{ wallets/sec}$.
- Batch ML scoring: $\le 200\text{ ms}$ for $10,000$ entities.

---

## 20. Error-Handling Requirements
- Malformed rows in CSV/JSON/XML must be logged to an ingestion error table without aborting the entire batch.

---

## 21. Acceptance Criteria (Given / When / Then)
- **AC-1:** *Given* a 50MB mixed CSV/JSON/XML dataset, *When* ingested via UI/API, *Then* all valid records appear in DuckDB within 5 seconds with zero internet calls.
- **AC-2:** *Given* an anomalous wallet participating in a peeling chain, *When* feature extraction and ML inference run, *Then* the wallet is assigned a Risk Score $>80$ and flagged as `CRITICAL` with human-readable evidence.
- **AC-3:** *Given* a user clicks any node on the Cytoscape graph, *When* inspected, *Then* an evidence drawer opens displaying associated IPs, total volume, ASN, country, and risk breakdown.

---

## 22. Technical Risks
- *Graph combinatorial explosion:* Graphing millions of nodes simultaneously in the browser can freeze Cytoscape.js.  
  *Mitigation:* Server-side sub-graph slicing ($k$-hop ego graphs limited to max 100 nodes/edges per view).

---

## 23. Dependency Risks
- *Broken offline builds:* NPM or Pip trying to connect to remote registries during evaluation.  
  *Mitigation:* Self-contained `package-lock.json`, pre-bundled frontend `dist/` directory, and local `uv` lockfile.

---

## 24. ML Risks
- *High-volume exchanges flagged as attackers:* Centralized exchanges have high fan-in/fan-out, mimicking mixing behavior.  
  *Mitigation:* Heuristic whitelisting / tag identification for high-degree liquidity hubs.

---

## 25. False-Positive Risks
- *Normal users using VPNs:* Multiple IPs might look like network hopping.  
  *Mitigation:* Confidence score reduced if temporal spacing between IP appearances is realistic for normal human movement.

---

## 26. Privacy and Attribution Limitations
- The system explicitly records intelligence correlation, NOT physical legal identity. All findings must state *"Evidence indicates potential correlation"*.

---

## 27. Future Improvements
- Multi-asset support (Ethereum, Monero transaction tracing), cross-chain bridge analytics, GPU-accelerated Graph Neural Networks (GNNs).
