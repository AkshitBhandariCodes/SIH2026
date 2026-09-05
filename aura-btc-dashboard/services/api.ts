export const API_BASE = 'http://127.0.0.1:8000'

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface Alert {
  alert_id: string
  entity_type: 'WALLET' | 'IP' | 'TRANSACTION' | string
  entity_id: string
  anomaly_score: number
  risk_score: number
  confidence_score: 'HIGH' | 'MEDIUM' | 'LOW' | string
  severity: Severity
  explanation: string[]
  top_features: Record<string, number>
  created_at: string
}

export interface SystemStats {
  total_network_events: number
  total_transactions: number
  total_wallets: number
  total_alerts: number
  critical_alerts: number
  high_alerts: number
  medium_alerts: number
  low_alerts: number
  database_size_bytes: number
}

export interface HealthStatus {
  status: string
  mode: string
  version: string
}

export interface GraphNode {
  data: {
    id: string
    node_type: 'WALLET' | 'TRANSACTION' | 'IP' | 'ASN' | 'COUNTRY' | string
    label: string
    [key: string]: any
  }
}

export interface GraphEdge {
  data: {
    id: string
    source: string
    target: string
    edge_type: 'INPUT_TO' | 'OUTPUT_TO' | 'OBSERVED_WITH' | 'BELONGS_TO_ASN' | 'LOCATED_IN_COUNTRY' | string
    [key: string]: any
  }
}

export interface EntityGraphResponse {
  center_node: string
  node_count: number
  edge_count: number
  cytoscape_elements: {
    nodes: GraphNode[]
    edges: GraphEdge[]
  }
}

export interface PipelineStep {
  step: string
  message: string
  duration_ms: number
  status: 'COMPLETED' | 'INFO' | 'WARNING' | 'ERROR' | string
}

export interface MLMetrics {
  wallets_analyzed: number
  anomalies_detected: number
  clusters_formed: number
  isolation_trees: number
  alerts_generated: number
  feature_count: number
}

export interface IngestResponse {
  status: string
  filename: string
  total_parsed: number
  valid_records: number
  invalid_records: number
  execution_time_seconds: number
  pipeline_steps?: PipelineStep[]
  ml_metrics?: MLMetrics | null
}

export interface TrainResponse {
  status: string
  wallets_trained: number
  anomalies_detected: number
  clusters_formed: number
}

// ── Fallback Mocks for Offline Resilience ─────────────────────────

export const mockStats: SystemStats = {
  total_network_events: 42,
  total_transactions: 18,
  total_wallets: 12,
  total_alerts: 5,
  critical_alerts: 1,
  high_alerts: 2,
  medium_alerts: 2,
  low_alerts: 0,
  database_size_bytes: 262144,
}

export const mockAlerts: Alert[] = [
  {
    alert_id: 'alt-001',
    entity_type: 'WALLET',
    entity_id: '1MixerHubCentralXXXXXXXXXXXXXXWvN8b',
    anomaly_score: 0.892,
    risk_score: 84.5,
    confidence_score: 'HIGH',
    severity: 'CRITICAL',
    explanation: [
      'Fan-out degree of 16 unique recipients deviates >3 std deviations from benign baseline.',
      'Transaction funds dispersed across 4 anomalous countries within 60 seconds.',
      'High velocity layering pattern consistent with mixer/tumbler cashout topology.',
    ],
    top_features: { fan_out_degree: 16, unique_country_count: 4, velocity_tx_per_hour: 18.2 },
    created_at: '2026-09-04T12:45:00Z',
  },
  {
    alert_id: 'alt-002',
    entity_type: 'IP',
    entity_id: '194.26.29.112',
    anomaly_score: 0.761,
    risk_score: 72.1,
    confidence_score: 'HIGH',
    severity: 'HIGH',
    explanation: [
      'Observed broadcast vantage point across 9 distinct wallets in 14 minutes.',
      'ASN reputation and multi-country hopping indicate Tor/VPN exit node usage.',
    ],
    top_features: { wallet_fan_in: 9, port_entropy: 3.8, country_count: 3 },
    created_at: '2026-09-04T12:25:00Z',
  },
  {
    alert_id: 'alt-003',
    entity_type: 'WALLET',
    entity_id: 'bc1q9ransomCashout9k3j2m8x7v',
    anomaly_score: 0.648,
    risk_score: 61.8,
    confidence_score: 'MEDIUM',
    severity: 'HIGH',
    explanation: [
      'Peeling-chain laundering pattern detected over 8 consecutive hops.',
      'Repeated small-value peel outputs alongside continuous large change address transfers.',
    ],
    top_features: { chain_depth: 8, output_entropy: 2.4, velocity_tx_per_hour: 8.6 },
    created_at: '2026-09-04T11:45:00Z',
  },
  {
    alert_id: 'alt-004',
    entity_type: 'TRANSACTION',
    entity_id: 'tx_fa10bc39c1a9d002e8812c9',
    anomaly_score: 0.492,
    risk_score: 48.3,
    confidence_score: 'MEDIUM',
    severity: 'MEDIUM',
    explanation: [
      'Non-standard Bitcoin P2P port observed at broadcast vantage point.',
      'Transaction timing overlaps with known burst cluster.',
    ],
    top_features: { port_deviation: 1, burst_score: 3.1, peer_count: 14 },
    created_at: '2026-09-04T11:00:00Z',
  },
  {
    alert_id: 'alt-005',
    entity_type: 'WALLET',
    entity_id: '1J7mNormalBaselineWallet44',
    anomaly_score: 0.211,
    risk_score: 27.9,
    confidence_score: 'LOW',
    severity: 'LOW',
    explanation: [
      'Low confidence deviation from benign wallet baseline.',
      'Single ASN and valid single country observation.',
    ],
    top_features: { fan_out_degree: 2, unique_country_count: 1, velocity_tx_per_hour: 1.1 },
    created_at: '2026-09-04T10:00:00Z',
  },
]

export const emptyStats: SystemStats = {
  total_network_events: 0,
  total_transactions: 0,
  total_wallets: 0,
  total_alerts: 0,
  critical_alerts: 0,
  high_alerts: 0,
  medium_alerts: 0,
  low_alerts: 0,
  database_size_bytes: 0,
}

// ── Live API Callers (Zero Dummy Data) ───────────────────────────

export async function getHealth(): Promise<HealthStatus> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, {
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) return await res.json()
  } catch (err) {
    console.warn('Backend /api/health not reachable.')
  }
  return { status: 'ONLINE', mode: 'OFFLINE', version: '1.0.0' }
}

export async function getStats(): Promise<SystemStats> {
  try {
    const res = await fetch(`${API_BASE}/api/stats`, {
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) return await res.json()
  } catch (err) {
    console.warn('Backend /api/stats not reachable.')
  }
  return emptyStats
}

export async function getAlerts(severity?: string): Promise<Alert[]> {
  try {
    const url = `${API_BASE}/api/alerts${severity && severity !== 'ALL' ? `?severity=${severity}` : ''}`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) {
        return data
      }
    }
  } catch (err) {
    console.warn('Backend /api/alerts not reachable.')
  }
  return []
}

export async function getEntityGraph(
  entityId: string,
  k: number = 2
): Promise<EntityGraphResponse | null> {
  if (!entityId) {
    return {
      center_node: '',
      node_count: 0,
      edge_count: 0,
      cytoscape_elements: { nodes: [], edges: [] },
    }
  }

  try {
    const res = await fetch(
      `${API_BASE}/api/graph/entity/${encodeURIComponent(entityId)}?k=${k}`,
      {
        signal: AbortSignal.timeout(8000),
      }
    )
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn(`Backend /api/graph/entity/${entityId} not reachable.`)
  }

  return {
    center_node: entityId,
    node_count: 0,
    edge_count: 0,
    cytoscape_elements: { nodes: [], edges: [] },
  }
}

export async function uploadEvidenceFile(file: File): Promise<IngestResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/api/ingest`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Ingest failed (${res.status}): ${errText}`)
  }
  return await res.json()
}

export async function trainModels(): Promise<TrainResponse> {
  const res = await fetch(`${API_BASE}/api/ml/train`, {
    method: 'POST',
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Training failed (${res.status}): ${errText}`)
  }
  return await res.json()
}

export async function loadSampleDataset(filename: string): Promise<IngestResponse> {
  const res = await fetch(`${API_BASE}/api/sample/load/${encodeURIComponent(filename)}`, {
    method: 'POST',
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Loading sample dataset failed (${res.status}): ${errText}`)
  }
  return await res.json()
}

// ── Synthetic Graph Generator for Offline Visuals ──────────────────

function generateFallbackGraph(centerId: string): EntityGraphResponse {
  const nodes: GraphNode[] = [
    {
      data: {
        id: centerId,
        node_type: centerId.startsWith('1') || centerId.startsWith('3') || centerId.startsWith('bc1')
          ? 'WALLET'
          : centerId.includes('.')
          ? 'IP'
          : 'TRANSACTION',
        label: centerId.length > 14 ? centerId.slice(0, 10) + '...' : centerId,
      },
    },
    {
      data: { id: 'tx_sub_01', node_type: 'TRANSACTION', label: 'tx_fa10bc39...' },
    },
    {
      data: { id: 'tx_sub_02', node_type: 'TRANSACTION', label: 'tx_8d21aa10...' },
    },
    {
      data: { id: '194.26.29.112', node_type: 'IP', label: '194.26.29.112' },
    },
    {
      data: { id: 'AS44050', node_type: 'ASN', label: 'AS44050 (HostKey)' },
    },
    {
      data: { id: 'NL', node_type: 'COUNTRY', label: 'NL (Netherlands)' },
    },
    {
      data: { id: 'bc1q_dest_wallet_49a', node_type: 'WALLET', label: 'bc1q_dest_49a...' },
    },
    {
      data: { id: '1Kx3_change_wallet_02', node_type: 'WALLET', label: '1Kx3_change_02...' },
    },
  ]

  const edges: GraphEdge[] = [
    { data: { id: 'e1', source: centerId, target: 'tx_sub_01', edge_type: 'INPUT_TO' } },
    { data: { id: 'e2', source: centerId, target: 'tx_sub_02', edge_type: 'INPUT_TO' } },
    { data: { id: 'e3', source: 'tx_sub_01', target: 'bc1q_dest_wallet_49a', edge_type: 'OUTPUT_TO' } },
    { data: { id: 'e4', source: 'tx_sub_02', target: '1Kx3_change_wallet_02', edge_type: 'OUTPUT_TO' } },
    { data: { id: 'e5', source: centerId, target: '194.26.29.112', edge_type: 'OBSERVED_WITH' } },
    { data: { id: 'e6', source: '194.26.29.112', target: 'AS44050', edge_type: 'BELONGS_TO_ASN' } },
    { data: { id: 'e7', source: '194.26.29.112', target: 'NL', edge_type: 'LOCATED_IN_COUNTRY' } },
  ]

  return {
    center_node: centerId,
    node_count: nodes.length,
    edge_count: edges.length,
    cytoscape_elements: { nodes, edges },
  }
}
