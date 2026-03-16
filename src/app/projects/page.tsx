'use client'
import { useState, useEffect } from 'react'
import { Project, ProjectStatus } from '@/lib/types'
import Link from 'next/link'
import clsx from 'clsx'

const statusConfig: Record<ProjectStatus, { label: string; colorClass: string }> = {
  active: { label: 'ACTIVE', colorClass: 'text-status-done' },
  paused: { label: 'PAUSED', colorClass: 'text-priority-medium' },
  done:   { label: 'DONE',   colorClass: 'text-text-muted' },
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', status: 'active' as ProjectStatus, slack_channel_webhook: '' })
  const [submitting, setSubmitting] = useState(false)

  async function loadProjects() {
    try {
      setError(null)
      const res = await fetch('/api/projects')
      if (!res.ok) throw new Error('Failed to load projects')
      const data = await res.json()
      setProjects(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProjects() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, slack_channel_webhook: form.slack_channel_webhook || null }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create project')
      }
      setForm({ name: '', description: '', status: 'active', slack_channel_webhook: '' })
      setShowForm(false)
      loadProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this project and all its tasks?')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    loadProjects()
  }

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Error banner */}
      {error && (
        <div className="bg-priority-urgent/10 border border-priority-urgent/40 text-priority-urgent text-xs font-mono px-3 py-2 mb-4 flex justify-between items-center">
          {error}
          <button onClick={() => setError(null)} className="text-priority-urgent hover:text-text-primary bg-transparent border-none cursor-pointer text-xs">dismiss</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-text-primary m-0 tracking-tight">PROJECTS</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-accent text-black border-none px-4 py-2 text-xs font-bold font-mono tracking-wide cursor-pointer hover:bg-accent-hover transition-colors"
        >
          + NEW PROJECT
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface border border-border p-5 mb-6">
          <div className="text-xs font-bold text-accent font-mono tracking-wider mb-4">NEW PROJECT</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[10px] text-text-muted font-mono tracking-wider mb-1">NAME *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-surface-elevated border border-border px-2.5 py-2 text-text-primary text-[13px] outline-none font-sans" placeholder="Project name" required />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] text-text-muted font-mono tracking-wider mb-1">DESCRIPTION</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-surface-elevated border border-border px-2.5 py-2 text-text-primary text-[13px] outline-none font-sans resize-y" placeholder="Optional description" rows={2} />
            </div>
            <div>
              <label className="block text-[10px] text-text-muted font-mono tracking-wider mb-1">STATUS</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ProjectStatus })} className="w-full bg-surface-elevated border border-border px-2.5 py-2 text-text-primary text-[13px] outline-none font-sans">
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-text-muted font-mono tracking-wider mb-1">SLACK WEBHOOK</label>
              <input value={form.slack_channel_webhook} onChange={e => setForm({ ...form, slack_channel_webhook: e.target.value })} className="w-full bg-surface-elevated border border-border px-2.5 py-2 text-text-primary text-[13px] outline-none font-sans" placeholder="https://hooks.slack.com/..." />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={submitting} className={clsx('bg-accent text-black border-none px-4 py-2 text-xs font-bold font-mono tracking-wide', submitting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-accent-hover')}>
              {submitting ? 'CREATING...' : 'CREATE PROJECT'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-surface-elevated text-text-secondary border border-border px-4 py-2 text-xs font-mono cursor-pointer hover:text-text-primary transition-colors">
              CANCEL
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-text-muted font-mono text-xs">
          <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin" />
          LOADING...
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-px bg-border">
          {projects.map(project => {
            const sc = statusConfig[project.status]
            return (
              <div key={project.id} className="bg-surface p-4 relative">
                <div className="flex items-start justify-between mb-2">
                  <Link href={`/projects/${project.id}`} className="text-sm font-semibold text-text-primary no-underline hover:text-accent transition-colors">
                    {project.name}
                  </Link>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={clsx('text-[9px] font-mono font-bold tracking-wider px-1.5 py-px border', sc.colorClass, `bg-current/10 border-current/40`)}>
                      {sc.label}
                    </span>
                    <button onClick={() => handleDelete(project.id)} className="bg-transparent border-none text-text-muted cursor-pointer text-xs p-0 hover:text-priority-urgent transition-colors">
                      &times;
                    </button>
                  </div>
                </div>
                {project.description && (
                  <p className="text-xs text-text-secondary mb-3 overflow-hidden line-clamp-2">{project.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-muted font-mono">{new Date(project.created_at).toLocaleDateString()}</span>
                  <Link href={`/projects/${project.id}`} className="text-[11px] text-accent no-underline font-mono hover:underline">tasks &rarr;</Link>
                </div>
              </div>
            )
          })}
          {projects.length === 0 && (
            <div className="col-span-2 text-center py-12 text-text-muted text-xs font-mono bg-surface">
              NO PROJECTS YET. CREATE YOUR FIRST PROJECT ABOVE.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
