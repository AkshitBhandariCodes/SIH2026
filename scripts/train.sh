#!/bin/bash
set -e
echo "============================================"
echo "  AURA-BTC: Training Pipeline"
echo "============================================"

# Step 1: Ingest all sample files
echo "[1/3] Ingesting sample data files..."
uv run python -c "
from src.database.connection import get_connection
from src.ingestion.parsers import ingest_file
import glob, os, uuid

con = get_connection()
total_valid = 0
total_invalid = 0

for f in sorted(glob.glob('sample_data/*')):
    print(f'  Ingesting: {os.path.basename(f)}')
    result = ingest_file(f)
    for rec in result['records']:
        try:
            con.execute(
                'INSERT OR IGNORE INTO network_events '
                '(event_id, timestamp, src_ip, dst_ip, src_port, dst_port, '
                'txid, country, asn, is_p2p_port) '
                'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [rec['event_id'], rec['timestamp'], rec['src_ip'], rec['dst_ip'],
                 rec['src_port'], rec['dst_port'], rec['txid'], rec['country'],
                 rec['asn'], rec['is_p2p_port']])
            con.execute(
                'INSERT OR IGNORE INTO transactions '
                '(txid, timestamp, total_input, total_output, fee, script_type) '
                'VALUES (?, ?, ?, ?, ?, ?)',
                [rec['txid'], rec['timestamp'], rec['amount'], rec['amount'],
                 rec['fee'], rec['script_type']])
            if rec.get('source_wallet') and rec.get('destination_wallet'):
                con.execute(
                    'INSERT OR IGNORE INTO wallet_flows '
                    '(flow_id, txid, source_wallet, destination_wallet, amount, timestamp) '
                    'VALUES (?, ?, ?, ?, ?, ?)',
                    [str(uuid.uuid4()), rec['txid'], rec['source_wallet'],
                     rec['destination_wallet'], rec['amount'], rec['timestamp']])
        except Exception:
            continue
    total_valid += result['valid_records']
    total_invalid += result['invalid_records']
    print(f'    -> {result[\"valid_records\"]} valid, {result[\"invalid_records\"]} invalid')

print(f'\n  Total: {total_valid} valid records, {total_invalid} invalid records')
"

# Step 2: Train ML models
echo ""
echo "[2/3] Training ML models..."
uv run python -c "
from src.database.connection import get_connection
from src.ml.train import train_offline_models
con = get_connection()
r = train_offline_models(con)
print(f'  Wallets trained: {r[\"wallets_trained\"]}')
print(f'  Anomalies detected: {r[\"anomalies_detected\"]}')
print(f'  Clusters formed: {r[\"clusters_formed\"]}')
print(f'  Model saved: {r[\"model_path\"]}')
"

# Step 3: Generate alerts
echo ""
echo "[3/3] Generating risk alerts..."
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
print(f'  Alerts generated: {len(a)}')
for alert in a[:5]:
    print(f'    [{alert[\"severity\"]}] {alert[\"entity_id\"][:20]}... Risk: {alert[\"risk_score\"]}')
"

echo ""
echo "============================================"
echo "  Training complete!"
echo "  Next: ./scripts/start.sh"
echo "============================================"
