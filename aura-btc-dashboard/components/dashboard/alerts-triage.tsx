'use client'

import React, { useMemo, useState } from 'react'
import {
  Search,
  Copy,
  Check,
  Network,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react'
import { Alert, Severity } from '@/services/api'

interface AlertsTriageProps {
  alerts: Alert[]
  onSelectAlert: (alert: Alert) => void
  onExploreGraph: (entityId: string) => void
}

export function AlertsTriage({
  alerts,
  onSelectAlert,
  onExploreGraph,
}: AlertsTriageProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<string>('ALL')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const countBySeverity = (sev: Severity) =>
    alerts.filter((a) => a.severity === sev).length

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const matchSeverity = filter === 'ALL' || a.severity === filter
      const searchTarget = `${a.entity_id} ${a.entity_type} ${a.alert_id} ${a.explanation.join(' ')}`.toLowerCase()
      const matchQuery = !query || searchTarget.includes(query.toLowerCase())
      return matchSeverity && matchQuery
    })
  }, [alerts, filter, query])

  const copyEntity = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="eyebrow flex items-center gap-1.5 text-accent-cyan font-bold">
            <AlertTriangle size={14} />
            <span>01 / TRIAGE QUEUE</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink mt-1">
            Alerts Triage
          </h1>
          <p className="text-sm text-body mt-1">
            Prioritized behavioral anomalies correlated by the offline intelligence engine.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs mono text-accent-green bg-accent-green/10 px-3 py-1.5 rounded-[6px] border border-accent-green/30 self-start sm:self-auto font-semibold">
          <span className="status-dot" />
          <span>LIVE EVIDENCE STREAM</span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-mute"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search wallet, TXID, IP, or behavior..."
            className="w-full h-10 pl-9 pr-4 rounded-[6px] border border-hairline bg-canvas-elevated text-xs text-ink placeholder:text-mute focus:outline-none focus:border-ink transition mono shadow-sm"
          />
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((s) => {
            const count = s === 'ALL' ? alerts.length : countBySeverity(s as Severity)
            const isActive = filter === s
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-pill text-xs mono font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-ink text-canvas font-extrabold shadow-sm'
                    : 'bg-canvas-elevated text-body border border-hairline hover:bg-canvas-subtle hover:text-ink'
                }`}
              >
                <span>{s}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-canvas/20 text-canvas' : 'bg-canvas-subtle text-mute'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((a) => (
            <article
              key={a.alert_id}
              onClick={() => onSelectAlert(a)}
              className="card-vercel p-4 cursor-pointer hover:border-ink/50 transition group bg-canvas-elevated shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left: Severity & Entity info */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {/* Severity Badge */}
                  <div
                    className={`px-3 py-1.5 rounded-[5px] text-[11px] mono font-extrabold uppercase shrink-0 mt-0.5 tracking-wider ${
                      a.severity === 'CRITICAL'
                        ? 'badge-critical'
                        : a.severity === 'HIGH'
                        ? 'badge-high'
                        : a.severity === 'MEDIUM'
                        ? 'badge-medium'
                        : 'badge-low'
                    }`}
                  >
                    {a.severity}
                  </div>

                  {/* Entity Details */}
                  <div className="min-w-0 space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 text-xs mono">
                      <span className="text-accent-cyan font-bold tracking-wide">{a.entity_type}</span>
                      <span className="text-mute">·</span>
                      <span className="text-ink font-mono font-semibold truncate select-all">{a.entity_id}</span>
                      <button
                        onClick={(e) => copyEntity(e, a.entity_id)}
                        className="text-mute hover:text-ink transition p-0.5"
                        title="Copy Identifier"
                      >
                        {copiedId === a.entity_id ? (
                          <Check size={14} className="text-accent-green" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                      <span className="ml-auto text-mute hidden md:inline text-[11px]" suppressHydrationWarning>
                        {(() => {
                          try {
                            const d = new Date(a.created_at)
                            return !isNaN(d.getTime()) ? `${d.toISOString().slice(11, 19)} UTC` : a.created_at
                          } catch {
                            return a.created_at
                          }
                        })()}
                      </span>
                    </div>

                    <p className="text-xs text-body line-clamp-2 leading-relaxed font-normal">
                      {a.explanation[0] || 'Behavioral pattern identified by anomaly model.'}
                    </p>

                    {/* Features Badges */}
                    {a.top_features && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {Object.entries(a.top_features)
                          .slice(0, 3)
                          .map(([k, v]) => (
                            <span
                              key={k}
                              className="text-[10px] mono text-body font-medium px-2 py-0.5 rounded-[4px] bg-canvas-subtle border border-hairline"
                            >
                              <span className="text-mute">{k.replace(/_/g, ' ')}:</span>{' '}
                              <b className="text-ink font-bold">{typeof v === 'number' ? v.toFixed(1) : v}</b>
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Scores & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-hairline">
                  {/* Scores */}
                  <div className="text-right">
                    <div className="text-[10px] mono text-mute font-bold">RISK SCORE</div>
                    <div className="text-2xl font-extrabold mono tracking-tight text-ink">
                      {a.risk_score.toFixed(1)}
                    </div>
                    <div className="text-[11px] mono text-accent-green font-semibold">
                      {a.confidence_score} CONF
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onExploreGraph(a.entity_id)
                      }}
                      className="icon-btn-vercel text-body hover:text-accent-cyan"
                      title="Explore in Graph"
                    >
                      <Network size={16} />
                    </button>

                    <div className="icon-btn-vercel text-mute group-hover:text-ink">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="card-vercel p-12 text-center space-y-3">
            <ShieldAlert size={36} className="mx-auto text-mute" />
            <h3 className="text-base font-bold text-ink">No alerts found</h3>
            <p className="text-xs text-body max-w-sm mx-auto">
              No entities match the current severity or query filters. Try selecting &quot;ALL&quot; or resetting your search.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
