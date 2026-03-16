'use client'
import { useState, useEffect } from 'react'
import { Task, TaskPriority, TaskStatus } from '@/lib/types'
import { PriorityBadge } from '@/components/PriorityBadge'
import { StatusBadge } from '@/components/StatusBadge'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import clsx from 'clsx'

type TaskWithProject = Omit<Task, 'project'> & { project?: { name: string; id: string } }

const priorityBorderClass: Record<string, string> = {
  urgent: 'border-l-priority-urgent',
  high:   'border-l-priority-high',
  medium: 'border-l-priority-medium',
  low:    'border-l-priority-low',
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterDeadline, setFilterDeadline] = useState<'all' | 'overdue' | 'this_week'>('all')

  useEffect(() => {
    async function load() {
      try {
        setError(null)
        const projectsRes = await fetch('/api/projects')
        if (!projectsRes.ok) throw new Error('Failed to load projects')
        const projects = await projectsRes.json()
        const allTasks: TaskWithProject[] = []
        for (const p of projects) {
          const tasksRes = await fetch(`/api/projects/${p.id}/tasks`)
          if (!tasksRes.ok) continue
          const ptasks = await tasksRes.json()
          if (Array.isArray(ptasks)) {
            ptasks.forEach((t: Task) => allTasks.push({ ...t, project: { id: p.id, name: p.name } }))
          }
        }
        allTasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setTasks(allTasks)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tasks')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const today = format(new Date(), 'yyyy-MM-dd')
  const in7Days = format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

  const filtered = tasks.filter(t => {
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterDeadline === 'overdue' && (!t.deadline || t.deadline >= today || t.status === 'done')) return false
    if (filterDeadline === 'this_week' && (!t.deadline || t.deadline < today || t.deadline > in7Days)) return false
    return true
  })

  return (
    <div className="max-w-[900px] mx-auto">
      <h1 className="text-lg font-bold text-text-primary m-0 mb-5 tracking-tight">ALL TASKS</h1>

      {error && (
        <div className="bg-priority-urgent/10 border border-priority-urgent/40 text-priority-urgent text-xs font-mono px-3 py-2 mb-4 flex justify-between items-center">
          {error}
          <button onClick={() => setError(null)} className="text-priority-urgent hover:text-text-primary bg-transparent border-none cursor-pointer text-xs">dismiss</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap items-center">
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as TaskPriority | 'all')} className="bg-surface-elevated border border-border px-2.5 py-1.5 text-text-primary text-[11px] font-mono outline-none cursor-pointer">
          <option value="all">ALL PRIORITIES</option>
          <option value="urgent">URGENT</option>
          <option value="high">HIGH</option>
          <option value="medium">MEDIUM</option>
          <option value="low">LOW</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as TaskStatus | 'all')} className="bg-surface-elevated border border-border px-2.5 py-1.5 text-text-primary text-[11px] font-mono outline-none cursor-pointer">
          <option value="all">ALL STATUSES</option>
          <option value="todo">TODO</option>
          <option value="in_progress">IN PROGRESS</option>
          <option value="blocked">BLOCKED</option>
          <option value="done">DONE</option>
        </select>
        <select value={filterDeadline} onChange={e => setFilterDeadline(e.target.value as 'all' | 'overdue' | 'this_week')} className="bg-surface-elevated border border-border px-2.5 py-1.5 text-text-primary text-[11px] font-mono outline-none cursor-pointer">
          <option value="all">ALL DEADLINES</option>
          <option value="overdue">OVERDUE</option>
          <option value="this_week">DUE THIS WEEK</option>
        </select>
        <span className="text-[11px] text-text-muted font-mono ml-1">{filtered.length} tasks</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-text-muted font-mono text-xs">
          <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin" />
          LOADING...
        </div>
      ) : (
        <div className="flex flex-col gap-px">
          {filtered.map((task, idx) => {
            const isOverdue = task.deadline && task.status !== 'done' && task.deadline < today
            return (
              <div
                key={task.id}
                className={clsx(
                  'border border-border border-l-[3px] px-3 py-2.5',
                  isOverdue ? 'border-l-priority-urgent' : priorityBorderClass[task.priority],
                  idx % 2 === 0 ? 'bg-surface' : 'bg-[#0f0f0f]'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-text-primary mb-1">{task.title}</div>
                    {task.description && (
                      <p className="text-[11px] text-text-secondary mb-1.5 overflow-hidden whitespace-nowrap text-ellipsis">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 items-center">
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                      {task.deadline && (
                        <span className={clsx('text-[11px] font-mono', isOverdue ? 'text-priority-urgent font-bold' : 'text-text-muted')}>
                          {isOverdue ? '! ' : ''}{format(parseISO(task.deadline), 'MMM d, yyyy')}
                        </span>
                      )}
                      {task.project && (
                        <Link href={`/projects/${task.project.id}`} className="text-[11px] text-accent no-underline font-mono ml-auto hover:underline">
                          {task.project.name} &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-text-muted text-xs font-mono">NO TASKS MATCH YOUR FILTERS.</div>
          )}
        </div>
      )}
    </div>
  )
}
