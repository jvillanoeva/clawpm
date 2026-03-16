'use client'
import { Task } from '@/lib/types'
import { PriorityBadge } from './PriorityBadge'
import { StatusBadge } from './StatusBadge'
import { format, isPast, parseISO } from 'date-fns'

const priorityBorderColor: Record<string, string> = {
  urgent: '#ef4444',
  high:   '#f97316',
  medium: '#eab308',
  low:    '#22c55e',
}

interface TaskCardProps {
  task: Task
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
  showProject?: boolean
}

export function TaskCard({ task, onEdit, onDelete, showProject }: TaskCardProps) {
  const isOverdue = task.deadline && task.status !== 'done' && isPast(parseISO(task.deadline))
  const borderColor = priorityBorderColor[task.priority]

  return (
    <div
      style={{
        backgroundColor: '#111111',
        border: '1px solid #2a2a2a',
        borderLeft: `3px solid ${borderColor}`,
        padding: '10px 12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', fontWeight: 500, color: '#f5f5f5', lineHeight: 1.3 }}>{task.title}</span>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              style={{ background: 'none', border: 'none', color: '#525252', cursor: 'pointer', fontSize: '11px', padding: '0 2px' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#a3a3a3')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#525252')}
            >
              edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(task.id)}
              style={{ background: 'none', border: 'none', color: '#525252', cursor: 'pointer', fontSize: '11px', padding: '0 2px' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ef4444')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#525252')}
            >
              del
            </button>
          )}
        </div>
      </div>
      {task.description && (
        <p style={{ fontSize: '11px', color: '#a3a3a3', marginBottom: '6px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {task.description}
        </p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
        {task.deadline && (
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: isOverdue ? '#ef4444' : '#525252', fontWeight: isOverdue ? 600 : 400 }}>
            {isOverdue ? '! ' : ''}{format(parseISO(task.deadline), 'MMM d')}
          </span>
        )}
        {showProject && task.project && (
          <span style={{ fontSize: '11px', color: '#525252', marginLeft: 'auto', fontFamily: 'monospace' }}>{task.project.name}</span>
        )}
      </div>
    </div>
  )
}
