"""
AURA-BTC API Schemas
Pydantic models for request/response validation.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class PipelineStep(BaseModel):
    step: str
    message: str
    duration_ms: float = 0.0
    status: str = "COMPLETED"


class MLMetrics(BaseModel):
    wallets_analyzed: int = 0
    anomalies_detected: int = 0
    clusters_formed: int = 0
    isolation_trees: int = 150
    alerts_generated: int = 0
    feature_count: int = 20


class IngestResponse(BaseModel):
    """Response for file ingestion endpoint with live execution feed."""
    status: str = "SUCCESS"
    filename: str
    total_parsed: int = 0
    valid_records: int = 0
    invalid_records: int = 0
    execution_time_seconds: float = 0.0
    pipeline_steps: List[PipelineStep] = Field(default_factory=list)
    ml_metrics: Optional[MLMetrics] = None


class AlertItem(BaseModel):
    """Single alert/lead item."""
    alert_id: str
    entity_type: str = "WALLET"
    entity_id: str
    anomaly_score: float = 0.0
    risk_score: float = 0.0
    confidence_score: str = "LOW"
    severity: str = "LOW"
    explanation: List[str] = Field(default_factory=list)
    top_features: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[str] = None


class EntityGraphResponse(BaseModel):
    """Response for graph entity exploration."""
    center_node: str
    node_count: int = 0
    edge_count: int = 0
    cytoscape_elements: Dict[str, Any] = Field(default_factory=dict)


class TrainResponse(BaseModel):
    """Response for model training endpoint."""
    status: str = "SUCCESS"
    wallets_trained: int = 0
    anomalies_detected: int = 0
    clusters_formed: int = 0
    model_path: str = ""


class SystemStatsResponse(BaseModel):
    """System-wide statistics."""
    total_network_events: int = 0
    total_transactions: int = 0
    total_wallets: int = 0
    total_alerts: int = 0
    critical_alerts: int = 0
    high_alerts: int = 0
    medium_alerts: int = 0
    low_alerts: int = 0
    database_size_bytes: int = 0


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ONLINE"
    mode: str = "OFFLINE"
    version: str = "1.0.0"
