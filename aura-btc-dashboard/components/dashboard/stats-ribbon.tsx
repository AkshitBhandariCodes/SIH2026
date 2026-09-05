'use client'

import React from 'react'
import { Activity, ArrowLeftRight, Wallet, AlertOctagon } from 'lucide-react'
import { SystemStats } from '@/services/api'

interface StatsRibbonProps {
  stats: SystemStats
}

export function StatsRibbon({ stats }: StatsRibbonProps) {
  const items = [
    {
      label: 'NETWORK EVENTS',
      value: stats.total_network_events.toLocaleString(),
      sub: 'IP / P2P Port Observations',
      icon: Activity,
      color: 'text-accent-blue bg-accent-blue/15 border-accent-blue/30',
    },
    {
      label: 'TRANSACTIONS',
      value: stats.total_transactions.toLocaleString(),
      sub: 'Correlated Blocks & TXIDs',
      icon: ArrowLeftRight,
      color: 'text-accent-cyan bg-accent-cyan/15 border-accent-cyan/30',
    },
    {
      label: 'MONITORED WALLETS',
      value: stats.total_wallets.toLocaleString(),
      sub: 'Extracted Behavioral Vectors',
      icon: Wallet,
      color: 'text-accent-violet bg-accent-violet/15 border-accent-violet/30',
    },
    {
      label: 'ACTIVE ALERTS',
      value: stats.total_alerts.toLocaleString(),
      sub: `${stats.critical_alerts} CRITICAL · ${stats.high_alerts} HIGH`,
      icon: AlertOctagon,
      color: 'text-accent-red bg-accent-red/15 border-accent-red/30',
      isDanger: stats.critical_alerts > 0,
    },
  ]

  return (
    <section className="border-b border-hairline bg-canvas-elevated px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 shadow-sm">
      {items.map((it) => {
        const Icon = it.icon
        return (
          <div key={it.label} className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-[6px] border flex items-center justify-center shrink-0 ${it.color}`}>
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <div className="eyebrow text-mute font-bold tracking-wider truncate">{it.label}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-extrabold mono tracking-tight text-ink">
                  {it.value}
                </span>
                {it.isDanger && (
                  <span className="text-[10px] mono font-bold text-accent-red bg-accent-red/15 px-1.5 py-0.5 rounded-[4px] border border-accent-red/30 shrink-0">
                    CRITICAL
                  </span>
                )}
              </div>
              <div className="text-xs text-body font-medium truncate">{it.sub}</div>
            </div>
          </div>
        )
      })}
    </section>
  )
}
