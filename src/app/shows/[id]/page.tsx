'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type TaskStatus = 'pendiente' | 'ok' | 'bloqueado' | 'na'

type ShowTask = {
  id: string
  show_id: string
  section: string
  task_name: string
  status: TaskStatus
  assigned_to: string | null
  assigned_whatsapp: string | null
  deadline: string | null
  notes: string | null
}

type Show = {
  id: string
  slug: string
  artist: string
  venue_name: string | null
  show_date: string | null
  stage: string
  show_type: string
  show_tasks: ShowTask[]
}

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  exploring:        { label: 'Explorando',     color: '#737373' },
  offer:            { label: 'Oferta',         color: '#3b82f6' },
  contracted:       { label: 'Contratado',     color: '#a855f7' },
  'pre-production': { label: 'Pre-producción', color: '#f59e0b' },
  settlement:       { label: 'Settlement',     color: '#22c55e' },
}

const SECTION_ORDER = [
  'Booking',
  'Production',
  'Marketing',
  'Trámites / Venue',
  'Hospitalidad',
  'Menu & Pricing',
  'Bar Setup / Production',
  'Settlement',
]

const SECTION_ICONS: Record<string, string> = {
  'Booking':               '📋',
  'Production':            '🎛',
  'Marketing':             '📣',
  'Trámites / Venue':      '🏛',
  'Hospitalidad':          '🏨',
  'Menu & Pricing':        '🍹',
  'Bar Setup / Production':'🍸',
  'Settlement':            '💰',
}

const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  pendiente: 'ok',
  ok:        'bloqueado',
  bloqueado: 'na',
  na:        'pendiente',
}

function TaskIcon({ status }: { status: TaskStatus }) {
  if (status === 'ok')        return <span style={{ color: '#22c55e', fontSize: 14, lineHeight: 1 }}>●</span>
  if (status === 'bloqueado') return <span style={{ color: '#ef4444', fontSize: 12, lineHeight: 1, fontWeight: 700 }}>✕</span>
  if (status === 'na')        return <span style={{ color: '#404040', fontSize: 14, lineHeight: 1 }}>—</span>
  return <span style={{ color: '#525252', fontSize: 14, lineHeight: 1 }}>○</span>
}

function computeHealth(tasks: ShowTask[], stage: string): { emoji: string; color: string } {
  if (stage === 'settlement') return { emoji: '⚫', color: '#525252' }
  const active = tasks.filter(t => t.status !== 'na')
  const pending = active.filter(t => t.status === 'pendiente' || t.status === 'bloqueado').length
  const ratio = active.length > 0 ? pending / active.length : 0
  if (ratio > 0.70) return { emoji: '🔴', color: '#ef4444' }
  if (ratio > 0.30) return { emoji: '🟡', color: '#eab308' }
  return { emoji: '🟢', color: '#22c55e' }
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'Sin fecha'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function groupBySection(tasks: ShowTask[]): [string, ShowTask[]][] {
  const map = new Map<string, ShowTask[]>()
  for (const task of tasks) {
    const list = map.get(task.section) ?? []
    list.push(task)
    map.set(task.section, list)
  }
  // Sort by predefined order, unknown sections go last alphabetically
  const known = SECTION_ORDER.filter(s => map.has(s))
  const unknown = Array.from(map.keys()).filter(s => !SECTION_ORDER.includes(s)).sort()
  return [...known, ...unknown].map(s => [s, map.get(s)!])
}

function uniqueContacts(tasks: ShowTask[]): { name: string; phone: string | null }[] {
  const seen = new Set<string>()
  const contacts: { name: string; phone: string | null }[] = []
  for (const t of tasks) {
    if (!t.assigned_to) continue
    if (seen.has(t.assigned_to)) continue
    seen.add(t.assigned_to)
    contacts.push({ name: t.assigned_to, phone: t.assigned_whatsapp })
  }
  return contacts
}

export default function ShowDetailPage() {
  const params = useParams()
  const showId = params.id as string

  const [show, setShow] = useState<Show | null>(null)
  const [tasks, setTasks] = useState<ShowTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patching, setPatching] = useState<string | null>(null)

  const loadShow = useCallback(async () => {
    try {
      const res = await fetch(`/api/shows/${showId}`)
      if (!res.ok) throw new Error('Show not found')
      const data: Show = await res.json()
      setShow(data)
      setTasks(data.show_tasks ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load show')
    } finally {
      setLoading(false)
    }
  }, [showId])

  useEffect(() => { loadShow() }, [loadShow])

  async function cycleStatus(task: ShowTask) {
    if (patching) return
    const newStatus = STATUS_CYCLE[task.status]

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    setPatching(task.id)

    try {
      const res = await fetch(`/api/shows/${showId}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, last_updated_by: 'browser' }),
      })
      if (!res.ok) throw new Error('Update failed')
    } catch {
      // Revert on error
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t))
      setError('Failed to update task — try again')
    } finally {
      setPatching(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-text-muted font-mono text-xs pt-8">
        <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin" />
        LOADING...
      </div>
    )
  }

  if (!show) {
    return (
      <div className="font-mono text-xs text-text-muted">
        SHOW NOT FOUND.{' '}
        <Link href="/shows" className="text-accent no-underline hover:underline">BACK TO SHOWS</Link>
      </div>
    )
  }

  const stageCfg = STAGE_CONFIG[show.stage] ?? { label: show.stage, color: '#737373' }
  const health = computeHealth(tasks, show.stage)
  const sections = groupBySection(tasks)
  const contacts = uniqueContacts(tasks)

  return (
    <div className="w-full">
      {/* Error banner */}
      {error && (
        <div className="bg-priority-urgent/10 border border-priority-urgent/40 text-priority-urgent text-xs font-mono px-3 py-2 mb-4 flex justify-between items-center">
          {error}
          <button onClick={() => setError(null)} className="bg-transparent border-none cursor-pointer text-priority-urgent text-xs">dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Link href="/shows" className="text-[11px] text-text-muted no-underline font-mono hover:text-text-secondary transition-colors">
            ← SHOWS
          </Link>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-lg leading-none">{health.emoji}</span>
          <h1 className="text-xl font-bold text-text-primary m-0 tracking-tight">{show.artist}</h1>
          <span
            className="text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 border"
            style={{
              color: stageCfg.color,
              borderColor: `${stageCfg.color}50`,
              backgroundColor: `${stageCfg.color}18`,
            }}
          >
            {stageCfg.label.toUpperCase()}
          </span>
        </div>
        <div className="text-[12px] font-mono mt-1.5" style={{ color: '#525252' }}>
          {show.venue_name ?? 'Sin venue'} · {fmtDate(show.show_date)}
        </div>
      </div>

      {/* Two-panel body */}
      <div className="flex gap-px bg-border" style={{ alignItems: 'flex-start' }}>

        {/* Left — Checklist */}
        <div className="flex-1 bg-surface p-5 min-w-0">
          <div className="text-[10px] font-mono font-bold tracking-widest text-text-muted mb-4">
            CHECKLIST
          </div>

          <div className="flex flex-col gap-5">
            {sections.map(([section, sectionTasks]) => {
              const okCount = sectionTasks.filter(t => t.status === 'ok').length
              return (
                <div key={section}>
                  {/* Section header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{SECTION_ICONS[section] ?? '●'}</span>
                      <span className="text-[11px] font-mono font-bold tracking-wider text-text-secondary uppercase">
                        {section}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-text-muted">
                      {okCount}/{sectionTasks.length} ✓
                    </span>
                  </div>

                  {/* Task rows */}
                  <div className="flex flex-col gap-px bg-border">
                    {sectionTasks.map(task => (
                      <button
                        key={task.id}
                        onClick={() => cycleStatus(task)}
                        disabled={patching === task.id}
                        className="flex items-center gap-3 px-3 py-2.5 text-left w-full border-none cursor-pointer transition-colors"
                        style={{
                          backgroundColor: '#111111',
                          opacity: task.status === 'na' ? 0.4 : 1,
                        }}
                        onMouseEnter={e => { if (task.status !== 'na') (e.currentTarget as HTMLElement).style.backgroundColor = '#1a1a1a' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#111111' }}
                        title="Click to cycle status"
                      >
                        <span className="shrink-0 w-4 flex justify-center">
                          <TaskIcon status={task.status} />
                        </span>
                        <span
                          className="text-[13px] leading-snug flex-1"
                          style={{
                            color: task.status === 'ok' ? '#525252' : task.status === 'bloqueado' ? '#ef4444' : '#f5f5f5',
                            textDecoration: task.status === 'ok' ? 'line-through' : 'none',
                          }}
                        >
                          {task.task_name}
                        </span>
                        {task.deadline && task.status !== 'ok' && (
                          <span className="text-[10px] font-mono text-text-muted shrink-0">
                            {fmtDate(task.deadline)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right — Directory */}
        <div className="bg-surface p-5" style={{ width: '260px', flexShrink: 0 }}>
          <div className="text-[10px] font-mono font-bold tracking-widest text-text-muted mb-4">
            DIRECTORIO
          </div>

          {contacts.length === 0 ? (
            <p className="text-[11px] text-text-muted font-mono leading-relaxed">
              Sin contactos asignados — asigna tareas a personas desde Clau.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {contacts.map(contact => {
                const phone = contact.phone ? contact.phone.replace(/\D/g, '') : null
                return (
                  <div
                    key={contact.name}
                    className="border-b pb-3 last:border-b-0 last:pb-0"
                    style={{ borderColor: '#2a2a2a' }}
                  >
                    <div className="text-sm font-semibold text-text-primary">{contact.name}</div>
                    {phone && (
                      <a
                        href={`https://wa.me/${phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1 no-underline"
                        style={{ color: '#22c55e', fontSize: '11px', fontFamily: 'monospace' }}
                      >
                        <span>💬</span> WhatsApp
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
