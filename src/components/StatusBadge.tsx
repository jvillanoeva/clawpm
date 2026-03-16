import { TaskStatus } from '@/lib/types'

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  todo:        { label: 'TODO',        color: '#525252' },
  in_progress: { label: 'IN PROGRESS', color: '#3b82f6' },
  blocked:     { label: 'BLOCKED',     color: '#ef4444' },
  done:        { label: 'DONE',        color: '#22c55e' },
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { label, color } = statusConfig[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '1px 6px',
        backgroundColor: `${color}18`,
        border: `1px solid ${color}40`,
        fontSize: '10px',
        fontFamily: 'monospace',
        fontWeight: 600,
        color,
        letterSpacing: '0.06em',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}
