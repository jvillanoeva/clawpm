'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type TaskCounts = {
  total: number
  active: number
  blocked: number
  pending: number
  ok: number
  na: number
}

type Show = {
  id: string
  slug: string
  artist: string
  venue_name: string | null
  show_date: string | null
  stage: string
  show_type: string
  health: 'red' | 'yellow' | 'green'
  task_counts: TaskCounts
}

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  exploring:        { label: 'Explorando',     color: '#737373' },
  offer:            { label: 'Oferta',         color: '#3b82f6' },
  contracted:       { label: 'Contratado',     color: '#a855f7' },
  'pre-production': { label: 'Pre-producción', color: '#f59e0b' },
  settlement:       { label: 'Settlement',     color: '#22c55e' },
}

function computeHealth(show: Show): { emoji: string; label: string; color: string } {
  if (show.stage === 'settlement') {
    return { emoji: '⚫', label: 'Archivado', color: '#525252' }
  }
  const ratio = show.task_counts.active > 0
    ? (show.task_counts.pending + show.task_counts.blocked) / show.task_counts.active
    : 0
  if (ratio > 0.70) return { emoji: '🔴', label: `${show.task_counts.pending} pendientes`, color: '#ef4444' }
  if (ratio > 0.30) return { emoji: '🟡', label: `${show.task_counts.pending} pendientes`, color: '#eab308' }
  return {
    emoji: '🟢',
    label: show.task_counts.pending === 0 ? 'Al día ✓' : `${show.task_counts.pending} pendientes`,
    color: '#22c55e',
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'Sin fecha'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ShowsPage() {
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/shows')
      .then(r => { if (!r.ok) throw new Error('Failed to load'); return r.json() })
      .then(data => setShows(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load shows'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-text-muted font-mono text-xs pt-8">
        <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin" />
        LOADING...
      </div>
    )
  }

  return (
    <div className="max-w-[900px] mx-auto">
      {error && (
        <div className="bg-priority-urgent/10 border border-priority-urgent/40 text-priority-urgent text-xs font-mono px-3 py-2 mb-4">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-text-primary m-0 tracking-tight">SHOWS</h1>
        <span className="text-[10px] text-text-muted font-mono">{shows.length} shows</span>
      </div>

      <div className="flex flex-col gap-px bg-border">
        {shows.map(show => {
          const stageCfg = STAGE_CONFIG[show.stage] ?? { label: show.stage, color: '#737373' }
          const health = computeHealth(show)
          const dimmed = show.stage === 'settlement'
          return (
            <Link
              key={show.id}
              href={`/shows/${show.id}`}
              className="no-underline flex items-center gap-4 px-4 py-3 group transition-colors"
              style={{
                backgroundColor: '#111111',
                opacity: dimmed ? 0.55 : 1,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#1a1a1a' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#111111' }}
            >
              {/* Health dot */}
              <span className="text-lg leading-none shrink-0">{health.emoji}</span>

              {/* Artist + venue/date */}
              <div className="flex-1 min-w-0">
                <div
                  className="font-bold text-sm tracking-tight truncate transition-colors"
                  style={{ color: '#f5f5f5' }}
                >
                  {show.artist}
                </div>
                <div className="text-[11px] font-mono mt-0.5" style={{ color: '#525252' }}>
                  {show.venue_name ?? 'Sin venue'} · {fmtDate(show.show_date)}
                </div>
              </div>

              {/* Stage badge */}
              <span
                className="text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 border shrink-0"
                style={{
                  color: stageCfg.color,
                  borderColor: `${stageCfg.color}50`,
                  backgroundColor: `${stageCfg.color}18`,
                }}
              >
                {stageCfg.label.toUpperCase()}
              </span>

              {/* Pending label */}
              <div
                className="text-[11px] font-mono shrink-0 text-right"
                style={{ color: health.color, minWidth: '130px' }}
              >
                {health.label}
              </div>
            </Link>
          )
        })}

        {shows.length === 0 && (
          <div className="text-center py-12 text-text-muted text-xs font-mono bg-surface">
            NO HAY SHOWS ACTIVOS.
          </div>
        )}
      </div>
    </div>
  )
}
