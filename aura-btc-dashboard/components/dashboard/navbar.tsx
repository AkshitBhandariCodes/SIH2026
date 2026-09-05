'use client'

import React from 'react'
import Link from 'next/link'
import { ShieldCheck, RefreshCw, Sun, Moon, Lock } from 'lucide-react'
import { useTheme } from '@/components/providers'
import { HealthStatus } from '@/services/api'

interface NavbarProps {
  health: HealthStatus
  loading: boolean
  onRefresh: () => void
}

export function Navbar({ health, loading, onRefresh }: NavbarProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="h-14 border-b border-hairline bg-canvas-elevated px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Brand / Logo */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-ink hover:opacity-90 transition">
          <div className="w-8 h-8 rounded-[6px] border border-hairline bg-canvas-subtle flex items-center justify-center text-accent-cyan shadow-sm">
            <ShieldCheck size={18} />
          </div>
          <div className="text-base font-extrabold tracking-tight">
            AURA<span className="text-mute font-normal">/BTC</span>
          </div>
        </Link>

        <span className="text-hairline font-thin">|</span>

        {/* Operational Context */}
        <div className="flex items-center gap-2 text-xs mono">
          <span className="status-dot" />
          <span className="text-accent-green font-bold tracking-wide">AIR-GAPPED</span>
          <span className="hidden sm:inline text-mute">({health.mode} MODE)</span>
        </div>
      </div>

      {/* Center Environment Pill */}
      <div className="hidden md:flex items-center gap-2.5 px-3 py-1 rounded-[6px] border border-hairline bg-canvas-subtle text-xs mono text-body">
        <Lock size={13} className="text-accent-cyan" />
        <span className="font-semibold text-ink">NODE: localhost:8000</span>
        <span className="text-hairline">·</span>
        <span className="text-mute">ZERO EXT TRAFFIC</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="icon-btn-vercel"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="btn-vercel-outline text-xs px-3.5 font-semibold"
          title="Refresh telemetry & alerts"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-accent-cyan' : 'text-accent-cyan'} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  )
}
