'use client'

import React, { useState } from 'react'
import {
  Upload,
  Database,
  BrainCircuit,
  CheckCircle2,
  AlertCircle,
  Play,
  FileText,
  Sparkles,
  RefreshCw,
  Terminal,
  Activity,
  Network,
  Cpu,
  ShieldAlert,
  Copy,
  Check,
} from 'lucide-react'
import {
  uploadEvidenceFile,
  loadSampleDataset,
  trainModels,
  IngestResponse,
  TrainResponse,
  PipelineStep,
  MLMetrics,
} from '@/services/api'

interface PipelineViewProps {
  onPipelineSuccess: () => void
}

interface LiveLogItem {
  id: string
  timestamp: string
  tag: string
  message: string
  durationMs?: number
  type: 'INFO' | 'SUCCESS' | 'WARN' | 'EXEC'
}

export function PipelineView({ onPipelineSuccess }: PipelineViewProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState<boolean>(false)
  const [training, setTraining] = useState<boolean>(false)
  const [ingestResult, setIngestResult] = useState<IngestResponse | null>(null)
  const [trainResult, setTrainResult] = useState<TrainResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Live ML Telemetry Feed State
  const [activeStage, setActiveStage] = useState<string>('IDLE')
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false)
  const [liveLogs, setLiveLogs] = useState<LiveLogItem[]>([
    {
      id: 'init-1',
      timestamp: '00:00:00',
      tag: 'SYSTEM',
      message: 'Autonomous ML Pipeline initialized in offline air-gapped mode.',
      type: 'INFO',
    },
    {
      id: 'init-2',
      timestamp: '00:00:00',
      tag: 'MODEL',
      message: 'Isolation Forest (150 trees, contamination=0.05) & DBSCAN (eps=1.5) ready.',
      type: 'INFO',
    },
  ])
  const [mlMetrics, setMlMetrics] = useState<MLMetrics | null>(null)

  const addLog = (tag: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARN' | 'EXEC' = 'INFO', durationMs?: number) => {
    const now = new Date().toISOString().slice(11, 19)
    setLiveLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        timestamp: now,
        tag,
        message,
        durationMs,
        type,
      },
    ])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setErrorMessage(null)
      addLog('FILE', `Selected evidence file: ${e.target.files[0].name} (${(e.target.files[0].size / 1024).toFixed(1)} KB)`, 'INFO')
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setErrorMessage(null)
    setIngestResult(null)
    setActiveStage('PARSING')

    addLog('INGEST', `Starting ingestion of ${file.name}...`, 'EXEC')

    try {
      setActiveStage('COMMITTING')
      const res = await uploadEvidenceFile(file)
      setIngestResult(res)
      setFile(null)

      // Ingest response logs
      if (res.pipeline_steps && res.pipeline_steps.length > 0) {
        res.pipeline_steps.forEach((step: PipelineStep) => {
          addLog(step.step, step.message, step.status === 'WARNING' ? 'WARN' : 'SUCCESS', step.duration_ms)
        })
      } else {
        addLog('DUCKDB', `Committed ${res.valid_records} records to database.`, 'SUCCESS')
      }

      if (res.ml_metrics) {
        setMlMetrics(res.ml_metrics)
        addLog('ML_CORE', `Isolation Forest scored ${res.ml_metrics.wallets_analyzed} wallets (${res.ml_metrics.anomalies_detected} anomalies detected).`, 'SUCCESS')
        addLog('RISK_ENGINE', `Generated ${res.ml_metrics.alerts_generated} ranked forensic alerts.`, 'SUCCESS')
      }

      setActiveStage('COMPLETE')
      onPipelineSuccess()
    } catch (err: any) {
      setErrorMessage(err.message || 'File upload failed.')
      setActiveStage('ERROR')
      addLog('ERROR', `Pipeline execution failed: ${err.message}`, 'WARN')
    } finally {
      setUploading(false)
    }
  }

  const handleQuickLoad = async (sampleName: string) => {
    setUploading(true)
    setErrorMessage(null)
    setIngestResult(null)
    setActiveStage('PARSING')

    addLog('QUICK_INGEST', `Loading sample scenario: ${sampleName}...`, 'EXEC')

    try {
      setActiveStage('COMMITTING')
      const res = await loadSampleDataset(sampleName)
      setIngestResult(res)

      if (res.pipeline_steps && res.pipeline_steps.length > 0) {
        res.pipeline_steps.forEach((step: PipelineStep) => {
          addLog(step.step, step.message, step.status === 'WARNING' ? 'WARN' : 'SUCCESS', step.duration_ms)
        })
      } else {
        addLog('DUCKDB', `Committed ${res.valid_records} records from ${sampleName}.`, 'SUCCESS')
      }

      if (res.ml_metrics) {
        setMlMetrics(res.ml_metrics)
        addLog('ML_CORE', `Isolation Forest scored ${res.ml_metrics.wallets_analyzed} wallets (${res.ml_metrics.anomalies_detected} anomalies detected).`, 'SUCCESS')
        addLog('RISK_ENGINE', `Generated ${res.ml_metrics.alerts_generated} ranked forensic alerts.`, 'SUCCESS')
      }

      setActiveStage('COMPLETE')
      onPipelineSuccess()
    } catch (err: any) {
      setErrorMessage(`Quick ingest failed: ${err.message}`)
      setActiveStage('ERROR')
      addLog('ERROR', `Ingestion failed: ${err.message}`, 'WARN')
    } finally {
      setUploading(false)
    }
  }

  const handleTrain = async () => {
    setTraining(true)
    setErrorMessage(null)
    setTrainResult(null)
    setActiveStage('MODEL_TRAINING')

    addLog('TRAIN', 'Triggering manual ML retrain across all database entities...', 'EXEC')

    try {
      const res = await trainModels()
      setTrainResult(res)
      setActiveStage('COMPLETE')

      addLog('ISOLATION_FOREST', `Trained 150 trees on ${res.wallets_trained} wallets. Identified ${res.anomalies_detected} anomalies.`, 'SUCCESS')
      addLog('DBSCAN', `Formed ${res.clusters_formed} criminal entity syndicates. Saved models to models/`, 'SUCCESS')

      setMlMetrics({
        wallets_analyzed: res.wallets_trained,
        anomalies_detected: res.anomalies_detected,
        clusters_formed: res.clusters_formed,
        isolation_trees: 150,
        alerts_generated: res.anomalies_detected,
        feature_count: 20,
      })

      onPipelineSuccess()
    } catch (err: any) {
      setErrorMessage(err.message || 'Model training failed.')
      setActiveStage('ERROR')
      addLog('ERROR', `Training aborted: ${err.message}`, 'WARN')
    } finally {
      setTraining(false)
    }
  }

  const copyAllLogs = () => {
    const text = liveLogs.map((l) => `[${l.timestamp}] [${l.tag}] ${l.message}${l.durationMs ? ` (${l.durationMs}ms)` : ''}`).join('\n')
    navigator.clipboard.writeText(text)
    setCopiedLogs(true)
    setTimeout(() => setCopiedLogs(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="eyebrow flex items-center gap-1.5 text-accent-cyan font-bold">
          <Database size={14} />
          <span>04 / LOCAL OPERATIONS</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink mt-1">
          Data Ingestion & Live ML Pipeline
        </h1>
        <p className="text-sm text-body mt-1">
          Air-gapped ingestion of forensic evidence into DuckDB with live real-time unsupervised anomaly telemetry.
        </p>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-[6px] border border-accent-red/30 bg-accent-red/10 text-xs text-accent-red flex items-center gap-3">
          <AlertCircle size={16} className="text-accent-red shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* ── LIVE ML WORKING FEED & TELEMETRY MONITOR (KEY FEATURE) ── */}
      <section className="card-vercel p-6 space-y-4 bg-canvas-elevated border border-hairline shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-hairline">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[5px] bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan">
              <Activity size={17} className={uploading || training ? 'animate-pulse text-accent-green' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-ink">Live ML Model Working Feed</h2>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  uploading || training
                    ? 'bg-accent-green/20 text-accent-green animate-pulse'
                    : 'bg-canvas-subtle text-mute border border-hairline'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${uploading || training ? 'bg-accent-green' : 'bg-mute'}`} />
                  {uploading || training ? 'ML PIPELINE RUNNING' : 'MODEL IDLE / READY'}
                </span>
              </div>
              <p className="text-[11px] text-body">Real-time forensic feature engineering & Isolation Forest inference trace</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyAllLogs}
              className="btn-vercel-outline text-[11px] h-8 px-2.5 flex items-center gap-1.5 text-body hover:text-ink"
              title="Copy telemetry logs"
            >
              {copiedLogs ? <Check size={13} className="text-accent-green" /> : <Copy size={13} />}
              <span>{copiedLogs ? 'Copied' : 'Copy Logs'}</span>
            </button>
          </div>
        </div>

        {/* Real-time Telemetry KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-[6px] border border-hairline bg-canvas-subtle">
            <div className="text-[10px] mono text-mute uppercase font-semibold">Wallets Scored</div>
            <div className="text-lg font-mono font-bold text-ink mt-0.5">
              {mlMetrics?.wallets_analyzed ?? 0}
            </div>
            <div className="text-[10px] text-mute flex items-center gap-1 mt-0.5">
              <Cpu size={11} className="text-accent-cyan" /> Unique entities
            </div>
          </div>

          <div className="p-3 rounded-[6px] border border-hairline bg-canvas-subtle">
            <div className="text-[10px] mono text-mute uppercase font-semibold">Feature Space</div>
            <div className="text-lg font-mono font-bold text-accent-cyan mt-0.5">
              20 Dim
            </div>
            <div className="text-[10px] text-mute flex items-center gap-1 mt-0.5">
              <Network size={11} className="text-accent-cyan" /> Behavioral vector
            </div>
          </div>

          <div className="p-3 rounded-[6px] border border-hairline bg-canvas-subtle">
            <div className="text-[10px] mono text-mute uppercase font-semibold">Isolation Trees</div>
            <div className="text-lg font-mono font-bold text-ink mt-0.5">
              150
            </div>
            <div className="text-[10px] text-mute flex items-center gap-1 mt-0.5">
              <BrainCircuit size={11} className="text-accent-violet" /> Ensemble depth
            </div>
          </div>

          <div className="p-3 rounded-[6px] border border-hairline bg-canvas-subtle">
            <div className="text-[10px] mono text-mute uppercase font-semibold">Anomalies Detected</div>
            <div className="text-lg font-mono font-bold text-accent-red mt-0.5">
              {mlMetrics?.anomalies_detected ?? 0}
            </div>
            <div className="text-[10px] text-mute flex items-center gap-1 mt-0.5">
              <ShieldAlert size={11} className="text-accent-red" /> Outlier partition
            </div>
          </div>

          <div className="p-3 rounded-[6px] border border-hairline bg-canvas-subtle">
            <div className="text-[10px] mono text-mute uppercase font-semibold">Clusters (DBSCAN)</div>
            <div className="text-lg font-mono font-bold text-accent-amber mt-0.5">
              {mlMetrics?.clusters_formed ?? 0}
            </div>
            <div className="text-[10px] text-mute flex items-center gap-1 mt-0.5">
              <Sparkles size={11} className="text-accent-amber" /> Syndicates identified
            </div>
          </div>

          <div className="p-3 rounded-[6px] border border-hairline bg-canvas-subtle">
            <div className="text-[10px] mono text-mute uppercase font-semibold">Alerts Generated</div>
            <div className="text-lg font-mono font-bold text-accent-green mt-0.5">
              {mlMetrics?.alerts_generated ?? 0}
            </div>
            <div className="text-[10px] text-mute flex items-center gap-1 mt-0.5">
              <CheckCircle2 size={11} className="text-accent-green" /> Dispatched to triage
            </div>
          </div>
        </div>

        {/* Live Execution Terminal Log Feed */}
        <div className="rounded-[6px] border border-hairline bg-[#090b10] text-[#e2e8f0] p-3.5 space-y-2 font-mono text-xs shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e2433] text-[11px] text-[#64748b]">
            <div className="flex items-center gap-2">
              <Terminal size={13} className="text-accent-cyan" />
              <span>FORENSIC PIPELINE EXECUTION STREAM</span>
            </div>
            <span className="text-[10px] text-accent-cyan font-bold tracking-wider">OFFLINE ENGINE</span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {liveLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed text-[11.5px]">
                <span className="text-[#64748b] select-none text-[11px] shrink-0">[{log.timestamp}]</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                  log.tag === 'PARSING' || log.tag === 'FILE' ? 'bg-blue-500/20 text-blue-400' :
                  log.tag === 'DUCKDB' || log.tag === 'DUCKDB_COMMIT' ? 'bg-amber-500/20 text-amber-400' :
                  log.tag === 'FEATURE_EXTRACTION' ? 'bg-cyan-500/20 text-cyan-400' :
                  log.tag === 'MODEL_TRAINING' || log.tag === 'ISOLATION_FOREST' ? 'bg-purple-500/20 text-purple-400' :
                  log.tag === 'RISK_SCORING' || log.tag === 'RISK_ENGINE' ? 'bg-rose-500/20 text-rose-400' :
                  log.tag === 'ERROR' ? 'bg-red-500/30 text-red-400' :
                  'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {log.tag}
                </span>
                <span className={`flex-1 ${log.type === 'WARN' ? 'text-red-300' : log.type === 'EXEC' ? 'text-cyan-200' : 'text-slate-200'}`}>
                  {log.message}
                </span>
                {log.durationMs !== undefined && (
                  <span className="text-[#64748b] text-[10px] shrink-0 font-mono">
                    +{log.durationMs}ms
                  </span>
                )}
              </div>
            ))}
            {(uploading || training) && (
              <div className="flex items-center gap-2 text-accent-cyan text-[11px] pt-1">
                <RefreshCw size={12} className="animate-spin" />
                <span>Processing next pipeline stage in DuckDB...</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Grid: Upload Dropzone & ML Training Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: File Ingestion Dropzone */}
        <section className="card-vercel p-6 space-y-5 bg-canvas-elevated shadow-sm">
          <div className="flex items-center gap-2.5 pb-3 border-b border-hairline">
            <div className="w-8 h-8 rounded-[5px] bg-accent-blue/15 border border-accent-blue/30 flex items-center justify-center text-accent-blue">
              <Database size={16} />
            </div>
            <h2 className="text-base font-bold text-ink">
              Multi-Format File Ingest (.csv, .json, .xml)
            </h2>
          </div>

          <p className="text-xs text-body leading-relaxed">
            Files are parsed locally by <code className="mono text-ink bg-canvas-subtle px-1.5 py-0.5 rounded border border-hairline font-semibold">src/ingestion/parsers.py</code>,
            normalized into canonical records, and stored in embedded DuckDB tables.
          </p>

          {/* Upload Input Area */}
          <div className="border-2 border-dashed border-hairline hover:border-accent-cyan/60 rounded-[8px] p-6 text-center space-y-3 bg-canvas-subtle transition cursor-pointer">
            <input
              type="file"
              id="evidence-file-input"
              accept=".csv,.json,.xml"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="evidence-file-input"
              className="cursor-pointer block space-y-2.5"
            >
              <div className="w-12 h-12 rounded-full border border-hairline bg-canvas-elevated flex items-center justify-center mx-auto text-accent-cyan shadow-sm">
                <Upload size={20} />
              </div>
              <div className="text-sm text-ink font-semibold">
                {file ? file.name : 'Click to select or drop evidence file here'}
              </div>
              <div className="text-[11px] mono text-mute">
                Supports Bitcoin blockchain exports, Zeek/Suricata network telemetry
              </div>
            </label>
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="btn-vercel-primary w-full text-xs font-bold h-10 shadow-sm"
          >
            {uploading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Ingesting Records & Running ML Pipeline...</span>
              </>
            ) : (
              <>
                <Upload size={15} />
                <span>Ingest File to Database</span>
              </>
            )}
          </button>

          {/* Ingest Result Box */}
          {ingestResult && (
            <div className="p-4 rounded-[6px] border border-accent-green/30 bg-accent-green/10 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-accent-green text-sm">
                <CheckCircle2 size={16} />
                <span>Ingestion & ML Telemetry Completed</span>
              </div>
              <div className="text-[11px] mono text-body grid grid-cols-2 gap-1.5 pt-1">
                <span>File: <b className="text-ink">{ingestResult.filename}</b></span>
                <span>Valid: <b className="text-accent-green">{ingestResult.valid_records} records</b></span>
                <span>Invalid: <b>{ingestResult.invalid_records}</b></span>
                <span>Total Latency: <b>{ingestResult.execution_time_seconds}s</b></span>
              </div>
            </div>
          )}

          {/* Quick Ingest Demo Buttons */}
          <div className="pt-3 border-t border-hairline space-y-2.5">
            <span className="text-[11px] mono text-ink font-bold block">
              QUICK TEST WITH SAMPLE ATTACK SCENARIOS:
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleQuickLoad('peeling_chain_attack.json')}
                disabled={uploading}
                className="btn-vercel-outline text-xs h-9 justify-start text-body hover:text-ink shadow-sm disabled:opacity-50"
              >
                <FileText size={13} className="text-accent-amber shrink-0" />
                <span className="truncate font-medium">Peeling Chain (JSON)</span>
              </button>
              <button
                onClick={() => handleQuickLoad('mixer_fanout.xml')}
                disabled={uploading}
                className="btn-vercel-outline text-xs h-9 justify-start text-body hover:text-ink shadow-sm disabled:opacity-50"
              >
                <FileText size={13} className="text-accent-red shrink-0" />
                <span className="truncate font-medium">Mixer Fanout (XML)</span>
              </button>
              <button
                onClick={() => handleQuickLoad('ip_hopping_ransomware.csv')}
                disabled={uploading}
                className="btn-vercel-outline text-xs h-9 justify-start text-body hover:text-ink shadow-sm disabled:opacity-50"
              >
                <FileText size={13} className="text-accent-violet shrink-0" />
                <span className="truncate font-medium">IP Hopping (CSV)</span>
              </button>
              <button
                onClick={() => handleQuickLoad('normal_traffic.csv')}
                disabled={uploading}
                className="btn-vercel-outline text-xs h-9 justify-start text-body hover:text-ink shadow-sm disabled:opacity-50"
              >
                <FileText size={13} className="text-accent-green shrink-0" />
                <span className="truncate font-medium">Normal Baseline (CSV)</span>
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: ML Model Training & Retraining */}
        <section className="card-vercel p-6 space-y-5 flex flex-col justify-between bg-canvas-elevated shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-hairline">
              <div className="w-8 h-8 rounded-[5px] bg-accent-violet/15 border border-accent-violet/30 flex items-center justify-center text-accent-violet">
                <BrainCircuit size={16} />
              </div>
              <h2 className="text-base font-bold text-ink">
                Unsupervised Machine Learning Engine
              </h2>
            </div>

            <p className="text-xs text-body leading-relaxed">
              Extracts 20 behavioral features per wallet address and fits:
            </p>

            <div className="space-y-3 text-xs text-body">
              <div className="p-3.5 rounded-[6px] border border-hairline bg-canvas-subtle space-y-1">
                <div className="font-bold text-ink flex items-center justify-between">
                  <span>1. RobustScaler + IsolationForest</span>
                  <span className="text-[10px] mono text-accent-cyan font-bold bg-accent-cyan/15 px-2 py-0.5 rounded">150 Trees</span>
                </div>
                <p className="text-mute text-[11px]">
                  Unsupervised outlier scoring in range [0.0, 1.0] with sigmoid scaling.
                </p>
              </div>

              <div className="p-3.5 rounded-[6px] border border-hairline bg-canvas-subtle space-y-1">
                <div className="font-bold text-ink flex items-center justify-between">
                  <span>2. DBSCAN Entity Clustering</span>
                  <span className="text-[10px] mono text-accent-amber font-bold bg-accent-amber/15 px-2 py-0.5 rounded">eps=1.5, min=3</span>
                </div>
                <p className="text-mute text-[11px]">
                  Groups similar behavioral topologies to reveal coordinated criminal rings.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-[6px] border border-hairline bg-canvas-subtle text-[11px] mono text-body">
              <span className="text-ink font-bold">Autonomous Trigger:</span> Whenever &ge;5 wallets are ingested, models automatically retrain and regenerate alerts.
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-hairline">
            <button
              onClick={handleTrain}
              disabled={training}
              className="btn-vercel-primary w-full text-xs font-bold h-10 shadow-sm"
            >
              {training ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Fitting Isolation Forest & DBSCAN...</span>
                </>
              ) : (
                <>
                  <Play size={14} />
                  <span>Retrain ML Engine Now</span>
                </>
              )}
            </button>

            {/* Train Result Box */}
            {trainResult && (
              <div className="p-4 rounded-[6px] border border-accent-green/30 bg-accent-green/10 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-accent-green text-sm">
                  <CheckCircle2 size={16} />
                  <span>Model Training Complete</span>
                </div>
                <div className="text-[11px] mono text-body grid grid-cols-2 gap-1.5 pt-1">
                  <span>Wallets Trained: <b className="text-ink">{trainResult.wallets_trained}</b></span>
                  <span>Anomalies: <b className="text-ink">{trainResult.anomalies_detected}</b></span>
                  <span>Clusters Formed: <b className="text-ink">{trainResult.clusters_formed}</b></span>
                  <span>Status: <b className="text-accent-green">SAVED TO DISK</b></span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
