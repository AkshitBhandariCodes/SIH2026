# AURA-BTC Prototype Video Script (Max 5 Minutes)

**Total Estimated Time:** ~4:30 - 4:45
**Format:** Slide Deck Presentation (1:30) + Live Technical Demo (3:15)
**Tone:** Professional, Technical, Evidence-Based, Confident.

---

## Part 1: The Pitch (Slide Presentation)
**Time allocation:** 1 minute 30 seconds
*(Keep slides in fullscreen, use a crisp white background theme)*

### [0:00 - 0:30] Slide 1: The Problem
*(Visual: `slide1_problem_white.jpg`)*
**Speaker:**
"Respected Judges, greetings. We are team AURA FARMERS, presenting **AURA-BTC**, an Autonomous Offline Bitcoin Intelligence & Traffic Correlation Engine. 
The critical problem we are solving for the defense sector is the 'anonymity illusion' in cryptocurrency. While criminals use mixers, peeling chains, and IP-hopping to launder money, they inevitably leave two footprints: on-chain transaction data, and off-chain network telemetry like IPs and ASNs. Currently, investigators lack a unified, 100% offline, air-gapped system to correlate these two data streams effectively. That is the gap we fill today."

### [0:30 - 1:00] Slide 2: The Solution
*(Visual: `slide2_solution_white.jpg`)*
**Speaker:**
"Our solution, AURA-BTC, is a fully air-gapped, zero-cloud dependency engine built natively for secure Linux environments. 
We've engineered a three-layer architecture: First, a high-speed ingestion engine that parses diverse threat intel formats. Second, a Triangulated Risk Engine that uses unsupervised Machine Learning—specifically Isolation Forests and DBSCAN clustering. Finally, an interactive Graph Synthesis layer. Instead of black-box AI, our system provides Explainable AI forensic evidence, telling the investigating officer *exactly* why a wallet is flagged."

### [1:00 - 1:30] Slide 3: The Outcomes
*(Visual: `slide3_outcomes_white.jpg`)*
**Speaker:**
"We have directly met the expected outcomes of the problem statement:
1. Multi-format data ingestion at scale.
2. 100% accurate correlation of network IPs with blockchain TXIDs.
3. Rapid graph synthesis for link analysis.
4. CPU-based local AI scoring with sub-50 millisecond latency.
5. And most importantly, plain-text explainability for every alert.
Let me show you how this executes in our prototype."

---

## Part 2: Technical Prototype Demo
**Time allocation:** 3 minutes 15 seconds
*(Switch screen share to the AURA-BTC Dashboard / Localhost)*

### [1:30 - 2:15] Execution 1: Multi-Format Parsing & Air-Gap Compliance
*(Visual: Drag and drop the synthetic data files like `peeling_chain_attack.json` and `mixer_fanout.xml` into the UI)*
**Speaker:**
"Our system runs entirely on `localhost:8000` with zero internet dependency, fulfilling the strict air-gap compliance requirement. 
I am now dragging and dropping mixed formats—CSV, JSON, and XML—simultaneously into the system. As you can see, our backend parser immediately auto-detects the formats, normalizes timestamps, and sanitizes IP addresses. We achieve an ingestion rate of over 10,000 records per second, storing it efficiently in our in-memory DuckDB columnar database."

### [2:15 - 2:50] Execution 2: On-Chain & Off-Chain Correlation + Local AI
*(Visual: Navigate to the Alerts/Triage Dashboard showing Risk Scores)*
**Speaker:**
"Once ingested, the system automatically correlates the network observations (IPs, Ports, ASNs) with the blockchain ledger (TXIDs and Wallet amounts). 
Behind the scenes, our pipeline extracts 20 multi-dimensional features per wallet. Without needing the cloud or a GPU, our local CPU-based `IsolationForest` model executes unsupervised anomaly detection in under 50 milliseconds per batch. Notice how wallets are instantly assigned a Composite Risk Score from 0 to 100, fusing ML predictions with deterministic graph and network telemetry risks."

### [2:50 - 3:30] Execution 3: Graph Synthesis & Link Analysis
*(Visual: Click on a 'CRITICAL' alert wallet and open the Cytoscape Interactive Graph)*
**Speaker:**
"To investigate a High-Risk entity, we open the Entity Graph Canvas. This directly fulfills the Graph Synthesis outcome. 
Here, we see a dynamic MultiDiGraph. We can clearly trace a complex peeling chain and mixer fan-out. The red nodes represent the suspicious wallets, linked to the IPs and countries they broadcasted from. We've capped the rendering to a k-hop subgraph so the UI remains fluid and responsive, even when querying against millions of backend records."

### [3:30 - 4:15] Execution 4: Explainability & Actionable Intelligence
*(Visual: Zoom in on the Evidence Drawer/Details Panel for a specific alert)*
**Speaker:**
"Finally, we address the Explainability outcome. Intelligence analysts cannot rely on a 'black box' score for court proceedings. 
As I click on this Critical Alert, look at the evidence drawer. The system dynamically generates human-readable forensic bullets. It tells us explicitly: *'Transaction volume is 14.2x higher than dataset median'* or *'Observed across 5 countries, suggesting VPN/Tor hopping.'* The system translates complex math into actionable intelligence."

### [4:15 - 4:30] Conclusion
*(Visual: Return to the main dashboard or final thank you slide)*
**Speaker:**
"In summary, AURA-BTC transforms raw, noisy, disconnected crypto traffic into clear, graph-based intelligence, all while operating entirely offline. We've hit all performance, security, and functional benchmarks required by the problem statement. 
Thank you for your time. We are open to questions."
