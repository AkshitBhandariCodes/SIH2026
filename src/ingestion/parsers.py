"""
AURA-BTC Multi-Format File Parsers
Parses CSV, JSON, and XML files into normalized canonical records.
"""

import csv
import json
import os
import uuid
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional, Tuple

from src.ingestion.normalizer import (
    NetworkObservation,
    classify_port,
    normalize_timestamp,
    parse_and_validate_network_event,
    parse_satoshi_to_btc,
    validate_txid,
)


def _build_record(obs: NetworkObservation, raw: dict) -> dict:
    """
    Build a canonical record from a validated NetworkObservation
    and the original raw dict (for wallet/amount fields).
    """
    is_p2p = classify_port(obs.dst_port) == "BITCOIN_P2P" or \
             classify_port(obs.src_port) == "BITCOIN_P2P"

    amount_raw = raw.get("amount", raw.get("total_output", 0))
    fee_raw = raw.get("fee", 0)

    return {
        "event_id": str(uuid.uuid4()),
        "timestamp": obs.timestamp,
        "src_ip": obs.src_ip,
        "dst_ip": obs.dst_ip,
        "src_port": obs.src_port,
        "dst_port": obs.dst_port,
        "txid": obs.txid,
        "country": obs.country,
        "asn": obs.asn,
        "is_p2p_port": is_p2p,
        "source_wallet": raw.get("source_wallet", ""),
        "destination_wallet": raw.get("destination_wallet", ""),
        "amount": parse_satoshi_to_btc(amount_raw),
        "fee": parse_satoshi_to_btc(fee_raw),
        "script_type": raw.get("script_type", "UNKNOWN"),
    }


def _expand_nested_transaction(tx: dict) -> List[dict]:
    """
    Flatten a nested transaction (with inputs/outputs arrays) into
    individual flat records suitable for ingestion.
    """
    records = []

    inputs = tx.get("inputs", [])
    outputs = tx.get("outputs", [])
    input_amounts = tx.get("input_amounts", [])
    output_amounts = tx.get("output_amounts", [])

    base = {
        "txid": tx.get("txid", ""),
        "timestamp": tx.get("timestamp", ""),
        "src_ip": tx.get("src_ip", ""),
        "dst_ip": tx.get("dst_ip", ""),
        "src_port": tx.get("src_port", 8333),
        "dst_port": tx.get("dst_port", 8333),
        "country": tx.get("country", "UNKNOWN"),
        "asn": tx.get("asn", "UNKNOWN"),
        "fee": tx.get("fee", 0),
        "script_type": tx.get("script_type", "UNKNOWN"),
    }

    # Create records for each input→output pair
    if inputs and outputs:
        for i, src_wallet in enumerate(inputs):
            for j, dst_wallet in enumerate(outputs):
                rec = dict(base)
                rec["source_wallet"] = src_wallet
                rec["destination_wallet"] = dst_wallet
                # Use output amount if available, else input amount
                if j < len(output_amounts):
                    rec["amount"] = output_amounts[j]
                elif i < len(input_amounts):
                    rec["amount"] = input_amounts[i]
                else:
                    rec["amount"] = tx.get("amount", 0)
                records.append(rec)
    else:
        # Flat transaction format
        rec = dict(base)
        rec["source_wallet"] = tx.get("source_wallet", "")
        rec["destination_wallet"] = tx.get("destination_wallet", "")
        rec["amount"] = tx.get("amount", tx.get("total_output", 0))
        records.append(rec)

    return records


def _xml_element_to_dict(elem: ET.Element) -> dict:
    """Convert an XML element's children to a flat dictionary."""
    result = {}
    for child in elem:
        tag = child.tag.strip()
        text = (child.text or "").strip()

        # Handle nested lists (inputs, outputs, input_amounts, output_amounts)
        if tag in ("inputs", "outputs", "input_amounts", "output_amounts"):
            items = []
            for item in child:
                items.append((item.text or "").strip())
            result[tag] = items
        else:
            # Try to convert numeric values
            try:
                if "." in text:
                    result[tag] = float(text)
                else:
                    result[tag] = int(text)
            except ValueError:
                result[tag] = text

    # Also grab attributes
    result.update(elem.attrib)
    return result


# ─── CSV Parser ──────────────────────────────────────────────

def parse_csv(filepath: str) -> Tuple[List[dict], int, int]:
    """
    Parse a CSV file into normalized records.

    Returns:
        Tuple of (records, valid_count, invalid_count)
    """
    records = []
    valid_count = 0
    invalid_count = 0

    with open(filepath, "r", newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            is_valid, obs, error = parse_and_validate_network_event(row)
            if is_valid and obs is not None:
                rec = _build_record(obs, row)
                records.append(rec)
                valid_count += 1
            else:
                invalid_count += 1

    return records, valid_count, invalid_count


# ─── JSON Parser ─────────────────────────────────────────────

def parse_json(filepath: str) -> Tuple[List[dict], int, int]:
    """
    Parse a JSON file into normalized records.
    Handles three formats:
      - Flat array of records
      - Object with "transactions" key
      - Object with "events" key

    Returns:
        Tuple of (records, valid_count, invalid_count)
    """
    records = []
    valid_count = 0
    invalid_count = 0

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Determine the list of raw items
    if isinstance(data, list):
        raw_items = data
    elif isinstance(data, dict):
        raw_items = data.get("transactions", data.get("events", [data]))
    else:
        return records, 0, 1

    for item in raw_items:
        # Check if this is a nested transaction with inputs/outputs
        if "inputs" in item or "outputs" in item:
            flat_records = _expand_nested_transaction(item)
            for flat in flat_records:
                is_valid, obs, error = parse_and_validate_network_event(flat)
                if is_valid and obs is not None:
                    rec = _build_record(obs, flat)
                    records.append(rec)
                    valid_count += 1
                else:
                    invalid_count += 1
        else:
            is_valid, obs, error = parse_and_validate_network_event(item)
            if is_valid and obs is not None:
                rec = _build_record(obs, item)
                records.append(rec)
                valid_count += 1
            else:
                invalid_count += 1

    return records, valid_count, invalid_count


# ─── XML Parser ──────────────────────────────────────────────

def parse_xml(filepath: str) -> Tuple[List[dict], int, int]:
    """
    Parse an XML file into normalized records.
    Iterates over <event> and <transaction> elements.

    SECURITY: Uses xml.etree.ElementTree.parse() which is safe
    against XXE (XML External Entity) attacks by default.

    Returns:
        Tuple of (records, valid_count, invalid_count)
    """
    records = []
    valid_count = 0
    invalid_count = 0

    tree = ET.parse(filepath)
    root = tree.getroot()

    # Process both <event> and <transaction> elements
    for tag_name in ("event", "transaction"):
        for elem in root.iter(tag_name):
            raw = _xml_element_to_dict(elem)

            # Check for nested inputs/outputs
            if "inputs" in raw or "outputs" in raw:
                flat_records = _expand_nested_transaction(raw)
                for flat in flat_records:
                    is_valid, obs, error = parse_and_validate_network_event(flat)
                    if is_valid and obs is not None:
                        rec = _build_record(obs, flat)
                        records.append(rec)
                        valid_count += 1
                    else:
                        invalid_count += 1
            else:
                is_valid, obs, error = parse_and_validate_network_event(raw)
                if is_valid and obs is not None:
                    rec = _build_record(obs, raw)
                    records.append(rec)
                    valid_count += 1
                else:
                    invalid_count += 1

    return records, valid_count, invalid_count


# ─── Master Ingest Function ─────────────────────────────────

def ingest_file(filepath: str) -> dict:
    """
    Master ingestion function. Auto-detects file format by extension
    and parses accordingly.

    Args:
        filepath: Path to the data file (.csv, .json, or .xml)

    Returns:
        Dict with keys: records, valid_records, invalid_records, filename, format
    """
    ext = os.path.splitext(filepath)[1].lower()
    filename = os.path.basename(filepath)

    if ext == ".csv":
        records, valid, invalid = parse_csv(filepath)
        fmt = "CSV"
    elif ext == ".json":
        records, valid, invalid = parse_json(filepath)
        fmt = "JSON"
    elif ext == ".xml":
        records, valid, invalid = parse_xml(filepath)
        fmt = "XML"
    else:
        raise ValueError(f"Unsupported file format: {ext}. Use .csv, .json, or .xml")

    return {
        "records": records,
        "valid_records": valid,
        "invalid_records": invalid,
        "filename": filename,
        "format": fmt,
    }
