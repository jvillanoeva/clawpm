import { TaskPriority } from '@/lib/types'

const priorityConfig: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  urgent: { label: 'URGENT', color: '#ef4444', dot: '#ef4444' },
  high:   { label: 'HIGH',   color: '#f97316', dot: '#f97316' },
  medium: { label: 'MED',    color: '#eab308', dot: '#eab308' },
  low:    { label: 'LOW',    color: '#22c55e', dot: '#22c55e' },
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { label, color, dot } = priorityConfig[priority]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
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
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: dot, flexShrink: 0 }} />
      {label}
    </span>
  )
}
