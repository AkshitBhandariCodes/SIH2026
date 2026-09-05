'use client'

import React, { useState } from 'react'
import {
  X,
  Copy,
  Check,
  AlertTriangle,
  FileText,
  Network,
  ShieldAlert,
} from 'lucide-react'
import { Alert } from '@/services/api'

interface EvidenceDrawerProps {
  alert: Alert | null
  onClose: () => void
  onExploreGraph: (entityId: string) => void
}

export function EvidenceDrawer({
  alert,
  onClose,
  onExploreGraph,
}: EvidenceDrawerProps) {
  const [copied, setCopied] = useState(false)
  const [exported, setExported] = useState(false)

  if (!alert) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(alert.entity_id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExport = () => {
    const report = {
      case_type: 'AURA-BTC OFFLINE FORENSIC DOSSIER',
      generated_at: new Date().toISOString(),
      classification: 'OFFLINE FORENSIC EVIDENCE',
      alert,
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `case_dossier_${alert.alert_id}_${alert.entity_type}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 2000)
  }

  return (
    <aside className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-canvas-elevated border-l border-hairline shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-5 border-b border-hairline flex items-center justify-between bg-canvas-subtle">
        <div>
          <div className="eyebrow flex items-center gap-1.5 text-accent-cyan font-bold">
            <ShieldAlert size={14} />
            <span>FORENSIC EVIDENCE DOSSIER</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-ink mt-1">
            {alert.entity_type} Profile
          </h2>
        </div>
        <button
          onClick={onClose}
          className="icon-btn-vercel"
          aria-label="Close dossier"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto space-y-6 flex-1">
        {/* Identifier Card */}
        <div className="card-vercel p-4 space-y-2 bg-canvas-subtle">
          <div className="text-[11px] mono text-ink font-semibold flex justify-between">
            <span>TARGET ENTITY IDENTIFIER</span>
            <span className="text-accent-cyan font-bold">{alert.alert_id}</span>
          </div>
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-[6px] bg-canvas-elevated border border-hairline">
            <code className="text-xs mono text-ink break-all select-all font-semibold">
              {alert.entity_id}
            </code>
            <button
              onClick={handleCopy}
              className="p-1 text-mute hover:text-ink transition shrink-0"
              title="Copy identifier"
            >
              {copied ? <Check size={15} className="text-accent-green" /> : <Copy size={15} />}
            </button>
          </div>
        </div>

        {/* Risk & Severity Metrics */}
        <div className="card-vercel p-5 space-y-4 bg-canvas-subtle">
          <div className="flex items-center justify-between">
            <div>
              <div className="eyebrow text-mute font-semibold">COMPOSITE RISK SCORE</div>
              <div className="text-4xl font-extrabold mono tracking-tight text-ink mt-1">
                {alert.risk_score.toFixed(1)}
                <span className="text-sm font-normal text-mute"> / 100</span>
              </div>
            </div>
            <div
              className={`px-3 py-1.5 rounded-[6px] text-xs font-bold mono uppercase tracking-wide ${
                alert.severity === 'CRITICAL'
                  ? 'badge-critical'
                  : alert.severity === 'HIGH'
                  ? 'badge-high'
                  : alert.severity === 'MEDIUM'
                  ? 'badge-medium'
                  : 'badge-low'
              }`}
            >
              {alert.severity} SEVERITY
            </div>
          </div>

          {/* Risk Bar */}
          <div className="w-full h-2.5 rounded-full bg-canvas border border-hairline overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                alert.severity === 'CRITICAL'
                  ? 'bg-accent-red'
                  : alert.severity === 'HIGH'
                  ? 'bg-accent-amber'
                  : alert.severity === 'MEDIUM'
                  ? 'bg-accent-violet'
                  : 'bg-accent-green'
              }`}
              style={{ width: `${Math.min(alert.risk_score, 100)}%` }}
            />
          </div>

          {/* Sub-scores Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-hairline">
            <div className="p-3 rounded-[6px] bg-canvas-elevated border border-hairline">
              <span className="text-[10px] mono text-mute font-semibold block">ISOLATION ANOMALY</span>
              <span className="text-lg font-bold mono text-accent-cyan">
                {alert.anomaly_score.toFixed(3)}
              </span>
            </div>
            <div className="p-3 rounded-[6px] bg-canvas-elevated border border-hairline">
              <span className="text-[10px] mono text-mute font-semibold block">DATA CONFIDENCE</span>
              <span className="text-lg font-bold mono text-accent-green">
                {alert.confidence_score}
              </span>
            </div>
          </div>
        </div>

        {/* Algorithmic Forensic Bullets */}
        <div className="space-y-3">
          <div className="eyebrow flex items-center gap-1.5 text-ink font-semibold">
            <AlertTriangle size={14} className="text-accent-amber" />
            <span>ALGORITHMIC FORENSIC EVIDENCE</span>
          </div>
          <div className="space-y-2.5">
            {alert.explanation && alert.explanation.length > 0 ? (
              alert.explanation.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-[6px] border border-hairline bg-canvas-subtle text-xs text-body leading-relaxed flex items-start gap-2.5"
                >
                  <span className="text-accent-amber text-sm leading-none mt-0.5">•</span>
                  <span className="font-medium">{item}</span>
                </div>
              ))
            ) : (
              <div className="p-3.5 rounded-[6px] border border-hairline text-xs text-mute">
                No specific anomalies flagged for this entity.
              </div>
            )}
          </div>
        </div>

        {/* Top Extracted Features */}
        {alert.top_features && Object.keys(alert.top_features).length > 0 && (
          <div className="space-y-2.5">
            <div className="eyebrow text-ink font-semibold">KEY BEHAVIORAL SIGNALS</div>
            <div className="grid grid-cols-2 gap-2.5">
              {Object.entries(alert.top_features).map(([k, v]) => (
                <div
                  key={k}
                  className="p-3 rounded-[6px] border border-hairline bg-canvas-subtle"
                >
                  <span className="text-[10px] mono text-mute block truncate font-medium">
                    {k.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-bold mono text-ink">
                    {typeof v === 'number' ? v.toFixed(2) : String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-5 border-t border-hairline bg-canvas-subtle flex items-center gap-3">
        <button
          onClick={() => onExploreGraph(alert.entity_id)}
          className="btn-vercel-outline flex-1 text-xs"
        >
          <Network size={14} className="text-accent-cyan" />
          <span>Explore in Graph</span>
        </button>

        <button
          onClick={handleExport}
          className="btn-vercel-primary flex-1 text-xs"
        >
          {exported ? (
            <>
              <Check size={14} className="text-accent-green" />
              <span>Dossier Saved!</span>
            </>
          ) : (
            <>
              <FileText size={14} />
              <span>Export Dossier</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
