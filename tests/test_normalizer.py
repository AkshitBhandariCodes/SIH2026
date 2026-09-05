"""
Tests for src.ingestion.normalizer
"""

import pytest
from src.ingestion.normalizer import (
    classify_port,
    parse_and_validate_network_event,
    parse_satoshi_to_btc,
)


class TestParseAndValidate:
    """Tests for parse_and_validate_network_event."""

    def test_valid_ipv4_and_port(self):
        """Valid record with correct IPv4 addresses and ports should pass."""
        raw = {
            "src_ip": "192.168.1.1",
            "dst_ip": "10.0.0.1",
            "src_port": 49152,
            "dst_port": 8333,
            "timestamp": "2026-01-15T10:30:00",
            "txid": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
            "country": "US",
            "asn": "AS16509",
        }
        is_valid, obs, error = parse_and_validate_network_event(raw)
        assert is_valid is True
        assert obs is not None
        assert obs.is_valid is True
        assert error is None

    def test_invalid_ip_rejection(self):
        """Invalid IP address (999.999.999.999) should be rejected."""
        raw = {
            "src_ip": "999.999.999.999",
            "dst_ip": "10.0.0.1",
            "src_port": 49152,
            "dst_port": 8333,
            "timestamp": "2026-01-15T10:30:00",
            "txid": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
        }
        is_valid, obs, error = parse_and_validate_network_event(raw)
        assert is_valid is False
        assert "Invalid source IP" in error

    def test_invalid_port_rejection(self):
        """Port number 99999 (out of range) should be rejected."""
        raw = {
            "src_ip": "192.168.1.1",
            "dst_ip": "10.0.0.1",
            "src_port": 99999,
            "dst_port": 8333,
            "timestamp": "2026-01-15T10:30:00",
            "txid": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
        }
        is_valid, obs, error = parse_and_validate_network_event(raw)
        assert is_valid is False
        assert "Invalid source port" in error

    def test_malformed_txid_rejection(self):
        """Non-hex TXID should be rejected."""
        raw = {
            "src_ip": "192.168.1.1",
            "dst_ip": "10.0.0.1",
            "src_port": 49152,
            "dst_port": 8333,
            "timestamp": "2026-01-15T10:30:00",
            "txid": "not-a-valid-txid-at-all",
        }
        is_valid, obs, error = parse_and_validate_network_event(raw)
        assert is_valid is False
        assert "Invalid TXID" in error


class TestClassifyPort:
    """Tests for classify_port."""

    def test_port_classification(self):
        """Port classification should return correct categories."""
        assert classify_port(8333) == "BITCOIN_P2P"
        assert classify_port(8332) == "BITCOIN_RPC"
        assert classify_port(18333) == "BITCOIN_TESTNET"
        assert classify_port(50000) == "EPHEMERAL"
        assert classify_port(80) == "OTHER"


class TestSatoshiConversion:
    """Tests for parse_satoshi_to_btc."""

    def test_satoshi_to_btc_conversion(self):
        """Satoshi values (>=1000) should convert to BTC; BTC values should pass through."""
        assert parse_satoshi_to_btc(100_000_000) == 1.0
        assert parse_satoshi_to_btc(50_000_000) == 0.5
        assert parse_satoshi_to_btc(0.5) == 0.5
        assert parse_satoshi_to_btc(1.5) == 1.5
