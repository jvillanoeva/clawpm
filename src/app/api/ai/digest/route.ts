import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { formatISO, subDays } from 'date-fns'

export async function GET(request: Request) {
  // Bearer token auth (shared with cron)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServerClient()
    const now = new Date()
    const todayStr = formatISO(now, { representation: 'date' })
    const yesterdayStr = formatISO(subDays(now, 1), { representation: 'date' })

    const [projectsResult, tasksResult] = await Promise.all([
      supabase.from('projects').select('id, name, status').eq('status', 'active'),
      supabase.from('tasks').select('id, title, priority, status, deadline, project_id, updated_at').order('updated_at', { ascending: false }),
    ])

    const projects = projectsResult.data || []
    const tasks = tasksResult.data || []

    const overdue = tasks.filter(t => t.deadline && t.deadline < todayStr && t.status !== 'done')
    const completedYesterday = tasks.filter(t => t.status === 'done' && t.updated_at >= yesterdayStr + 'T00:00:00Z')
    const blocked = tasks.filter(t => t.status === 'blocked')
    const highPriority = tasks.filter(t => (t.priority === 'high' || t.priority === 'urgent') && t.status !== 'done')

    // Build the digest prompt (structured data for LLM consumption or direct display)
    const lines: string[] = []
    lines.push(`*Daily Digest* - ${todayStr}`)
    lines.push('')

    if (overdue.length > 0) {
      lines.push(`*Overdue (${overdue.length}):*`)
      for (const t of overdue.slice(0, 10)) {
        const proj = projects.find(p => p.id === t.project_id)
        lines.push(`  - [${t.priority.toUpperCase()}] ${t.title} (due ${t.deadline}) - ${proj?.name || 'Unknown'}`)
      }
      lines.push('')
    }

    if (blocked.length > 0) {
      lines.push(`*Blocked (${blocked.length}):*`)
      for (const t of blocked.slice(0, 10)) {
        const proj = projects.find(p => p.id === t.project_id)
        lines.push(`  - ${t.title} - ${proj?.name || 'Unknown'}`)
      }
      lines.push('')
    }

    if (highPriority.length > 0) {
      lines.push(`*High Priority Open (${highPriority.length}):*`)
      for (const t of highPriority.slice(0, 10)) {
        const proj = projects.find(p => p.id === t.project_id)
        lines.push(`  - [${t.priority.toUpperCase()}] ${t.title} (${t.status}) - ${proj?.name || 'Unknown'}`)
      }
      lines.push('')
    }

    if (completedYesterday.length > 0) {
      lines.push(`*Completed Yesterday (${completedYesterday.length}):*`)
      for (const t of completedYesterday.slice(0, 10)) {
        const proj = projects.find(p => p.id === t.project_id)
        lines.push(`  - ${t.title} - ${proj?.name || 'Unknown'}`)
      }
      lines.push('')
    }

    const totalOpen = tasks.filter(t => t.status !== 'done').length
    lines.push(`*Summary:* ${projects.length} active projects, ${totalOpen} open tasks, ${overdue.length} overdue, ${completedYesterday.length} completed yesterday`)

    const digest = lines.join('\n')

    return NextResponse.json({
      digest,
      stats: {
        active_projects: projects.length,
        total_tasks: tasks.length,
        overdue: overdue.length,
        blocked: blocked.length,
        high_priority: highPriority.length,
        completed_yesterday: completedYesterday.length,
      },
      timestamp: now.toISOString(),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate digest' }, { status: 500 })
  }
}
