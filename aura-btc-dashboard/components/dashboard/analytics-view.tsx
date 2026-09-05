'use client'

import React from 'react'
import {
  BarChart3,
  PieChart,
  Activity,
  Globe,
  Database,
  Cpu,
  ShieldAlert,
} from 'lucide-react'
import { Alert, SystemStats } from '@/services/api'

interface AnalyticsViewProps {
  stats: SystemStats
  alerts: Alert[]
}

export function AnalyticsView({ stats, alerts }: AnalyticsViewProps) {
  const total = stats.total_alerts || alerts.length || 1
  const critPct = Math.round(((stats.critical_alerts || 0) / total) * 100)
  const highPct = Math.round(((stats.high_alerts || 0) / total) * 100)
  const medPct = Math.round(((stats.medium_alerts || 0) / total) * 100)
  const lowPct = Math.max(0, 100 - critPct - highPct - medPct)

  const avgRisk =
    alerts.length > 0
      ? (alerts.reduce((acc, a) => acc + a.risk_score, 0) / alerts.length).toFixed(1)
      : '0.0'

  const avgAnomaly =
    alerts.length > 0
      ? (alerts.reduce((acc, a) => acc + a.anomaly_score, 0) / alerts.length).toFixed(3)
      : '0.000'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="eyebrow flex items-center gap-1.5 text-accent-cyan">
          <span>03 / BEHAVIORAL SIGNALS</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink mt-0.5">
          Forensic Analytics & Telemetry
        </h1>
        <p className="text-sm text-body">
          Aggregated behavioral signals, anomaly score distributions, and network concentration metrics.
        </p>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-vercel p-4 space-y-1">
          <div className="eyebrow">POPULATION AVG RISK</div>
          <div className="text-3xl font-bold mono text-ink">{avgRisk}</div>
          <div className="text-[11px] text-mute">Triangulated forensic index</div>
        </div>

        <div className="card-vercel p-4 space-y-1">
          <div className="eyebrow">MEAN ANOMALY INDEX</div>
          <div className="text-3xl font-bold mono text-accent-cyan">{avgAnomaly}</div>
          <div className="text-[11px] text-mute">Isolation Forest decision boundary</div>
        </div>

        <div className="card-vercel p-4 space-y-1">
          <div className="eyebrow">DATABASE FOOTPRINT</div>
          <div className="text-3xl font-bold mono text-accent-violet">
            {(stats.database_size_bytes / 1024).toFixed(1)} KB
          </div>
          <div className="text-[11px] text-mute">Embedded DuckDB store size</div>
        </div>
      </div>

      {/* Threat Distribution & Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <div className="card-vercel p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-hairline">
            <ShieldAlert size={16} className="text-accent-red" />
            <h2 className="text-sm font-semibold text-ink">
              Alert Severity Breakdown
            </h2>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs mono text-mute mb-1">
                <span>CRITICAL ({stats.critical_alerts})</span>
                <span>{critPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-canvas-subtle overflow-hidden border border-hairline">
                <div className="h-full bg-accent-red" style={{ width: `${critPct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mono text-mute mb-1">
                <span>HIGH ({stats.high_alerts})</span>
                <span>{highPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-canvas-subtle overflow-hidden border border-hairline">
                <div className="h-full bg-accent-amber" style={{ width: `${highPct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mono text-mute mb-1">
                <span>MEDIUM ({stats.medium_alerts})</span>
                <span>{medPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-canvas-subtle overflow-hidden border border-hairline">
                <div className="h-full bg-accent-violet" style={{ width: `${medPct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mono text-mute mb-1">
                <span>LOW ({stats.low_alerts})</span>
                <span>{lowPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-canvas-subtle overflow-hidden border border-hairline">
                <div className="h-full bg-emerald-500" style={{ width: `${lowPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry Architecture */}
        <div className="card-vercel p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-hairline">
            <Globe size={16} className="text-accent-blue" />
            <h2 className="text-sm font-semibold text-ink">
              Correlation Architecture Highlights
            </h2>
          </div>

          <div className="space-y-3 text-xs text-body pt-1">
            <div className="p-3 rounded-[6px] border border-hairline bg-canvas-subtle flex items-center justify-between">
              <div>
                <span className="font-semibold text-ink block">Port 8333 P2P Observation</span>
                <span className="text-[11px] text-mute">Bitcoin network node telemetry</span>
              </div>
              <span className="text-xs mono font-bold text-accent-cyan">VERIFIED</span>
            </div>

            <div className="p-3 rounded-[6px] border border-hairline bg-canvas-subtle flex items-center justify-between">
              <div>
                <span className="font-semibold text-ink block">ASN Diversification Metric</span>
                <span className="text-[11px] text-mute">Tor / VPN Proxy exit identification</span>
              </div>
              <span className="text-xs mono font-bold text-accent-amber">ACTIVE</span>
            </div>

            <div className="p-3 rounded-[6px] border border-hairline bg-canvas-subtle flex items-center justify-between">
              <div>
                <span className="font-semibold text-ink block">Pass-Through Mule Filter</span>
                <span className="text-[11px] text-mute">In/Out flow ratio near 1.0</span>
              </div>
              <span className="text-xs mono font-bold text-accent-violet">ENABLED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
