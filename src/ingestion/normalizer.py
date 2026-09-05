"""
AURA-BTC Data Normalizer
Validates and normalizes raw Bitcoin network traffic records.
"""

import ipaddress
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, Tuple


# Bitcoin well-known ports
BITCOIN_P2P_PORT = 8333
BITCOIN_TESTNET_PORT = 18333
BITCOIN_RPC_PORT = 8332
EPHEMERAL_PORT_MIN = 49152
EPHEMERAL_PORT_MAX = 65535

# TXID: 64 hex characters (SHA-256 hash)
TXID_PATTERN = re.compile(r"^[a-fA-F0-9]{64}$")

# Satoshi threshold — amounts above this are treated as satoshis
SATOSHI_THRESHOLD = 1_000


@dataclass(frozen=True)
class NetworkObservation:
    """Immutable, validated network observation record."""
    src_ip: str
    dst_ip: str
    src_port: int
    dst_port: int
    timestamp: str
    txid: str
    country: str = "UNKNOWN"
    asn: str = "UNKNOWN"
    is_valid: bool = True
    error_reason: Optional[str] = None


def validate_ip(ip_string: str) -> bool:
    """Validate an IPv4 or IPv6 address string."""
    try:
        ipaddress.ip_address(ip_string.strip())
        return True
    except (ValueError, AttributeError):
        return False


def validate_port(port) -> bool:
    """Validate that a port number is in the valid range 1-65535."""
    try:
        port_int = int(port)
        return 1 <= port_int <= 65535
    except (ValueError, TypeError):
        return False


def validate_txid(txid: str) -> bool:
    """Validate that a TXID is a 64-character hex string."""
    if not txid:
        return False
    return bool(TXID_PATTERN.match(txid.strip()))


def normalize_timestamp(ts_string: str) -> Optional[str]:
    """
    Normalize a timestamp string to UTC ISO-8601 format.
    Handles various input formats gracefully.
    """
    if not ts_string:
        return None
    try:
        # Try ISO format first
        dt = datetime.fromisoformat(ts_string.strip().replace("Z", "+00:00"))
        # Ensure UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    except (ValueError, AttributeError):
        pass

    # Try common formats
    for fmt in [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y/%m/%d %H:%M:%S",
        "%d-%m-%Y %H:%M:%S",
    ]:
        try:
            dt = datetime.strptime(ts_string.strip(), fmt)
            dt = dt.replace(tzinfo=timezone.utc)
            return dt.isoformat()
        except ValueError:
            continue

    return None


def classify_port(port) -> str:
    """
    Classify a port number into a Bitcoin-relevant category.

    Returns:
        One of: "BITCOIN_P2P", "BITCOIN_TESTNET", "BITCOIN_RPC", "EPHEMERAL", "OTHER"
    """
    try:
        port_int = int(port)
    except (ValueError, TypeError):
        return "OTHER"

    if port_int == BITCOIN_P2P_PORT:
        return "BITCOIN_P2P"
    elif port_int == BITCOIN_TESTNET_PORT:
        return "BITCOIN_TESTNET"
    elif port_int == BITCOIN_RPC_PORT:
        return "BITCOIN_RPC"
    elif EPHEMERAL_PORT_MIN <= port_int <= EPHEMERAL_PORT_MAX:
        return "EPHEMERAL"
    else:
        return "OTHER"


def parse_satoshi_to_btc(amount) -> float:
    """
    Convert an amount to BTC.
    Auto-detects whether the input is in satoshis (>=1000) or already in BTC.

    Args:
        amount: Numeric value (int, float, or string)

    Returns:
        Amount in BTC as a float
    """
    try:
        value = float(amount)
    except (ValueError, TypeError):
        return 0.0

    if value >= SATOSHI_THRESHOLD:
        # Treat as satoshis → convert to BTC
        return value / 100_000_000
    else:
        # Already in BTC
        return value


def parse_and_validate_network_event(
    raw: dict,
) -> Tuple[bool, Optional[NetworkObservation], Optional[str]]:
    """
    Parse and validate a raw network event record.

    Args:
        raw: Dictionary with keys like src_ip, dst_ip, src_port, dst_port,
             timestamp, txid, country, asn

    Returns:
        Tuple of (is_valid, NetworkObservation or None, error_message or None)
    """
    errors = []

    # Extract fields with defaults
    src_ip = str(raw.get("src_ip", "")).strip()
    dst_ip = str(raw.get("dst_ip", "")).strip()
    src_port = raw.get("src_port", 0)
    dst_port = raw.get("dst_port", 0)
    timestamp = str(raw.get("timestamp", "")).strip()
    txid = str(raw.get("txid", "")).strip()
    country = str(raw.get("country", "UNKNOWN")).strip() or "UNKNOWN"
    asn = str(raw.get("asn", "UNKNOWN")).strip() or "UNKNOWN"

    # Validate IP addresses
    if not validate_ip(src_ip):
        errors.append(f"Invalid source IP: {src_ip}")
    if not validate_ip(dst_ip):
        errors.append(f"Invalid destination IP: {dst_ip}")

    # Validate ports
    if not validate_port(src_port):
        errors.append(f"Invalid source port: {src_port}")
    if not validate_port(dst_port):
        errors.append(f"Invalid destination port: {dst_port}")

    # Normalize timestamp
    normalized_ts = normalize_timestamp(timestamp)
    if normalized_ts is None:
        errors.append(f"Invalid timestamp: {timestamp}")

    # Validate TXID
    if txid and not validate_txid(txid):
        errors.append(f"Invalid TXID (must be 64 hex chars): {txid}")

    if errors:
        obs = NetworkObservation(
            src_ip=src_ip,
            dst_ip=dst_ip,
            src_port=int(src_port) if validate_port(src_port) else 0,
            dst_port=int(dst_port) if validate_port(dst_port) else 0,
            timestamp=timestamp,
            txid=txid,
            country=country,
            asn=asn,
            is_valid=False,
            error_reason="; ".join(errors),
        )
        return False, obs, "; ".join(errors)

    # Determine if the destination port is a Bitcoin P2P port
    is_p2p = int(dst_port) == BITCOIN_P2P_PORT or int(src_port) == BITCOIN_P2P_PORT

    obs = NetworkObservation(
        src_ip=src_ip,
        dst_ip=dst_ip,
        src_port=int(src_port),
        dst_port=int(dst_port),
        timestamp=normalized_ts,
        txid=txid,
        country=country,
        asn=asn,
        is_valid=True,
        error_reason=None,
    )

    return True, obs, None
