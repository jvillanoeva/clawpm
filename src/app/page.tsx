import { createServerClient } from '@/lib/supabase/server'
import { Task, Project } from '@/lib/types'
import Link from 'next/link'
import { PriorityBadge } from '@/components/PriorityBadge'
import { format, parseISO, addDays } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createServerClient()
  const now = new Date()
  const in7Days = format(addDays(now, 7), 'yyyy-MM-dd')
  const today = format(now, 'yyyy-MM-dd')

  const [{ data: projects }, { data: dueSoonTasks }, { data: overdueTasks }] = await Promise.all([
    supabase.from('projects').select('*').eq('status', 'active').order('created_at', { ascending: false }),
    supabase.from('tasks').select('*, project:projects(name)').gte('deadline', today).lte('deadline', in7Days).neq('status', 'done').order('deadline'),
    supabase.from('tasks').select('*, project:projects(name)').lt('deadline', today).neq('status', 'done').order('deadline'),
  ])

  const statCard = (value: number, label: string, valueColor: string) => (
    <div style={{ backgroundColor: '#111111', border: '1px solid #2a2a2a', padding: '16px 20px' }}>
      <div style={{ fontSize: '32px', fontWeight: 700, color: valueColor, fontFamily: 'monospace', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: '#525252', marginTop: '6px', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
        {label}
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#f5f5f5', margin: 0, letterSpacing: '0.02em' }}>
          DASHBOARD
        </h1>
        <div style={{ fontSize: '11px', color: '#525252', fontFamily: 'monospace', marginTop: '4px' }}>
          {format(now, 'yyyy-MM-dd HH:mm')}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', backgroundColor: '#2a2a2a', marginBottom: '32px' }}>
        {statCard(projects?.length || 0, 'ACTIVE PROJECTS', '#f97316')}
        {statCard(dueSoonTasks?.length || 0, 'DUE IN 7 DAYS', '#eab308')}
        {statCard(overdueTasks?.length || 0, 'OVERDUE TASKS', '#ef4444')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Active Projects */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#a3a3a3', letterSpacing: '0.1em', fontFamily: 'monospace', marginBottom: '10px' }}>
            ACTIVE PROJECTS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {projects?.map((p: Project) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                style={{
                  display: 'block',
                  backgroundColor: '#111111',
                  border: '1px solid #2a2a2a',
                  borderLeft: '2px solid #f97316',
                  padding: '10px 12px',
                  textDecoration: 'none',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = '#f97316')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = '#2a2a2a')}
              >
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#f5f5f5' }}>{p.name}</div>
                {p.description && (
                  <div style={{ fontSize: '11px', color: '#525252', marginTop: '2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {p.description}
                  </div>
                )}
              </Link>
            ))}
            {(!projects || projects.length === 0) && (
              <p style={{ fontSize: '12px', color: '#525252', fontFamily: 'monospace' }}>
                No active projects.{' '}
                <Link href="/projects" style={{ color: '#f97316', textDecoration: 'none' }}>
                  Create one →
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Overdue + Due Soon */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', letterSpacing: '0.1em', fontFamily: 'monospace', marginBottom: '10px' }}>
            OVERDUE ({overdueTasks?.length || 0})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '20px' }}>
            {overdueTasks?.slice(0, 5).map((task: Task & { project: { name: string } }) => (
              <div
                key={task.id}
                style={{ backgroundColor: '#111111', border: '1px solid #2a2a2a', borderLeft: '2px solid #ef4444', padding: '8px 12px' }}
              >
                <div style={{ fontSize: '13px', color: '#f5f5f5', fontWeight: 500, marginBottom: '4px' }}>{task.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PriorityBadge priority={task.priority} />
                  <span style={{ fontSize: '11px', color: '#ef4444', fontFamily: 'monospace' }}>
                    {format(parseISO(task.deadline!), 'MMM d')}
                  </span>
                  <span style={{ fontSize: '11px', color: '#525252', fontFamily: 'monospace', marginLeft: 'auto' }}>
                    {task.project?.name}
                  </span>
                </div>
              </div>
            ))}
            {(!overdueTasks || overdueTasks.length === 0) && (
              <p style={{ fontSize: '12px', color: '#525252', fontFamily: 'monospace' }}>No overdue tasks.</p>
            )}
          </div>

          <div style={{ fontSize: '11px', fontWeight: 700, color: '#eab308', letterSpacing: '0.1em', fontFamily: 'monospace', marginBottom: '10px' }}>
            DUE SOON ({dueSoonTasks?.length || 0})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {dueSoonTasks?.slice(0, 5).map((task: Task & { project: { name: string } }) => (
              <div
                key={task.id}
                style={{ backgroundColor: '#111111', border: '1px solid #2a2a2a', borderLeft: '2px solid #eab308', padding: '8px 12px' }}
              >
                <div style={{ fontSize: '13px', color: '#f5f5f5', fontWeight: 500, marginBottom: '4px' }}>{task.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PriorityBadge priority={task.priority} />
                  <span style={{ fontSize: '11px', color: '#eab308', fontFamily: 'monospace' }}>
                    {format(parseISO(task.deadline!), 'MMM d')}
                  </span>
                  <span style={{ fontSize: '11px', color: '#525252', fontFamily: 'monospace', marginLeft: 'auto' }}>
                    {task.project?.name}
                  </span>
                </div>
              </div>
            ))}
            {(!dueSoonTasks || dueSoonTasks.length === 0) && (
              <p style={{ fontSize: '12px', color: '#525252', fontFamily: 'monospace' }}>No tasks due soon.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
