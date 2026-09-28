# AURA-BTC — Complete Project Understanding (Project Samajh)

Yeh document **AURA-BTC** ke complete architecture, working flow, ML engine, synthetic data, aur risk scoring system ko detail mein explain karta hai taaki tum isse asani se samajh sako aur hackathon/viva/demo mein confidently explain kar sako.

---

## 1. Big Picture: AURA-BTC Kya Hai?

**AURA-BTC** ek **Autonomous Offline Bitcoin Intelligence & Traffic Correlation Engine** hai.

### Core Mission:
Darknet criminals, ransomware operators aur money launderers Bitcoin use karte waqt sochte hain ki blockchain anonymous hai. Par jab wo Bitcoin network par transactions broadcast karte hain, toh do tarah ka data generate hota hai:
1. **On-Chain Data**: Wallets, Transactions (TXIDs), BTC Amounts, Fees, Timestamps.
2. **Off-Chain / Network Telemetry Data**: IP addresses, Ports (e.g. Bitcoin P2P 8333), ASNs (Internet Providers/Data Centers), Geolocation (Countries).

**AURA-BTC in dono datasets ko aapas mein fuse (link) karta hai** bina kisi internet dependency ke (100% offline, fully air-gapped system, localhost:8000).

---

## 2. Synthetic Data Files & Attack Scenarios

Folder: `sample_data/`

Project mein testing aur validation ke liye 4 standard forensic scenarios ke synthetic files hain:

| File Name | Format | Scenario / Pattern | Kaam Kya Hai? |
|---|---|---|---|
| **`normal_traffic.csv`** | CSV | Normal Benign Traffic | Standard users jo 1-2 transactions karte hain, single IP aur valid single country/ASN se. Baseline data provide karta hai. |
| **`peeling_chain_attack.json`** | JSON | Peeling Chain Laundering | Ek bada criminal fund baar-baar split hota hai: 1 chhota amount nikalta hai aur baaki amount naye change address pe jata hai, rapidly step-by-step. |
| **`mixer_fanout.xml`** | XML | Tumbler / Mixer (CoinJoin) | Ek source wallet ek saath 15+ destination wallets ko instant rapid transactions bhejta hai taaki funds trace na ho sakein. |
| **`ip_hopping_ransomware.csv`** | CSV | Ransomware Botnet (IP-Hopping) | Ek hi wallet aur transaction alag-alag countries aur alag-alag ASNs se broadcast hoti dikhti hai (Tor/VPN exit nodes use karne ka sign). |

---

## 3. End-to-End Data Pipeline Flow

```
[Uploaded File (.csv / .json / .xml)]
                 │
                 ▼
     [src/ingestion/parsers.py]
  - Auto format detect karta hai
  - Satoshi ko BTC mein convert karta hai
  - Timestamps normalize karta hai
  - IP & Bitcoin P2P ports (8333) validate karta hai
                 │
                 ▼
     [DuckDB: data/aura_database.duckdb]
  ├── network_events  (IP, Port, ASN, Country, txid)
  ├── transactions    (txid, amount, fee, script_type)
  └── wallet_flows    (source_wallet, destination_wallet, amount)
                 │
                 ▼
     [src/ml/features.py]
  - DuckDB se aggregate karke har wallet ke liye 20 behavioral features nikalta hai
                 │
                 ▼
     [src/ml/inference.py]
  - Pre-trained IsolationForest pipeline wallets ko score karta hai
                 │
                 ▼
     [src/engine/risk_engine.py]
  - ML + Graph + Network ko combine karke Composite Risk (0-100) calculate karta hai
  - Explainable forensic evidence bullets generate karta hai
                 │
                 ▼
     [DuckDB: alerts table] & [src/graph/builder.py]
  - Ranked alerts dashboard & Cytoscape interactive graph visualization
```

---

## 4. ML Model: Kaise Chal Raha Hai?

### Step A: 20 Behavioral Features per Wallet (`src/ml/features.py`)
Har unique wallet address ke liye 20 numerical parameters calculate hote hain:
1. **Volume & Velocity**:
   - `transaction_count`: Total transactions.
   - `total_btc_in` & `total_btc_out`: Kitna paisa aaya aur gaya.
   - `net_flow_ratio`: In/Out ratio. Agar $\approx 1.0$ hai, toh wallet sirf "Pass-through Mule" hai.
   - `avg_tx_amount`, `max_tx_amount`, `std_tx_amount`.
2. **Graph Topology**:
   - `fan_out_degree`: Kitne distinct wallets ko fund bheje (Mixers mein extreme high).
   - `fan_in_degree`: Kitne distinct wallets se fund receive hue.
3. **Network Telemetry**:
   - `unique_ip_count`: Kitne alag IP addresses se wallet operate hua.
   - `unique_asn_count`: Kitne alag ISPs/Data centers use hue.
   - `unique_country_count`: Kitni alag countries se transactions aayi.
   - `p2p_port_ratio`: Kitne transactions legitimate Bitcoin P2P ports (8333) se broadcast hue.

### Step B: The ML Algorithms (`src/ml/train.py` & `src/ml/inference.py`)
1. **RobustScaler**:
   - Outliers aur large crypto amounts ko balance karne ke liye median aur Interquartile Range (IQR) use karta hai.
2. **Isolation Forest (150 trees, contamination=0.05)**:
   - Normal wallets clustering ke andar rehte hain; malicious/abnormal wallets ped (tree branches) mein bohot jaldi isolate ho jaate hain.
   - Raw decision scores ko Sigmoid transformation ke through `[0.0, 1.0]` ke range mein convert kiya jata hai:
     $$\text{anomaly\_score} = \frac{1}{1 + e^{-(-\text{raw\_score} \times 5)}}$$
3. **DBSCAN Clustering**:
   - Density-based spatial clustering (`eps=1.5, min_samples=3`) jo similar behavior wale wallets ko cluster IDs assign karta hai (taaki criminal syndicates group ho sakein).

---

## 5. Detections & Composite Risk Score (`src/engine/risk_engine.py`)

AURA-BTC sirf ML par depend nahi karta; yeh **Triangulated Risk Assessment** use karta hai:

### Composite Risk Formula (0 to 100):
$$\text{Composite Risk} = (\text{ML Anomaly Score} \times 50) + (\text{Graph Risk} \times 0.25) + (\text{Network Risk} \times 0.25)$$

- **ML Score (50%)**: `ml_score * 50`
- **Graph Risk (25%)**: $(\text{fan\_out} \times 8) + (\text{fan\_in} \times 4)$ *(Capped at 100 — Mixers & Peeling chains)*
- **Network Risk (25%)**: $(\text{asn\_count} \times 25) + (\text{country\_count} \times 20)$ *(Capped at 100 — Tor, VPNs & IP Hopping)*

### Severity Ratings:
- **$\ge 80$**: `CRITICAL`
- **$60 - 79$**: `HIGH`
- **$40 - 59$**: `MEDIUM`
- **$< 40$**: `LOW`

### Explainable AI (XAI) Forensic Evidence:
Investigator ko black-box score nahi milta, balki readable forensic evidence points milte hain:
- *"Transaction frequency (45 txs) is 4.2× the population median — indicates automated high-velocity activity."*
- *"Fan-out degree of 16 unique recipients exceeds threshold — consistent with mixer/tumbler hub."*
- *"Observed across 5 countries — network diversity suggests VPN/Tor proxy or distributed botnet."*

---

## 6. Entity Graph Engine (`src/graph/builder.py`)

Investigator ko visual link analysis dene ke liye **NetworkX MultiDiGraph** banta hai:

### Graph Components:
- **Nodes**:
  - `WALLET`: Bitcoin Address
  - `TRANSACTION`: Txid hash
  - `IP`: IP address
  - `ASN`: Autonomous System Number
  - `COUNTRY`: Country Code
- **Edges**:
  - `INPUT_TO`: Wallet $\to$ Transaction
  - `OUTPUT_TO`: Transaction $\to$ Destination Wallet
  - `OBSERVED_WITH`: Wallet $\leftrightarrow$ IP
  - `BELONGS_TO_ASN`: IP $\to$ ASN
  - `LOCATED_IN_COUNTRY`: IP $\to$ Country

### Subgraph Traversal & Safety:
- Endpoint: `GET /api/graph/entity/{entity_id}?k=2`
- User jis node par click karta hai, system uske aas-paas ka **k-hop BFS subgraph** nikalta hai.
- **150 Node Hard-Cap**: Frontend Cytoscape canvas freeze na ho, isiliye maximum 150 nodes return karta hai.

---

## 7. Model Training: Alag Se Train Karna Padega Ya Nahi?

**Answer: Bilkul nahi, alag se train karne ki zaroorat nahi hai.**

1. **Pretrained Models Already Present**:
   - `models/anomaly_detector.joblib` aur `models/entity_clustering.joblib` workspace mein already saved hain.
2. **Autonomous Auto-Training**:
   - Jab bhi tum koi naya file upload karte ho (`POST /api/ingest`), backend count check karta hai:
     - Agar database mein $\ge 5$ wallets hain, toh wo **automatically background mein model retrain karta hai, fresh wallet features extract karta hai, aur alerts update kar deta hai**.
3. **Optional Manual Trigger**:
   - Agar chaho toh manually `POST /api/ml/train` call karke model forcibly refresh kar sakte ho.

---

## 8. Quick API Reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Check karega ki server offline mode mein live hai ya nahi |
| `/api/stats` | GET | System-wide counts (Total events, txs, wallets, alerts by severity) |
| `/api/ingest` | POST | Upload .csv / .json / .xml files (Auto-ingests & auto-trains) |
| `/api/alerts` | GET | Get ranked alerts (filter by `CRITICAL`, `HIGH`, etc.) |
| `/api/graph/entity/{id}` | GET | Get k-hop visual subgraph for Cytoscape around an entity |
| `/api/ml/train` | POST | Explicitly trigger offline model retraining |

---

## 9. Hackathon / Presentation Pitch Points

1. **100% Air-Gapped & Offline**: External APIs (jaise Etherscan, Blockchain.info, IPinfo) par depend nahi karta. Law enforcement aur defense environments ke liye ideal hai.
2. **On-chain + Off-chain Correlation**: Sirf blockchain trace nahi karta, balki IP/ASN correlation se proxy/Tor hopping syndicates ko expose karta hai.
3. **Triangulated Risk Engine**: ML predictions ko deterministic graph metrics aur network telemetry ke sath combine karta hai taaki false positives minimize hon.
4. **Explainability by Design**: Har alert ke peeche human-readable forensic evidence bullets hoti hain jisse investigating officer easily court report bana sake.
