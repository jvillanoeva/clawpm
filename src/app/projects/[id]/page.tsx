'use client'
import { useState, useEffect, useCallback } from 'react'
import { Task, TaskStatus, TaskPriority, Project } from '@/lib/types'
import { PriorityBadge } from '@/components/PriorityBadge'
import { format, parseISO, isPast } from 'date-fns'
import clsx from 'clsx'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const COLUMNS: { key: TaskStatus; label: string; colorClass: string; borderClass: string; bgClass: string }[] = [
  { key: 'todo',        label: 'TODO',        colorClass: 'text-status-todo',        borderClass: 'border-status-todo',        bgClass: 'bg-status-todo/5' },
  { key: 'in_progress', label: 'IN PROGRESS', colorClass: 'text-status-in-progress', borderClass: 'border-status-in-progress', bgClass: 'bg-status-in-progress/5' },
  { key: 'blocked',     label: 'BLOCKED',     colorClass: 'text-status-blocked',     borderClass: 'border-status-blocked',     bgClass: 'bg-status-blocked/5' },
  { key: 'done',        label: 'DONE',        colorClass: 'text-status-done',        borderClass: 'border-status-done',        bgClass: 'bg-status-done/5' },
]

const priorityBorderClass: Record<string, string> = {
  urgent: 'border-l-priority-urgent',
  high:   'border-l-priority-high',
  medium: 'border-l-priority-medium',
  low:    'border-l-priority-low',
}

interface TaskFormData {
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  deadline: string
}

const defaultForm: TaskFormData = { title: '', description: '', priority: 'medium', status: 'todo', deadline: '' }

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<TaskFormData>(defaultForm)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setError(null)
      const [projectRes, tasksRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/tasks`),
      ])
      if (!projectRes.ok || !tasksRes.ok) throw new Error('Failed to load project data')
      const [projectData, tasksData] = await Promise.all([projectRes.json(), tasksRes.json()])
      setProject(projectData)
      setTasks(Array.isArray(tasksData) ? tasksData : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { loadData() }, [loadData])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = { ...form, deadline: form.deadline || null }
      const url = editingTask ? `/api/tasks/${editingTask.id}` : `/api/projects/${projectId}/tasks`
      const res = await fetch(url, {
        method: editingTask ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save task')
      }
      setForm(defaultForm)
      setShowForm(false)
      setEditingTask(null)
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task')
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(task: Task) {
    setForm({ title: task.title, description: task.description || '', priority: task.priority, status: task.status, deadline: task.deadline || '' })
    setEditingTask(task)
    setShowForm(true)
  }

  async function handleDelete(taskId: string) {
    if (!confirm('Delete this task?')) return
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    loadData()
  }

  async function handleDrop(e: React.DragEvent, newStatus: TaskStatus) {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    if (!taskId) return
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setDragging(null)
    loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-text-muted font-mono text-xs">
        <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin" />
        LOADING...
      </div>
    )
  }

  if (error && !project) {
    return (
      <div className="font-mono text-xs">
        <p className="text-priority-urgent mb-2">ERROR: {error}</p>
        <Link href="/projects" className="text-accent no-underline hover:underline">BACK TO PROJECTS</Link>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="font-mono text-xs text-text-muted">
        PROJECT NOT FOUND.{' '}
        <Link href="/projects" className="text-accent no-underline hover:underline">BACK TO PROJECTS</Link>
      </div>
    )
  }

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasks.filter(t => t.status === col.key)
    return acc
  }, {} as Record<TaskStatus, Task[]>)

  return (
    <div className="w-full">
      {/* Error banner */}
      {error && (
        <div className="bg-priority-urgent/10 border border-priority-urgent/40 text-priority-urgent text-xs font-mono px-3 py-2 mb-4 flex justify-between items-center">
          {error}
          <button onClick={() => setError(null)} className="text-priority-urgent hover:text-text-primary bg-transparent border-none cursor-pointer text-xs">dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Link href="/projects" className="text-[11px] text-text-muted no-underline font-mono hover:text-text-secondary">
          &larr; PROJECTS
        </Link>
        <span className="text-border">/</span>
        <h1 className="text-base font-bold text-text-primary m-0">{project.name}</h1>
        <span className="text-[9px] font-mono font-bold tracking-wider text-text-secondary bg-surface-elevated border border-border px-1.5 py-px">
          {project.status.toUpperCase()}
        </span>
      </div>
      {project.description && (
        <p className="text-xs text-text-muted font-mono mt-1 mb-4">{project.description}</p>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] text-text-muted font-mono">{tasks.length} TASKS</div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingTask(null); setForm(defaultForm) }}
          className="bg-accent text-black border-none px-3.5 py-1.5 text-[11px] font-bold font-mono tracking-wide cursor-pointer hover:bg-accent-hover transition-colors"
        >
          + ADD TASK
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface border border-border p-4 mb-5">
          <div className="text-[11px] font-bold text-accent font-mono tracking-wider mb-3">
            {editingTask ? 'EDIT TASK' : 'NEW TASK'}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <label className="block text-[10px] text-text-muted font-mono tracking-wider mb-0.5">TITLE *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-surface-elevated border border-border px-2.5 py-[7px] text-text-primary text-[13px] outline-none font-sans" placeholder="Task title" required />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] text-text-muted font-mono tracking-wider mb-0.5">DESCRIPTION</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-surface-elevated border border-border px-2.5 py-[7px] text-text-primary text-[13px] outline-none font-sans resize-y" placeholder="Optional description" rows={2} />
            </div>
            <div>
              <label className="block text-[10px] text-text-muted font-mono tracking-wider mb-0.5">PRIORITY</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as TaskPriority })} className="w-full bg-surface-elevated border border-border px-2.5 py-[7px] text-text-primary text-[13px] outline-none font-sans">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-text-muted font-mono tracking-wider mb-0.5">STATUS</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TaskStatus })} className="w-full bg-surface-elevated border border-border px-2.5 py-[7px] text-text-primary text-[13px] outline-none font-sans">
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-text-muted font-mono tracking-wider mb-0.5">DEADLINE</label>
              <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="w-full bg-surface-elevated border border-border px-2.5 py-[7px] text-text-primary text-[13px] outline-none font-sans" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              type="submit"
              disabled={submitting}
              className={clsx(
                'bg-accent text-black border-none px-3.5 py-1.5 text-[11px] font-bold font-mono tracking-wide',
                submitting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-accent-hover'
              )}
            >
              {submitting ? 'SAVING...' : editingTask ? 'SAVE CHANGES' : 'CREATE TASK'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingTask(null) }}
              className="bg-surface-elevated text-text-secondary border border-border px-3.5 py-1.5 text-[11px] font-mono cursor-pointer hover:text-text-primary transition-colors"
            >
              CANCEL
            </button>
          </div>
        </form>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-4 gap-px bg-border">
        {COLUMNS.map(col => (
          <div
            key={col.key}
            className="bg-[#0f0f0f] min-h-[300px]"
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, col.key)}
          >
            {/* Column header */}
            <div className={clsx('flex items-center justify-between px-2.5 py-2 border-b-2', col.borderClass, col.bgClass)}>
              <span className={clsx('text-[10px] font-bold font-mono tracking-wider', col.colorClass)}>
                {col.label}
              </span>
              <span className={clsx('text-[10px] font-mono px-1.5 border', col.colorClass, col.borderClass, col.bgClass)}>
                {tasksByStatus[col.key].length}
              </span>
            </div>

            {/* Tasks */}
            <div className="p-2 flex flex-col gap-1.5">
              {tasksByStatus[col.key].map(task => {
                const isOverdue = task.deadline && task.status !== 'done' && isPast(parseISO(task.deadline))
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={e => { e.dataTransfer.setData('taskId', task.id); setDragging(task.id) }}
                    onDragEnd={() => setDragging(null)}
                    className={clsx(
                      'bg-surface border border-border border-l-2 px-2.5 py-2 cursor-grab transition-opacity',
                      priorityBorderClass[task.priority],
                      dragging === task.id && 'opacity-50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <span className="text-xs font-medium text-text-primary leading-tight">{task.title}</span>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleEdit(task)} className="bg-transparent border-none text-text-muted cursor-pointer text-[10px] p-0 font-mono hover:text-text-secondary">edit</button>
                        <button onClick={() => handleDelete(task.id)} className="bg-transparent border-none text-text-muted cursor-pointer text-[10px] p-0 font-mono hover:text-priority-urgent">del</button>
                      </div>
                    </div>
                    {task.description && (
                      <p className="text-[11px] text-text-muted mb-1.5 overflow-hidden line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 items-center">
                      <PriorityBadge priority={task.priority} />
                      {task.deadline && (
                        <span className={clsx('text-[10px] font-mono', isOverdue ? 'text-priority-urgent font-bold' : 'text-text-muted')}>
                          {isOverdue ? '! ' : ''}{format(parseISO(task.deadline), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
