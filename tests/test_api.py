"""
Tests for src.api.main (FastAPI endpoints)
"""

import pytest
from fastapi.testclient import TestClient

from src.api.main import app

client = TestClient(app)


class TestHealthCheck:

    def test_health_check(self):
        """Health endpoint should return 200, ONLINE status, OFFLINE mode."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ONLINE"
        assert data["mode"] == "OFFLINE"
        assert data["version"] == "1.0.0"


class TestStatsEndpoint:

    def test_stats_endpoint(self):
        """Stats endpoint should return 200 with required fields."""
        response = client.get("/api/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_network_events" in data
        assert "total_transactions" in data
        assert "total_wallets" in data
        assert "total_alerts" in data


class TestAlertsEndpoint:

    def test_alerts_endpoint(self):
        """Alerts endpoint should return 200 with a list."""
        response = client.get("/api/alerts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_alerts_filter_by_severity(self):
        """Alerts with severity filter should return 200 with filtered list."""
        response = client.get("/api/alerts?severity=CRITICAL")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned alerts should be CRITICAL (if any)
        for alert in data:
            assert alert["severity"] == "CRITICAL"
