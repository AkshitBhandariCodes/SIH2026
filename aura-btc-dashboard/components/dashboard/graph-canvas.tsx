'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import {
  Network,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Layers,
  Move,
  Info,
  ShieldAlert,
  Wallet,
  ArrowRightLeft,
  Server,
  Globe,
  Radio,
  Eye,
  EyeOff,
  Sparkles,
  Filter,
  Check,
} from 'lucide-react'
import { getEntityGraph, EntityGraphResponse, GraphNode, GraphEdge } from '@/services/api'

interface GraphCanvasProps {
  initialEntityId?: string
  onSelectEntity?: (entityId: string) => void
}

interface Position {
  x: number
  y: number
}

export function GraphCanvas({ initialEntityId, onSelectEntity }: GraphCanvasProps) {
  const [currentEntity, setCurrentEntity] = useState<string>(
    initialEntityId || ''
  )
  const [searchInput, setSearchInput] = useState<string>('')
  const [kHops, setKHops] = useState<number>(2)
  const [graphData, setGraphData] = useState<EntityGraphResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [zoom, setZoom] = useState<number>(0.95)
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 })

  // Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'WALLET' | 'TRANSACTION' | 'IP'>('ALL')
  const [focusMode, setFocusMode] = useState<boolean>(false)

  // Node Dragging State
  const [nodePositions, setNodePositions] = useState<Record<string, Position>>({})
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState<boolean>(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (initialEntityId) {
      setCurrentEntity(initialEntityId)
    }
  }, [initialEntityId])

  // Intelligent Spacing Layout Generator
  const generateSpacedLayout = (data: EntityGraphResponse) => {
    const nodes = data.cytoscape_elements.nodes
    const centerId = data.center_node
    const centerX = 600
    const centerY = 375
    const pos: Record<string, Position> = {}

    // Categorize nodes for clean hierarchical rings
    const wallets: GraphNode[] = []
    const txs: GraphNode[] = []
    const netNodes: GraphNode[] = []

    nodes.forEach((node) => {
      if (node.data.id === centerId) return
      if (node.data.node_type === 'WALLET') wallets.push(node)
      else if (node.data.node_type === 'TRANSACTION') txs.push(node)
      else netNodes.push(node)
    })

    // Center Node
    pos[centerId] = { x: centerX, y: centerY }

    // Ring 1: Transactions (Intermediate ring ~190px radius)
    txs.forEach((tx, i) => {
      const angle = (i / (txs.length || 1)) * 2 * Math.PI - Math.PI / 2
      pos[tx.data.id] = {
        x: Math.round(centerX + 185 * Math.cos(angle)),
        y: Math.round(centerY + 165 * Math.sin(angle)),
      }
    })

    // Ring 2: Connected Wallets (Outer ring ~300px radius, distributed)
    wallets.forEach((w, i) => {
      const angle = (i / (wallets.length || 1)) * 2 * Math.PI + Math.PI / 6
      pos[w.data.id] = {
        x: Math.round(centerX + 310 * Math.cos(angle)),
        y: Math.round(centerY + 260 * Math.sin(angle)),
      }
    })

    // Ring 3: Network telemetry (IP, ASN, Country ~380px radius)
    netNodes.forEach((net, i) => {
      const angle = (i / (netNodes.length || 1)) * 2 * Math.PI + Math.PI / 3
      pos[net.data.id] = {
        x: Math.round(centerX + 410 * Math.cos(angle)),
        y: Math.round(centerY + 320 * Math.sin(angle)),
      }
    })

    // Any remaining node fallback
    nodes.forEach((n, idx) => {
      if (!pos[n.data.id]) {
        const a = (idx / (nodes.length || 1)) * 2 * Math.PI
        pos[n.data.id] = {
          x: Math.round(centerX + 260 * Math.cos(a)),
          y: Math.round(centerY + 220 * Math.sin(a)),
        }
      }
    })

    return pos
  }

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    getEntityGraph(currentEntity, kHops)
      .then((data) => {
        if (isMounted && data) {
          setGraphData(data)
          const center = data.cytoscape_elements.nodes.find(
            (n) => n.data.id === currentEntity
          )
          setSelectedNode(center || data.cytoscape_elements.nodes[0] || null)
          setNodePositions(generateSpacedLayout(data))
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [currentEntity, kHops])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      setCurrentEntity(searchInput.trim())
    }
  }

  const handleTidyLayout = () => {
    if (graphData) {
      setNodePositions(generateSpacedLayout(graphData))
      setZoom(0.95)
      setPan({ x: 0, y: 0 })
    }
  }

  // Active focus target is either hovered node, selected node, or center entity
  const activeFocusId = hoveredNodeId || selectedNode?.data.id || currentEntity

  // Compute 1-hop connected neighbors of activeFocusId
  const directNeighborIds = useMemo(() => {
    const neighbors = new Set<string>()
    if (!graphData) return neighbors
    neighbors.add(activeFocusId)

    graphData.cytoscape_elements.edges.forEach((e) => {
      if (e.data.source === activeFocusId) neighbors.add(e.data.target)
      if (e.data.target === activeFocusId) neighbors.add(e.data.source)
    })
    return neighbors
  }, [graphData, activeFocusId])

  // Get list of wallets in graph for the quick address switcher
  const availableWallets = useMemo(() => {
    if (!graphData) return []
    return graphData.cytoscape_elements.nodes.filter((n) => n.data.node_type === 'WALLET')
  }, [graphData])

  // Convert screen mouse coordinate to SVG coordinate space (1200 x 750)
  const getSvgCoordinates = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 }
    const rect = svgRef.current.getBoundingClientRect()
    const scaleX = 1200 / rect.width
    const scaleY = 750 / rect.height
    const screenX = (clientX - rect.left) * scaleX
    const screenY = (clientY - rect.top) * scaleY

    const invZoom = 1 / zoom
    const svgX = (screenX - 600 - pan.x) * invZoom + 600
    const svgY = (screenY - 375 - pan.y) * invZoom + 375
    return { x: svgX, y: svgY }
  }

  const handleMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    const coords = getSvgCoordinates(e.clientX, e.clientY)
    const currentPos = nodePositions[nodeId] || { x: 600, y: 375 }
    setDraggingNodeId(nodeId)
    setDragStart({
      x: coords.x - currentPos.x,
      y: coords.y - currentPos.y,
    })

    const node = graphData?.cytoscape_elements.nodes.find((n) => n.data.id === nodeId)
    if (node) setSelectedNode(node)
  }

  const handleMouseDownBg = (e: React.MouseEvent) => {
    setIsPanning(true)
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      const coords = getSvgCoordinates(e.clientX, e.clientY)
      const newX = Math.round(coords.x - dragStart.x)
      const newY = Math.round(coords.y - dragStart.y)
      setNodePositions((prev) => ({
        ...prev,
        [draggingNodeId]: { x: newX, y: newY },
      }))
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setDraggingNodeId(null)
    setIsPanning(false)
  }

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'WALLET':
        return '#0891b2' // rich cyan
      case 'TRANSACTION':
        return '#d97706' // rich amber
      case 'IP':
        return '#9333ea' // purple
      case 'ASN':
        return '#0284c7' // rich blue
      case 'COUNTRY':
        return '#059669' // emerald
      default:
        return '#71717a'
    }
  }

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'WALLET':
        return <Wallet size={12} />
      case 'TRANSACTION':
        return <ArrowRightLeft size={12} />
      case 'IP':
        return <Radio size={12} />
      case 'ASN':
        return <Server size={12} />
      case 'COUNTRY':
        return <Globe size={12} />
      default:
        return <Network size={12} />
    }
  }

  return (
    <div className="space-y-4 flex flex-col h-full">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="eyebrow flex items-center gap-1.5 text-accent-cyan font-bold">
            <Network size={14} />
            <span>02 / FORENSIC TOPOLOGY ENGINE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink mt-0.5">
            Interactive Entity Graph
          </h1>
          <p className="text-xs sm:text-sm text-body">
            Multi-dimensional relationship topology. Drag nodes to reposition or filter by suspect address.
          </p>
        </div>

        {/* Search & Hop Depth */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hops Selector */}
          <div className="flex items-center border border-hairline rounded-[6px] bg-canvas-elevated px-2 py-1 text-xs mono shadow-sm">
            <Layers size={13} className="text-mute mr-1" />
            <span className="text-mute mr-1 font-bold">HOPS:</span>
            {[1, 2, 3, 4].map((k) => (
              <button
                key={k}
                onClick={() => setKHops(k)}
                className={`px-1.5 py-0.5 rounded-[4px] font-bold transition ${
                  kHops === k
                    ? 'bg-ink text-canvas shadow-sm'
                    : 'text-body hover:text-ink hover:bg-canvas-subtle'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          {/* Quick Wallet Address Focus Dropdown */}
          {availableWallets.length > 0 && (
            <div className="relative">
              <select
                value={selectedNode?.data.id || currentEntity}
                onChange={(e) => {
                  const target = e.target.value
                  const node = graphData?.cytoscape_elements.nodes.find((n) => n.data.id === target)
                  if (node) setSelectedNode(node)
                }}
                className="h-8 px-2.5 rounded-[6px] border border-hairline bg-canvas-elevated text-xs mono text-ink focus:outline-none focus:border-ink shadow-sm max-w-[180px] truncate"
                title="Select suspect address to inspect"
              >
                <option value="" disabled>Select Target Wallet...</option>
                {availableWallets.map((w) => (
                  <option key={w.data.id} value={w.data.id}>
                    {w.data.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Entity Input */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search address, TX, IP..."
              className="h-8 pl-7 pr-3 rounded-[6px] border border-hairline bg-canvas-elevated text-xs mono text-ink placeholder:text-mute focus:outline-none focus:border-ink transition w-44 shadow-sm"
            />
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mute"
            />
          </form>

          {/* Tidy Auto-Layout */}
          <button
            onClick={handleTidyLayout}
            className="btn-vercel-outline text-xs h-8 px-2.5"
            title="Auto-arrange nodes cleanly"
          >
            <Sparkles size={13} className="text-accent-cyan" />
            <span className="hidden sm:inline">Tidy Graph</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-[6px] border border-hairline bg-canvas-elevated shadow-sm text-xs">
        {/* Node Type Filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] mono text-mute font-bold mr-1 flex items-center gap-1">
            <Filter size={12} /> FILTER:
          </span>
          {(['ALL', 'WALLET', 'TRANSACTION', 'IP'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2 py-0.5 rounded text-[11px] mono font-semibold transition ${
                typeFilter === t
                  ? 'bg-ink text-canvas font-bold'
                  : 'text-body hover:text-ink hover:bg-canvas-subtle'
              }`}
            >
              {t === 'ALL' ? 'All Entities' : `${t}s`}
            </button>
          ))}
        </div>

        {/* Focus Mode (Only Selected + Direct Neighbors) */}
        <button
          onClick={() => setFocusMode((f) => !f)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-[11px] mono font-bold transition border ${
            focusMode
              ? 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/40 shadow-sm'
              : 'border-hairline text-body hover:text-ink hover:bg-canvas-subtle'
          }`}
          title="Isolate only the selected address and its direct connections"
        >
          {focusMode ? <Eye size={13} /> : <EyeOff size={13} />}
          <span>Focus 1-Hop Neighbors: {focusMode ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Main Graph Area */}
      <div className="relative border border-hairline rounded-[8px] bg-canvas-elevated h-[560px] overflow-hidden select-none shadow-md">
        {/* Graph Legend */}
        <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 p-2 rounded-[6px] border border-hairline bg-canvas-elevated/95 backdrop-blur text-[11px] mono text-ink font-semibold shadow-sm">
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-500" /> WALLET
          </span>
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> TX
          </span>
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> IP
          </span>
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> ASN
          </span>
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> GEO
          </span>
        </div>

        {/* Viewport Zoom / Reset Controls */}
        <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1.5">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.15, 2.4))}
            className="icon-btn-vercel"
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.15, 0.4))}
            className="icon-btn-vercel"
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={() => {
              setZoom(0.95)
              setPan({ x: 0, y: 0 })
            }}
            className="icon-btn-vercel"
            title="Reset Viewport"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        {/* Node Inspector Floating Card */}
        {selectedNode && (
          <div className="absolute top-3 right-3 z-10 w-72 p-4 rounded-[6px] border border-hairline bg-canvas-elevated/95 backdrop-blur shadow-xl text-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-hairline pb-2">
              <span className="text-[10px] mono text-mute font-bold">INSPECTED ENTITY</span>
              <span
                className="px-2 py-0.5 rounded-[4px] text-[10px] mono font-bold flex items-center gap-1"
                style={{
                  backgroundColor: `${getNodeColor(selectedNode.data.node_type)}20`,
                  color: getNodeColor(selectedNode.data.node_type),
                }}
              >
                {getNodeIcon(selectedNode.data.node_type)}
                {selectedNode.data.node_type}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] mono text-mute block">IDENTIFIER</span>
              <code className="mono text-xs text-ink font-semibold break-all bg-canvas-subtle p-2 rounded block border border-hairline select-all">
                {selectedNode.data.id}
              </code>
            </div>

            <div className="text-[11px] text-body flex items-center justify-between pt-1">
              <span className="text-mute">Label:</span>
              <span className="font-semibold text-ink">{selectedNode.data.label}</span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {selectedNode.data.id !== currentEntity && (
                <button
                  onClick={() => setCurrentEntity(selectedNode.data.id)}
                  className="btn-vercel-primary flex-1 text-xs h-8"
                >
                  Center On Node
                </button>
              )}
              <button
                onClick={() => setFocusMode(true)}
                className="btn-vercel-outline flex-1 text-xs h-8 text-accent-cyan"
                title="Isolate this address and its neighbors"
              >
                <Eye size={12} />
                <span>Isolate Links</span>
              </button>
            </div>
          </div>
        )}

        {/* SVG Visualization Canvas */}
        {loading ? (
          <div className="h-full flex items-center justify-center space-y-2.5 flex-col text-body text-xs mono">
            <Network size={32} className="animate-spin text-accent-cyan" />
            <span className="text-ink font-semibold">Tracing k-hop topology from DuckDB...</span>
          </div>
        ) : !currentEntity || !graphData || graphData.cytoscape_elements.nodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 bg-canvas">
            <Network size={40} className="text-mute opacity-60" />
            <h3 className="text-base font-bold text-ink">No Graph Entities Available</h3>
            <p className="text-xs text-body max-w-md">
              DuckDB currently contains 0 nodes. Ingest forensic evidence (.csv, .json, .xml) or run the ML pipeline from the &quot;Ingestion &amp; ML&quot; tab to trace transactional flows.
            </p>
            {searchInput && (
              <p className="text-xs mono text-mute pt-2">
                Queried entity: <span className="text-ink font-semibold">{searchInput}</span>
              </p>
            )}
          </div>
        ) : (
          <svg
            ref={svgRef}
            className={`w-full h-full ${
              draggingNodeId ? 'cursor-grabbing' : isPanning ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            viewBox="0 0 1200 750"
            preserveAspectRatio="xMidYMid meet"
            onMouseDown={handleMouseDownBg}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Defs for Directional Arrow Markers */}
            <defs>
              {/* Neutral High-Contrast Flow Arrow */}
              <marker
                id="arrow-flow"
                viewBox="0 0 12 12"
                refX="22"
                refY="6"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M 1 2 L 10 6 L 1 10 z" fill="#64748b" />
              </marker>

              {/* Active / Highlighted Flow Arrow */}
              <marker
                id="arrow-active"
                viewBox="0 0 12 12"
                refX="24"
                refY="6"
                markerWidth="10"
                markerHeight="10"
                orient="auto-start-reverse"
              >
                <path d="M 1 1 L 11 6 L 1 11 z" fill="#0891b2" />
              </marker>
            </defs>

            <g
              transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
              style={{ transformOrigin: '600px 375px' }}
            >
              {/* Background Grid Pattern */}
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="var(--hairline)"
                  strokeWidth="0.8"
                  opacity="0.5"
                />
              </pattern>
              <rect width="1200" height="750" fill="url(#grid)" />

              {/* Directional Connecting Edges */}
              {graphData?.cytoscape_elements.edges.map((edge) => {
                const src = nodePositions[edge.data.source]
                const tgt = nodePositions[edge.data.target]
                if (!src || !tgt) return null

                // Check visibility under typeFilter
                const srcNode = graphData.cytoscape_elements.nodes.find((n) => n.data.id === edge.data.source)
                const tgtNode = graphData.cytoscape_elements.nodes.find((n) => n.data.id === edge.data.target)
                if (
                  typeFilter !== 'ALL' &&
                  srcNode?.data.node_type !== typeFilter &&
                  tgtNode?.data.node_type !== typeFilter
                ) {
                  return null
                }

                // Check highlight / focus
                const isDirectLink =
                  edge.data.source === activeFocusId || edge.data.target === activeFocusId
                const isDimmed = focusMode && !isDirectLink

                if (isDimmed) return null

                const midX = (src.x + tgt.x) / 2
                const midY = (src.y + tgt.y) / 2

                return (
                  <g key={edge.data.id} className="pointer-events-none transition-opacity duration-200">
                    {/* Shadow / Glow Line for active link */}
                    {isDirectLink && (
                      <line
                        x1={src.x}
                        y1={src.y}
                        x2={tgt.x}
                        y2={tgt.y}
                        stroke="#0891b2"
                        strokeWidth="5"
                        opacity="0.25"
                      />
                    )}

                    {/* Main Line with High-Contrast Color and Arrow */}
                    <line
                      x1={src.x}
                      y1={src.y}
                      x2={tgt.x}
                      y2={tgt.y}
                      stroke={isDirectLink ? '#0891b2' : '#64748b'}
                      strokeWidth={isDirectLink ? '2.5' : '1.8'}
                      strokeDasharray={edge.data.edge_type === 'OBSERVED_WITH' ? '4 3' : undefined}
                      markerEnd={isDirectLink ? 'url(#arrow-active)' : 'url(#arrow-flow)'}
                      opacity={isDirectLink ? 1 : 0.75}
                    />

                    {/* Edge Label: Show cleanly on direct link or hover */}
                    {isDirectLink && (
                      <g transform={`translate(${midX}, ${midY})`}>
                        <rect
                          x="-32"
                          y="-9"
                          width="64"
                          height="16"
                          rx="3"
                          fill="var(--canvas-elevated)"
                          stroke={isDirectLink ? '#0891b2' : 'var(--hairline)'}
                          strokeWidth="1"
                          opacity="0.95"
                        />
                        <text
                          y="3"
                          fill="var(--ink)"
                          fontSize="8.5"
                          fontWeight="bold"
                          fontFamily="ui-monospace, monospace"
                          textAnchor="middle"
                          className="select-none"
                        >
                          {edge.data.edge_type}
                        </text>
                      </g>
                    )}
                  </g>
                )
              })}

              {/* Moveable & Draggable Typed Nodes */}
              {graphData?.cytoscape_elements.nodes.map((node) => {
                const pos = nodePositions[node.data.id] || { x: 600, y: 375 }
                const isSelected = selectedNode?.data.id === node.data.id
                const isCenter = node.data.id === currentEntity
                const isHovered = hoveredNodeId === node.data.id
                const isFocusedNeighbor = directNeighborIds.has(node.data.id)

                // Type filter check
                if (typeFilter !== 'ALL' && node.data.node_type !== typeFilter) {
                  return null
                }

                // Focus mode check: hide unrelated nodes completely
                if (focusMode && !isFocusedNeighbor) {
                  return null
                }

                const color = getNodeColor(node.data.node_type)
                const radius = isCenter ? 26 : 20

                return (
                  <g
                    key={node.data.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onMouseDown={(e) => handleMouseDownNode(e, node.data.id)}
                    onMouseEnter={() => setHoveredNodeId(node.data.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className="cursor-move group"
                  >
                    {/* Pulsing Selection Halo */}
                    {(isSelected || isHovered) && (
                      <circle
                        r={radius + 8}
                        fill="none"
                        stroke={color}
                        strokeWidth="2.5"
                        strokeDasharray="4 4"
                        className="animate-spin"
                        opacity="0.9"
                      />
                    )}

                    {/* Node Circular Base */}
                    <circle
                      r={radius}
                      fill="var(--canvas-elevated)"
                      stroke={color}
                      strokeWidth={isCenter ? 3.5 : isFocusedNeighbor ? 2.5 : 2}
                      className="transition-transform duration-100 group-hover:scale-115 shadow-md"
                    />

                    {/* Node Initial Letter Icon */}
                    <text
                      y="5"
                      fill={color}
                      fontSize={isCenter ? "13" : "11"}
                      fontWeight="800"
                      fontFamily="ui-monospace, monospace"
                      textAnchor="middle"
                      className="pointer-events-none select-none"
                    >
                      {node.data.node_type[0]}
                    </text>

                    {/* High-Contrast Floating Label Box */}
                    <g transform={`translate(0, ${radius + 15})`}>
                      <rect
                        x="-48"
                        y="-10"
                        width="96"
                        height="18"
                        rx="4"
                        fill="var(--canvas-elevated)"
                        stroke={isSelected ? color : 'var(--hairline)'}
                        strokeWidth={isSelected ? '1.5' : '1'}
                        className="shadow-sm"
                      />
                      <text
                        y="2.5"
                        fill="var(--ink)"
                        fontSize="9.5"
                        fontWeight="700"
                        fontFamily="ui-monospace, monospace"
                        textAnchor="middle"
                        className="select-none"
                      >
                        {node.data.label}
                      </text>
                    </g>
                  </g>
                )
              })}
            </g>
          </svg>
        )}
      </div>
    </div>
  )
}
