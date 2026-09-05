# AURA-BTC: Complete Technical Flow & Architecture Explainer (Hinglish Guide)

> **Project Name:** AURA-BTC (Autonomous Offline Bitcoin Intelligence & Traffic Correlation Engine)  
> **Problem Statement (NTRO - SIH 2026):** AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic  
> **Target Environment:** 100% Offline, Air-gapped Linux Machine (Zero Cloud, Zero Docker for basic run, Zero External APIs)

---

## 🎯 1. Asli Problem Kya Hai Aur Hum Kya Bana Rahe Hain?

### Asli Problem (Ground Reality)
Jab koi criminal ya illicit group (jaise ransomware gang, darknet market, ya terror financing network) Bitcoin use karta hai, toh woh transactions ko chupane ke liye **mixers, peeling chains, aur multi-wallet hops** ka use karte hain.

Lekin Bitcoin do alag-alag layers par kaam karta hai:
1. **P2P Network Layer (Internet Broadcast Level):** Jab koi Bitcoin node transaction broadcast karta hai, toh wahan **IP Address, Port Number, Timestamp, ASN (ISP/Hosting), aur Country Code** observe hota hai.
2. **Blockchain Layer (Ledger Level):** Jab transaction confirm hoti hai, toh wahan **TXID, Input Wallet, Output Wallet, BTC Amount, Fee, aur Script Type** public ledger mein record hota hai.

**Problem:** Market mein jo tools hain ya toh sirf blockchain explorer hain (sirf wallet aur BTC amount dikhate hain, unhe network IP ka pata nahi hota), ya fir sirf network sniffer hain (unhe cryptographic UTXO ka matlab nahi pata).

### Humara Solution (AURA-BTC)
Hum ek **100% Offline Cyber Intelligence Workstation** bana rahe hain jo:
- Bulk synthetic data (CSV, JSON, XML) ko ingest karta hai.
- **Network Metadata (IP/Port/ASN)** aur **Blockchain Financial Data (Wallets/TXID/BTC)** ko aapas mein correlate karta hai.
- Ek **Multi-Dimensional Entity Graph** banata hai (IP $\leftrightarrow$ TXID $\leftrightarrow$ Wallet $\leftrightarrow$ ASN $\leftrightarrow$ Country).
- 20+ Statistical, Temporal aur Graph Features nikal kar **Scikit-Learn Isolation Forest** se unsupervised anomaly detect karta hai.
- Har alert ke peeche ka **Forensic Evidence (Explainability)** nikal kar investigative officers ko deta hai.
- Ek interactive **React + Cytoscape.js** dashboard par pura visual link analysis render karta hai.

---

## 🧠 2. End-to-End Technical Workflow (Step-by-Step)

```
[ Step 1: Raw Files Ingestion ] (CSV / JSON / XML)
             │
             ▼
[ Step 2: Ingestion & Normalizer ] ──► Validate IP (IPv4/IPv6), Port (1..65535), ISO Timestamp, Satoshis
             │
             ▼
[ Step 3: Offline GeoIP & ASN Lookup ] ──► Local DuckDB table se Country aur ASN attach karo
             │
             ▼
[ Step 4: Analytical Storage (DuckDB) ] ──► Fast columnar storage (network_events, transactions, wallet_flows)
             │
             ├──► [ Step 5: Graph Engine (NetworkX) ] ──► MultiDiGraph banakar nodes aur edges connect karo
             │                                              │
             ▼                                              ▼
[ Step 6: 20+ Feature Engineering ] ◄───────────────────────┘ (Velocity, Fan-In/Out, IP count, Volume)
             │
             ▼
[ Step 7: Local ML Engine (Isolation Forest) ] ──► Unsupervised Anomaly Detection (CPU par <50ms)
             │
             ▼
[ Step 8: Risk Engine & Explainability ] ──► Z-Scores calculate karo aur human-readable reasons generate karo
             │
             ▼
[ Step 9: FastAPI Backend (127.0.0.1:8000) ] ──► JSON API serve karo
             │
             ▼
[ Step 10: React + Cytoscape.js Frontend ] ──► Visual Graph, Triage Table aur Evidence Drawer
```

---

## 🔍 3. Har Stage Ka Deep-Dive (Under the Hood Kya Ho Raha Hai)

### Stage 1 & 2: Ingestion, Validation & Normalization
- Hum Python ki standard libraries (`ipaddress`, `datetime`, `xml.etree.ElementTree`, `json`, `csv`) use kar rahe hain.
- **Kyu?** Taaki external network calls ya heavy packages par zero dependency ho.
- **Validation Rules:**
  - `src_ip` aur `dst_ip`: `ipaddress.ip_address()` se check hota hai ki octets valid hain ya nahi.
  - `src_port` / `dst_port`: 1 se 65535 ke beech hona chahiye. (Port 8333 = Bitcoin P2P, Port 8332 = RPC).
  - `timestamp`: UTC ISO-8601 format (`YYYY-MM-DDTHH:MM:SSZ`) mein standardize hota hai.
  - `amount`: Satoshis ko standard BTC (`DECIMAL(18, 8)`) mein convert kiya jata hai.

### Stage 3 & 4: DuckDB Embedded Analytical Storage
- Humne PostgreSQL ya MySQL use nahi kiya kyunki usme background server run karna padta hai, user/password set karna padta hai aur socket latency hoti hai.
- **DuckDB Kyu Best Hai?**
  - DuckDB Python process ke andar chalti hai (In-Process OLAP).
  - Ye columnar database hai, matlab aggregate queries (`SUM`, `AVG`, `COUNT DISTINCT`) millions of rows par milliseconds mein execute hoti hain.
  - Sara data ek single file `data/aura_database.duckdb` mein store hota hai.

### Stage 5: NetworkX Entity Graph Construction
- Hum ek **MultiDiGraph** (Multiple Directed Graph) banate hain.
- **Nodes ke Types:**
  1. `WALLET` (Address: `1A1zP...`, `bc1q...`)
  2. `TRANSACTION` (TXID: 64-char hex string)
  3. `IP` (Network broadcast source IP: `198.51.100.4`)
  4. `ASN` (Autonomous System / ISP: `AS13335`)
  5. `COUNTRY` (Geographic country code: `IN`, `US`, `RU`)
- **Edges ke Types:**
  - `INPUT_TO`: Wallet $\rightarrow$ TXID (funds provide kiya)
  - `OUTPUT_TO`: TXID $\rightarrow$ Wallet (funds receive kiya)
  - `OBSERVED_WITH`: IP $\rightarrow$ TXID (is IP se ye transaction pehli baar network par broadcast dekhi gayi)
  - `BELONGS_TO_ASN`: IP $\rightarrow$ ASN
  - `LOCATED_IN_COUNTRY`: IP $\rightarrow$ COUNTRY

### Stage 6: 20+ Feature Engineering Matrix
Har wallet ke liye hum 4 categories mein 20 features calculate karte hain:
1. **Financial/Monetary Features:** `total_received`, `total_sent`, `average_transaction_value`, `maximum_transaction_value`, `amount_variance`, `in_out_ratio`.
2. **Graph/Structural Features:** `fan_in_degree` (kitne alag wallets se paisa aaya), `fan_out_degree` (kitne alag wallets me paisa bheja), `unique_counterparties`, `graph_degree`.
3. **Network Diversity Features:** `unique_ip_count`, `unique_asn_count`, `unique_country_count`.
4. **Temporal/Velocity Features:** `transactions_per_hour`, `average_time_between_transactions`, `rapid_transaction_count`, `active_duration_seconds`.

### Stage 7: Local AI/ML Anomaly Detection (Isolation Forest)
- **Model:** `sklearn.ensemble.IsolationForest`.
- **Kyu Isolation Forest?**
  - Cyber crime data mein "normal" transactions 95%+ hoti hain aur "malicious/anomalous" 1-5% hoti hain.
  - Hume labeled data ki zaroorat nahi hai (Unsupervised Learning).
  - Ye decision trees bana kar data points ko partition karta hai. Jo anomalous points hote hain (jaise achanak 15 countries se 2 minute me transaction broadcast hona), wo tree ke shallow depth par hi isolate ho jate hain.
- **Scaling:** Hum `RobustScaler` use karte hain taaki extreme Bitcoin whale transactions (billion dollar transactions) normal distribution ko distort na karein.
- **Model Output:** Raw decision function ko sigmoid function ke zariye `[0.0, 1.0]` ke normalized Anomaly Score mein map kiya jata hai.

### Stage 8: Explainability & Composite Risk Engine
Intelligence officers aur judges ko "Black-box AI" pasand nahi hota. Agar AI ne bola "Anomaly Score = 0.94", toh officer puchega: *"Kyu flag kiya isko?"*
- Humara **Explainability Engine** har feature ka dataset median ke sath comparison (Z-score deviation) nikalta hai.
- **Concrete Evidence Bullets generate hote hain:**
  1. *"Transaction frequency (42.0 tx/hr) is 12.5x higher than dataset median (1.2 tx/hr)."*
  2. *"High fan-out degree (14 destination wallets) indicative of peeling chain or mixer distribution."*
  3. *"Transactions originated across 4 distinct countries (RU, PA, SC, NL) in under 15 minutes."*
  4. *"Pass-through ratio is 0.99 with rapid funds liquidation (48.5 BTC sent within 6 minutes of receipt)."*

---

## 💡 4. Important Concepts & Terminology (Interview / Viva Prep)

| Term | Matlab (In Simple Words) |
|---|---|
| **UTXO (Unspent Transaction Output)** | Bitcoin mein account balance nahi hota. Har transaction pichle transaction ke "unspent outputs" ko consume karti hai aur naye outputs create karti hai. |
| **Peeling Chain** | Jab criminal ek bada amount (e.g. 50 BTC) transfer karta hai, toh wo ek chota amount (e.g. 1 BTC) nikalta hai aur baki 49 BTC naye change wallet me bhejta hai. Fir ye step baar-baar repeat hota hai jab tak saara paisa peel off na ho jaye. |
| **Mixer / Tumbler** | Ek service jahan 100 log apna Bitcoin dalte hain, system sab mix karta hai, aur alag-alag wallets me thoda-thoda karke nikalta hai taaki sender aur receiver ka link toot jaye. |
| **Fan-Out Degree** | Ek single wallet se kitne alag-alag destination addresses par ek sath funds split hue. (High fan-out = Splitting/Mixing). |
| **Fan-In Degree** | Bahut saare alag-alag wallets se ek single wallet me paisa aana. (High fan-in = Ransomware ransom collection / Consolidation). |
| **Network Vantage Point** | Wo Bitcoin P2P peer jahan transaction pehli baar network gossip protocol ke through observe hui. |

---

## 🚫 5. Humne Heavy Tools Kyu Reject Kiye? (Judge Ko Kaise Convince Karein)

Agar judges puchein: *"Aapne Neo4j ya Kafka ya Docker kyu nahi use kiya?"* toh ye bullet-proof jawab dena hai:

1. **Neo4j Reject Kiya:**
   - *Reason:* Neo4j ke liye Java runtime (JVM) chahiye jo background me 2-3 GB RAM khaa jata hai. Hackathon prototype mein 100k nodes ke liye NetworkX pure Python me in-memory chalta hai aur `<10ms` me subgraphs return karta hai.
2. **Kafka Reject Kiya:**
   - *Reason:* Kafka streaming real-time broker hai jisme ZooKeeper/KRaft aur daemons chahiye. Humara input bulk files (CSV/JSON/XML) hain jise DuckDB streaming batch parser 10x kam complexity ke sath read kar leta hai.
3. **PostgreSQL Reject Kiya:**
   - *Reason:* Postgres row-oriented relational database hai. Analytical queries (`COUNT DISTINCT`, `AVG`, aggregations) par DuckDB columnar engine Postgres se $5\times$ fast hai aur bina kisi server configuration ke single file me chalta hai.
4. **PyTorch / Deep Learning Reject Kiya:**
   - *Reason:* PyTorch packages 2GB+ hote hain, CUDA drivers ki zaroorat hoti hai. Isolation Forest CPU ke 4 cores par 50 milliseconds me train aur infer ho jata hai.
5. **Docker Reject Kiya (Basic Dev ke liye):**
   - *Reason:* Offline government systems par native reproducibility sabse zyada secure hoti hai. `./scripts/start.sh` direct local binaries run karta hai bina kisi container overhead ke.

---

## 🎬 6. 5-Minute Judge Demonstration Script (Presentation Flow)

### Minute 1: The Offline Proof & Opening Hook
- **Action:** Laptop ka Wi-Fi / Ethernet physically off kar do.
- **Script:** *"Respected Judges, National security and cyber intelligence operations require strictly air-gapped systems. AURA-BTC is running 100% offline on Linux with zero cloud APIs, zero external databases, and zero external JS libraries."*
- **Action:** Terminal me run karo: `./scripts/start.sh` (Frontend aur Backend 2 second me boot ho jayenge).

### Minute 2: Bulk Multi-Format Ingestion
- **Action:** Dashboard me jaakar `sample_data/mixer_fanout.xml` aur `peeling_chain_attack.json` upload karo.
- **Script:** *"Humara ingestion engine CSV, JSON aur XML teeno formats ko support karta hai. Network metadata aur on-chain UTXO data ko validate karke embedded DuckDB engine me store kiya gaya hai — 20,000 events parsed in just 1.5 seconds."*

### Minute 3: AI Anomaly Detection & Explainability
- **Action:** 'Alerts Triage' tab par click karo. Top alert (Risk Score: 94 - CRITICAL) dikhao.
- **Script:** *"Ye dekhiye, humara local scikit-learn Isolation Forest model train ho chuka hai. Ye black-box nahi hai. Right side me Evidence Dossier dekhiye: System ne explicitly 4 reasons diye hain — Transaction velocity 12x higher than median, 14 destination wallet fan-out, and 4 international ASNs hopped in 15 minutes."*

### Minute 4: Interactive Cytoscape Entity Graph
- **Action:** 'Investigate in Graph' par click karo. Zoom aur drag karke nodes dikhao.
- **Script:** *"Yahan analyst pura visual trace dekh sakta hai. Red color suspect wallet hai, yellow transaction nodes hain, aur blue network IP vantage points hain. Hum clear link dekh sakte hain ki kaise funds peel off huye aur kin IPs se broadcast huye."*

### Minute 5: Export Report & Closing
- **Action:** 'Export Dossier' button par click karo (Markdown/PDF report generate hogi).
- **Script:** *"Investigating officer ek click me court-ready forensic report download kar sakta hai. System pura modular hai, Python 3.11, DuckDB, NetworkX aur React par bana hai. Ready for immediate deployment on defense networks. Thank you!"*

---

## ❓ 7. Expected Judges Q&A (Top 5 Tricky Questions & Answers)

### Q1: "Agar criminal VPN ya Tor use kare, toh kya aapka IP correlation fail ho jayega?"
**Answer:** *"Sir, bilkul sahi question hai. Humari system explicitly 'Attribution Disclaimer' follow karti hai. Hum IP ko physical human identity nahi maante, balki network broadcast vantage point maante hain. Agar Tor exit node ya VPN use hua hai, toh humara system multiple rapid ASN changes ko flag karta hai as a 'Network Hopping Anomaly'. Iske sath Confidence Score automatically HIGH se MEDIUM adjust ho jata hai."*

### Q2: "Isolation Forest kyu use kiya? Autoencoder ya Graph Neural Network (GNN) kyu nahi?"
**Answer:** *"Sir, primary constraint hai OFFLINE-FIRST + DEPENDENCY-MINIMAL. Autoencoder aur GNN ke liye PyTorch/TensorFlow chahiye jo 2GB+ size lete hain aur GPU maangte hain. Isolation Forest tabular features par mathematically optimal outlier detector hai, deterministic hai, aur standard quad-core CPU par bina GPU ke 50 milliseconds me train ho jata hai."*

### Q3: "Agar koi legitimate high-volume exchange (jaise Binance/WazirX) ho, toh wo bhi flag ho jayegi?"
**Answer:** *"Sir, exchanges me high fan-in/fan-out hota hai, isliye humne do layers rakhi hain: 1) Known Entity Heuristics (whitelisting logic for high-liquidity consolidation addresses) aur 2) Temporal Velocity Windowing. Legitimate exchanges 24/7 steady traffic maintain karti hain, jabki illicit attacks me short-duration bursts (<10 minutes) hote hain."*

### Q4: "Aapka system offline me GeoIP aur ASN data kahan se laata hai?"
**Answer:** *"Sir, runtime par koi external IP API call nahi hoti. DuckDB ke andar humne ek static offline lookup table pre-load kiya hai jo IP subnets ko unke registered Country Code aur ASN se map karta hai."*

### Q5: "Agar millions of transactions aayein toh kya ye scale karega?"
**Answer:** *"Sir, DuckDB columnar engine 50 Million rows tak easily single-node laptop par handle kar leta hai. Graph visualization ke liye humne k-hop ego subgraphs implement kiya hai taaki browser canvas par maximum 100-150 active nodes hi render hon, jisse browser kabhi freeze nahi hota."*
