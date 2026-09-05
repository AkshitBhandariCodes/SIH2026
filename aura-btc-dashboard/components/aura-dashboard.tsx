'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  AlertTriangle,
  Network,
  BarChart3,
  Database,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  Cpu,
  Layers,
} from 'lucide-react'
import {
  getHealth,
  getStats,
  getAlerts,
  Alert,
  SystemStats,
  HealthStatus,
  emptyStats,
} from '@/services/api'
import { Navbar } from '@/components/dashboard/navbar'
import { StatsRibbon } from '@/components/dashboard/stats-ribbon'
import { AlertsTriage } from '@/components/dashboard/alerts-triage'
import { GraphCanvas } from '@/components/dashboard/graph-canvas'
import { AnalyticsView } from '@/components/dashboard/analytics-view'
import { PipelineView } from '@/components/dashboard/pipeline-view'
import { EvidenceDrawer } from '@/components/dashboard/evidence-drawer'

export function AuraDashboard() {
  const [tab, setTab] = useState<'alerts' | 'graph' | 'analytics' | 'pipeline'>('alerts')
  const [health, setHealth] = useState<HealthStatus>({
    status: 'ONLINE',
    mode: 'OFFLINE',
    version: '1.0.0',
  })
  const [stats, setStats] = useState<SystemStats>(emptyStats)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [graphTargetEntity, setGraphTargetEntity] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  // Fetch all live data from FastAPI backend
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [h, s, a] = await Promise.all([
        getHealth(),
        getStats(),
        getAlerts(),
      ])
      setHealth(h)
      setStats(s)
      setAlerts(a)
    } catch (err) {
      console.error('Error refreshing dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const switchTab = (newTab: 'alerts' | 'graph' | 'analytics' | 'pipeline') => {
    setSelectedAlert(null)
    setTab(newTab)
  }

  // Navigate to Graph view focused on a specific entity
  const handleExploreGraph = (entityId: string) => {
    setGraphTargetEntity(entityId)
    setSelectedAlert(null) // Close drawer when exploring graph
    setTab('graph')
  }

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans transition-colors duration-150">
      {/* Top Navbar */}
      <Navbar health={health} loading={loading} onRefresh={loadData} />

      {/* Telemetry Stats Ribbon */}
      <StatsRibbon stats={stats} />

      {/* Main Console Layout */}
      <div className="flex-1 flex max-w-[1440px] w-full mx-auto px-4 sm:px-6">
        {/* Left Workspace Sidebar */}
        <aside className="w-56 shrink-0 border-r border-hairline py-6 pr-5 hidden md:flex flex-col justify-between">
          <div className="space-y-4">
            <div className="eyebrow px-2 text-mute font-bold tracking-wider">
              INVESTIGATIVE WORKSPACE
            </div>
            <nav className="space-y-1.5">
              <button
                onClick={() => switchTab('alerts')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[6px] text-xs font-bold transition ${
                  tab === 'alerts'
                    ? 'bg-canvas-elevated text-ink border border-hairline shadow-sm'
                    : 'text-body hover:bg-canvas-subtle hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle size={16} className="text-accent-amber" />
                  <span>Alerts Triage</span>
                </div>
                <span className="text-[10px] mono font-bold text-ink bg-canvas-subtle px-1.5 py-0.5 rounded border border-hairline">
                  {alerts.length}
                </span>
              </button>

              <button
                onClick={() => switchTab('graph')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-xs font-bold transition ${
                  tab === 'graph'
                    ? 'bg-canvas-elevated text-ink border border-hairline shadow-sm'
                    : 'text-body hover:bg-canvas-subtle hover:text-ink'
                }`}
              >
                <Network size={16} className="text-accent-cyan" />
                <span>Graph Canvas</span>
              </button>

              <button
                onClick={() => switchTab('analytics')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-xs font-bold transition ${
                  tab === 'analytics'
                    ? 'bg-canvas-elevated text-ink border border-hairline shadow-sm'
                    : 'text-body hover:bg-canvas-subtle hover:text-ink'
                }`}
              >
                <BarChart3 size={16} className="text-accent-violet" />
                <span>Analytics</span>
              </button>

              <button
                onClick={() => switchTab('pipeline')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-xs font-bold transition ${
                  tab === 'pipeline'
                    ? 'bg-canvas-elevated text-ink border border-hairline shadow-sm'
                    : 'text-body hover:bg-canvas-subtle hover:text-ink'
                }`}
              >
                <Database size={16} className="text-accent-blue" />
                <span>Ingestion & ML</span>
              </button>
            </nav>
          </div>

          {/* System Status Footer */}
          <div className="border-t border-hairline pt-4 space-y-2 text-[11px] mono text-body">
            <div className="eyebrow text-mute font-bold">NODE STATUS</div>
            <div className="flex items-center gap-2 text-accent-green font-semibold">
              <span className="status-dot" />
              <span>Offline ML Ready</span>
            </div>
            <div className="flex items-center gap-2 text-body">
              <HardDrive size={13} className="text-accent-cyan" />
              <span>DuckDB Synced</span>
            </div>
          </div>
        </aside>

        {/* Workspace Main Panel */}
        <main className="flex-1 py-6 md:pl-8 min-w-0">
          {tab === 'alerts' && (
            <AlertsTriage
              alerts={alerts}
              onSelectAlert={(a) => setSelectedAlert(a)}
              onExploreGraph={handleExploreGraph}
            />
          )}

          {tab === 'graph' && (
            <GraphCanvas
              initialEntityId={graphTargetEntity || (selectedAlert ? selectedAlert.entity_id : undefined)}
              onSelectEntity={(id) => setGraphTargetEntity(id)}
            />
          )}

          {tab === 'analytics' && (
            <AnalyticsView stats={stats} alerts={alerts} />
          )}

          {tab === 'pipeline' && (
            <PipelineView onPipelineSuccess={loadData} />
          )}
        </main>
      </div>

      {/* Forensic Case Dossier Drawer */}
      {selectedAlert && (
        <EvidenceDrawer
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onExploreGraph={handleExploreGraph}
        />
      )}
    </div>
  )
}
