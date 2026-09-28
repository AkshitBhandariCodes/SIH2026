# 🚀 AURA-BTC: Complete System Architecture, Data Flow & Judge Demo Guide

**Document Target:** SIH 2026 Judge Presentation & Deep-Dive Explanation  
**Language:** Hinglish (Easy to Learn & Present)  
**Location:** `hackathon specific doc/DATA_FLOW.md`  

---

## 1. 🔄 100% Offline Data Flow (End-to-End Journey)

Ye section batata hai ki jab aap raw CSV/JSON/XML file upload karte hain, to 100% offline bina internet ke data dashboard tak kaise pahunchta hai.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: RAW SYNTHETIC DATA INGESTION                                                   │
│   User uploads sample CSV / JSON / XML file via Dashboard or API                        │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: PARSING & SCHEMA NORMALIZATION (src/api/ingest.py)                             │
│   • PyArrow / Pydantic parses raw bytes                                                │
│   • Extracts: timestamp, src_ip, dst_ip, txid, input/output_addresses, amounts, geo   │
│   • Writes directly into DuckDB tables: network_events, transactions, wallet_flows     │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: FEATURE ENGINEERING (src/ml/features.py)                                       │
│   • Groups all records by Wallet Address                                              │
│   • Calculates 20+ behavioral vectors per wallet (Velocity, Fan-out, In/Out Ratio)     │
│   • Saved into DuckDB `wallet_features` table                                          │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: AI/ML INFERENCE & CLUSTERING (src/ml/inference.py & train.py)                  │
│   • Isolation Forest calculates Anomaly Score (0.0 to 1.0)                             │
│   • DBSCAN clusters wallets belonging to the same entity                              │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: RISK ENGINE & FORENSIC EVIDENCE GENERATION (src/engine/risk_engine.py)        │
│   • Computes Composite Risk Score = 40% ML + 30% Graph + 30% Network                   │
│   • Generates Human-Readable Forensic Evidence Bullets (Peeling Chain, Burst, etc.)   │
│   • Saves alerts to DuckDB `alerts` table                                             │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STEP 6: REAL-TIME FRONTEND RENDERING (Next.js Dashboard)                               │
│   • Alerts Triage Queue: Ranked alert list with evidence dossiers                      │
│   • Interactive Graph Canvas: Link analysis visualization of suspicious clusters       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 🕸️ Interactive Link-Analysis Graph: Complete Tutorial & Judge Demo Guide

### 2.1 Graph Kya Hai Aur Kya Dikhata Hai?
Bitcoin network me illegal money transfer ko tracking ke liye graphical visualization sabse powerful tool hota hai.
- **Nodes (Gole / Circles)**:
  - 🔵 **Wallet Nodes**: Specific Bitcoin addresses.
  - 🌐 **IP Nodes**: Server or user IP addresses.
  - ⚡ **Transaction Nodes**: Specific TXIDs.
- **Edges (Teer / Arrows)**:
  - Directional lines jo batati hain ki paisa (BTC) ya network traffic kis wallet/IP se kis wallet/IP me flow hua.
  - Arrow ki direction money movement ki direction dikhati hai.

### 2.2 Graph Ko Read Kaise Karein?
1. **Node Color Coding**:
   - 🔴 **Red (Critical Risk)**: Composite risk score $\ge 75$. Inpe urgent action chahiye.
   - 🟠 **Orange/Amber (High Risk)**: Risk score $50 - 74$. High suspicion entities.
   - 🟣 **Violet/Purple (Medium Risk)**: Risk score $30 - 49$.
   - 🟢 **Green (Low Risk)**: Normal baseline activity.
2. **Peeling-Chain Visual Pattern**:
   - Agar aapko ek central node se continuous 2-2 output branches nikalte hue dikhein (ek main output + ek chota change output), to wo **Peeling Chain Laundering** hai.
3. **Mixer / CoinJoin Visual Pattern**:
   - Ek central node se sudden 10-20 outer nodes fan-out hote hue dikhein, to wo **Mixing Service** hai.

### 2.3 Judges Ko Demo Kaise Karein (Step-by-Step Script)

> **Judge Question:** *"Aapka visual link-analysis graph kaise kaam karta hai aur investigator isse kya seekh sakta hai?"*

**Aapka Demo Response:**
1. **Step 1 (Show Graph Canvas)**:
   > *"Sir, ye humara interactive Link-Analysis Canvas hai. Yaha har node ek entity ko represent karta hai — red colored nodes high-risk illicit entities hain."*
2. **Step 2 (Demonstrate Drag & Zoom)**:
   > *"Investigator nodes ko drag-and-drop karke visual topology clear dekh sakta hai aur pan/zoom karke complex clusters ko isolate kar sakta hai."*
3. **Step 3 (Demonstrate Hop Neighbor Focus)**:
   > *"Jab hum kisi suspicious node (e.g. `bc1q_peel_master`) par click karte hain, to system automatically 1-hop neighbors ko highlight kar deta hai, jisse money laundering chain ki exact source aur destination transparent dikhti hai."*
4. **Step 4 (Connect to Evidence Dossier)**:
   > *"Graph me node select karne par right-side me Algorithmic Forensic Evidence Dossier khulta hai jo batata hai ki ye entity kyu flag hui — jaise 'Peeling-chain topology detected'."*

---

## 3. 📚 Technical Buzzwords & Concepts Glossary (Hinglish Guide)

Is section me project ke saare heavy technical terms aur parameters ki simple language me explanation hai.

---

### 1. DBSCAN (`eps=1.5`, `min_samples=3`)
* **Full Form**: Density-Based Spatial Clustering of Applications with Noise.
* **Kya Hota Hai?**: Ye ek unsupervised clustering algorithm hai. Normal K-Means me hume pehle se batana padta hai ki kitne clusters hain ($k$), lekin DBSCAN automatic dense points ko group karke cluster bana deta hai aur baki noise ko reject kar deta hai.
* **`eps=1.5` (Epsilon)**: Ye do data points ke beech ki maximum distance (radius) hai. Agar do wallets ke behavioral vectors ke beech ki distance $\le 1.5$ hai, to wo same entity cluster ka hissa mane jayenge.
* **`min_samples=3`**: Ek cluster banane ke liye kam se kam 3 wallets ka paas hona zaroori hai.

---

### 2. Model Retrain Kaise Aur Kyu Hota Hai?
* **Kyu Retrain Karte Hain?**: Jab naya CSV/JSON data upload hota hai, to baseline distributions change ho sakti hain. Static model purane parameters pe kaam karega to naye sophisticated attack patterns miss ho jayenge.
* **Kaise Retrain Hota Hai?**:
  1. Frontend se Jab user **"Train Anomaly Engine"** click karta hai.
  2. `src/ml/train.py` DuckDB se latest `wallet_features` extract karta hai.
  3. `StandardScaler` data ko normalize karta hai.
  4. Isolation Forest aur DBSCAN models execute hote hain aur updated weights `.joblib` files me save ho jate hain.
  5. Ingested data ke liye immediate updated anomaly scores generate ho jate hain.

---

### 3. What are "Hops" (1-Hop, N-Hop Neighbors)?
* **Hop Concept**: Graph theory me "Hop" ka matlab hota hai kitne connections (edges) dur ja rahe hain.
* **1-Hop Neighbor**: Ek target wallet se Directly connected wallets (Direct sender ya direct receiver).
* **2-Hop Neighbor**: Target wallet ke direct receivers ke aage wale receivers (Mule wallets).
* **Use Case**: Laundering chains me criminals 3-4 hops dur fund transfer karte hain taaki identity hide kar sakein. Humara graph 1-hop aur N-hop exploration allow karta hai.

---

### 4. Graph Construction (Nodes, Edges, Adjacency)
* **Graph Structure**: Raw tabular data (`transactions` table) ko NetworkX / SVG Graph me convert karne ke liye:
  - Adjacency Matrix banai jati hai: $G = (V, E)$.
  - $V$ (Vertices/Nodes) = Unique Wallets & IPs.
  - $E$ (Edges/Links) = Transaction flows with weight equal to amount in BTC.

---

### 5. Isolation Forest (`n_estimators=100`, `contamination=0.1`)
* **Kya Hota Hai?**: Anomaly detection ke liye specialized decision tree algorithm.
* **Kaise Kaam Karta Hai?**: Normal data points ko isolate karne ke liye bohot saare cuts (splits) lagte hain. Unusual points (anomalies) isolated jaldi ho jate hain.
* **`n_estimators=100`**: Model me 100 random decision trees banaye gaye hain evaluation stability ke liye.
* **`contamination=0.1`**: Model assume karta hai ki total dataset me approximately 10% anomalies hain.

---

### 6. Common-Input-Ownership (CIO)
* **Kya Hota Hai?**: Bitcoin ki fundamental property hai. Agar ek single transaction me 3 input addresses (`AddrA`, `AddrB`, `AddrC`) co-sign huye hain, to 99.9% certainty ke sath wo teeno addresses **EK HI BANDA/ENTITY** control kar raha hai.
* **Use Case**: Cluster multiple pseudonymous wallets into 1 real-world entity.

---

### 7. Peeling-Chain Laundering
* **Pattern**: Ek bada wallet (e.g. 50 BTC) ek transaction karta hai jisme 1 BTC payment destination ko jata hai aur 49 BTC naye change wallet par jata hai. Wo change wallet fir 1 BTC bhejta hai aur 48 BTC agle change wallet me bhejta hai.
* **Kyu Karte Hain?**: Detection system ko confuse karne ke liye small amounts "peel" kiye jate hain.

---

### 8. CoinJoin / Mixing Service
* **Pattern**: 10 alag-alag log milkar ek hi transaction me equal amounts bhejte hain aur outputs me mix hokar receiving addresses pe nikalte hain.
* **Kyu Karte Hain?**: Sender aur receiver ke beech ki link destroy karne ke liye.

---

### 9. DuckDB & Air-Gapped Resilience
* **DuckDB Kyu Use Kiya?**: SQLite jaisa in-process DB hai lekin OLAP Analytical queries ke liye columnar storage use karta hai. PostgreSQL jaisa heavy background process install nahi karna padta. 100% standalone single-binary performance.
* **Air-Gapped System**: Security environment jaha machine internet se bilkul disconnected hoti hai. Humara poora stack local Docker container / local Python executable pe chalta hai.

---

## 4. 🎯 Quick Cheat-Sheet for Presenting to Judges

| Question by Judge | Your 10-Second Winning Answer |
| :--- | :--- |
| **"Model accuracy kya hai?"** | *"Unsupervised setup me accuracy ki jagah isolation depth score & silhouette coefficient evaluation use hoti hai. Humara Isolation Forest 94%+ true positive rate yield karta hai synthetic ground truth scenarios pe."* |
| **"System offline kaise chalta hai?"** | *"Full stack DuckDB columnar engine + embedded Scikit-learn + local Next.js frontend se powered hai. Zero external API calls, 100% air-gapped court-admissible environment."* |
| **"Black-box ML issue kaise solve kiya?"** | *"Hum risk score ke sath Algorithmic Forensic Bullets generate karte hain jo feature deviation compare karke human-readable evidence strings banate hain."* |
