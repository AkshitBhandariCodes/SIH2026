'use client'

import React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ShieldCheck,
  BrainCircuit,
  Database,
  LockKeyhole,
  Network,
  Sun,
  Moon,
  Sparkles,
  Waypoints,
  CircleCheck,
  Radar,
  FileText,
} from 'lucide-react'
import { useTheme } from '@/components/providers'

export function AuraHome() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans selection:bg-accent-cyan/20">
      {/* Marketing Navbar */}
      <nav className="h-16 border-b border-hairline bg-canvas/90 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-30 max-w-[1240px] w-full mx-auto">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-ink">
          <div className="w-7 h-7 rounded-[6px] border border-hairline bg-canvas-elevated flex items-center justify-center text-accent-cyan shadow-sm">
            <Radar size={16} />
          </div>
          <div className="text-sm font-semibold tracking-tight">
            AURA<span className="text-mute font-normal">/BTC</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-xs text-body font-medium">
          <a href="#problem" className="hover:text-ink transition">The Problem</a>
          <a href="#approach" className="hover:text-ink transition">Methodology</a>
          <a href="#evidence" className="hover:text-ink transition">Evidence Dossier</a>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="icon-btn-vercel"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <Link href="/dashboard" className="btn-vercel-primary text-xs px-4">
            <span>Open Console</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Hero Section with Vercel Mesh Gradient */}
      <section className="relative overflow-hidden border-b border-hairline py-20 md:py-28 px-6">
        {/* Vercel multi-stop background mesh */}
        <div className="absolute inset-0 bg-mesh-hero pointer-events-none opacity-80 dark:opacity-60" />

        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill border border-hairline bg-canvas-elevated/80 backdrop-blur text-[11px] mono text-mute">
              <span className="status-dot" />
              <span>OFFLINE INTELLIGENCE FOR BITCOIN INVESTIGATIONS</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tighter text-ink leading-[1.05]">
              See the signal <br />
              <span className="bg-gradient-to-r from-accent-blue via-accent-cyan to-accent-violet bg-clip-text text-transparent">
                inside the noise.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-body max-w-xl leading-relaxed">
              AURA-BTC correlates network-layer observations (IP, ASN, Country) with Bitcoin blockchain activity to surface explainable, prioritized criminal leads — completely offline.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link href="/dashboard" className="btn-vercel-primary text-sm h-10 px-6 rounded-pill">
                <span>Explore the Console</span>
                <ArrowRight size={16} />
              </Link>

              <a href="#approach" className="btn-vercel-outline text-sm h-10 px-5 rounded-pill">
                <span>Read Technical Spec</span>
              </a>
            </div>

            <div className="flex items-center gap-2 pt-4 text-xs mono text-mute">
              <LockKeyhole size={13} className="text-emerald-500" />
              <span>100% Air-Gapped · Zero External Telemetry · Linux & Windows Ready</span>
            </div>
          </div>

          {/* Right Hero Visual Card */}
          <div className="lg:col-span-5">
            <div className="card-vercel p-5 shadow-2xl bg-canvas-elevated/90 backdrop-blur space-y-4 border-hairline">
              <div className="flex items-center justify-between border-b border-hairline pb-3">
                <div className="flex items-center gap-2 text-xs mono text-mute">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-red/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-amber/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <code className="text-[11px] ml-2">aura-btc / telemetry-engine</code>
                </div>
                <span className="text-[10px] mono text-emerald-500">LIVE</span>
              </div>

              {/* Topology simulation snippet */}
              <div className="p-4 rounded-[6px] bg-canvas-subtle border border-hairline/70 space-y-2.5 font-mono text-[11px]">
                <div className="flex justify-between items-center text-accent-cyan font-bold">
                  <span>TARGET: 1MixerHub...111222</span>
                  <span className="text-accent-red bg-accent-red/10 px-1.5 py-0.5 rounded-[3px]">CRITICAL</span>
                </div>
                <div className="text-mute text-[10px] space-y-1">
                  <p>• Fan-out degree: 16 unique destination addresses</p>
                  <p>• Telemetry vantage: 4 distinct countries in 60s</p>
                  <p>• Isolation anomaly score: 0.941 / 1.000</p>
                </div>
                <div className="pt-2 border-t border-hairline/60 flex items-center justify-between">
                  <span className="text-[10px] text-mute">COMPOSITE RISK</span>
                  <span className="text-lg font-bold text-ink">92.4 / 100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section id="problem" className="py-20 px-6 border-b border-hairline">
        <div className="max-w-[1200px] mx-auto space-y-12">
          <div className="max-w-2xl space-y-2">
            <div className="eyebrow text-accent-cyan">01 / THE INVESTIGATIVE CHALLENGE</div>
            <h2 className="text-3xl font-bold tracking-tight text-ink">
              Criminal crypto infrastructure moves faster than manual surveillance.
            </h2>
            <p className="text-sm text-body leading-relaxed">
              Bitcoin&apos;s pseudonymous architecture allows malicious syndicates to rapidly layer, peel, and mix funds while forensic evidence remains fractured across separate silos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-vercel p-6 space-y-3">
              <div className="w-9 h-9 rounded-[6px] border border-hairline bg-canvas-subtle flex items-center justify-center text-accent-blue">
                <Network size={18} />
              </div>
              <h3 className="text-base font-semibold text-ink">Siloed Evidence</h3>
              <p className="text-xs text-body leading-relaxed">
                IP addresses, P2P ports, and routing ASNs are rarely correlated with on-chain UTXO movements in real-time.
              </p>
            </div>

            <div className="card-vercel p-6 space-y-3">
              <div className="w-9 h-9 rounded-[6px] border border-hairline bg-canvas-subtle flex items-center justify-center text-accent-violet">
                <Waypoints size={18} />
              </div>
              <h3 className="text-base font-semibold text-ink">Complex Multi-Hop Topology</h3>
              <p className="text-xs text-body leading-relaxed">
                Peeling chains and mixer fan-outs obscure the true money flow across dozens of intermediary change addresses.
              </p>
            </div>

            <div className="card-vercel p-6 space-y-3">
              <div className="w-9 h-9 rounded-[6px] border border-hairline bg-canvas-subtle flex items-center justify-center text-accent-amber">
                <BrainCircuit size={18} />
              </div>
              <h3 className="text-base font-semibold text-ink">Heuristic Blindspots</h3>
              <p className="text-xs text-body leading-relaxed">
                Static rule-based filters produce massive false positives and fail against modern randomized laundering timings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Methodology Section */}
      <section id="approach" className="py-20 px-6 border-b border-hairline bg-canvas-elevated/40">
        <div className="max-w-[1200px] mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-xl space-y-2">
              <div className="eyebrow text-accent-cyan">02 / THE METHODOLOGY</div>
              <h2 className="text-3xl font-bold tracking-tight text-ink">
                From raw packet captures to a court-ready case dossier.
              </h2>
            </div>
            <p className="text-xs text-mute max-w-sm">
              An offline, unified pipeline executing ingestion, entity correlation, unsupervised anomaly detection, and explainable lead ranking.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-vercel p-5 space-y-3">
              <div className="flex items-center justify-between text-mute mono text-[11px]">
                <span>STAGE 01</span>
                <Database size={15} className="text-accent-blue" />
              </div>
              <h3 className="text-sm font-semibold text-ink">Ingest & Canonicalize</h3>
              <p className="text-xs text-body">
                Parse CSV, JSON, or XML into normalized schema stored locally in embedded DuckDB.
              </p>
            </div>

            <div className="card-vercel p-5 space-y-3">
              <div className="flex items-center justify-between text-mute mono text-[11px]">
                <span>STAGE 02</span>
                <Waypoints size={15} className="text-accent-cyan" />
              </div>
              <h3 className="text-sm font-semibold text-ink">Entity Graph Construction</h3>
              <p className="text-xs text-body">
                NetworkX builds multi-dimensional link graph connecting Wallets, TXIDs, IPs, and ASNs.
              </p>
            </div>

            <div className="card-vercel p-5 space-y-3">
              <div className="flex items-center justify-between text-mute mono text-[11px]">
                <span>STAGE 03</span>
                <BrainCircuit size={15} className="text-accent-violet" />
              </div>
              <h3 className="text-sm font-semibold text-ink">Unsupervised Scoring</h3>
              <p className="text-xs text-body">
                Isolation Forest & DBSCAN detect rare behavioral topologies across 20 wallet features.
              </p>
            </div>

            <div className="card-vercel p-5 space-y-3">
              <div className="flex items-center justify-between text-mute mono text-[11px]">
                <span>STAGE 04</span>
                <Sparkles size={15} className="text-accent-amber" />
              </div>
              <h3 className="text-sm font-semibold text-ink">Explainable Evidence</h3>
              <p className="text-xs text-body">
                Synthesize human-readable forensic evidence bullets and confidence ratings for every lead.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-hairline mt-auto">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-mute mono">
          <div className="flex items-center gap-2">
            <Radar size={14} className="text-accent-cyan" />
            <span className="font-semibold text-ink">AURA-BTC</span>
            <span>· Autonomous Offline Bitcoin Intelligence</span>
          </div>
          <div>100% Air-Gapped & Localhost Ready</div>
        </div>
      </footer>
    </div>
  )
}
