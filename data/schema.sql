-- ============================================================
-- AURA-BTC: DuckDB Schema Definition
-- Autonomous Offline Bitcoin Intelligence & Traffic Correlation
-- ============================================================

-- 1. Network broadcast observations
CREATE TABLE IF NOT EXISTS network_events (
    event_id        VARCHAR PRIMARY KEY,
    timestamp       TIMESTAMP NOT NULL,
    src_ip          VARCHAR NOT NULL,
    dst_ip          VARCHAR NOT NULL,
    src_port        INTEGER NOT NULL,
    dst_port        INTEGER NOT NULL,
    txid            VARCHAR,
    country         VARCHAR DEFAULT 'UNKNOWN',
    asn             VARCHAR DEFAULT 'UNKNOWN',
    is_p2p_port     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. On-chain Bitcoin transactions
CREATE TABLE IF NOT EXISTS transactions (
    txid            VARCHAR PRIMARY KEY,
    timestamp       TIMESTAMP NOT NULL,
    total_input     DOUBLE DEFAULT 0.0,
    total_output    DOUBLE DEFAULT 0.0,
    fee             DOUBLE DEFAULT 0.0,
    script_type     VARCHAR DEFAULT 'UNKNOWN',
    input_count     INTEGER DEFAULT 1,
    output_count    INTEGER DEFAULT 1,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Atomic wallet-to-wallet value transfers
CREATE TABLE IF NOT EXISTS wallet_flows (
    flow_id             VARCHAR PRIMARY KEY,
    txid                VARCHAR,
    source_wallet       VARCHAR NOT NULL,
    destination_wallet  VARCHAR NOT NULL,
    amount              DOUBLE NOT NULL,
    timestamp           TIMESTAMP NOT NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Engineered features per wallet (20+ features)
CREATE TABLE IF NOT EXISTS wallet_features (
    wallet_address                  VARCHAR PRIMARY KEY,
    transaction_count               INTEGER DEFAULT 0,
    incoming_count                  INTEGER DEFAULT 0,
    outgoing_count                  INTEGER DEFAULT 0,
    total_received                  DOUBLE DEFAULT 0.0,
    total_sent                      DOUBLE DEFAULT 0.0,
    average_transaction_value       DOUBLE DEFAULT 0.0,
    maximum_transaction_value       DOUBLE DEFAULT 0.0,
    amount_variance                 DOUBLE DEFAULT 0.0,
    unique_counterparties           INTEGER DEFAULT 0,
    fan_in_degree                   INTEGER DEFAULT 0,
    fan_out_degree                  INTEGER DEFAULT 0,
    unique_ip_count                 INTEGER DEFAULT 0,
    unique_asn_count                INTEGER DEFAULT 0,
    unique_country_count            INTEGER DEFAULT 0,
    transactions_per_hour           DOUBLE DEFAULT 0.0,
    average_time_between_transactions DOUBLE DEFAULT 0.0,
    rapid_transaction_count         INTEGER DEFAULT 0,
    graph_degree                    INTEGER DEFAULT 0,
    in_out_ratio                    DOUBLE DEFAULT 0.0,
    active_duration_seconds         DOUBLE DEFAULT 0.0,
    cluster_id                      INTEGER DEFAULT -1,
    updated_at                      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Flagged investigation leads / alerts
CREATE TABLE IF NOT EXISTS alerts (
    alert_id            VARCHAR PRIMARY KEY,
    entity_type         VARCHAR NOT NULL DEFAULT 'WALLET',
    entity_id           VARCHAR NOT NULL,
    anomaly_score       DOUBLE DEFAULT 0.0,
    risk_score          DOUBLE DEFAULT 0.0,
    confidence_score    VARCHAR DEFAULT 'LOW',
    severity            VARCHAR DEFAULT 'LOW',
    explanation_json    VARCHAR DEFAULT '[]',
    top_features        VARCHAR DEFAULT '{}',
    is_resolved         BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Offline IP-to-Country/ASN mapping
CREATE TABLE IF NOT EXISTS geo_asn_lookup (
    ip_prefix       VARCHAR PRIMARY KEY,
    country_code    VARCHAR NOT NULL,
    country_name    VARCHAR,
    asn_number      VARCHAR NOT NULL,
    asn_name        VARCHAR,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Convenience view: wallet features joined with latest alert
CREATE OR REPLACE VIEW v_entity_summary AS
SELECT
    wf.*,
    a.alert_id,
    a.anomaly_score AS alert_anomaly_score,
    a.risk_score AS alert_risk_score,
    a.confidence_score AS alert_confidence,
    a.severity AS alert_severity,
    a.explanation_json AS alert_explanation,
    a.top_features AS alert_top_features,
    a.is_resolved AS alert_is_resolved,
    a.created_at AS alert_created_at
FROM wallet_features wf
LEFT JOIN alerts a ON wf.wallet_address = a.entity_id
    AND a.entity_type = 'WALLET';
