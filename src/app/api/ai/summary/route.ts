import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { subDays, formatISO } from 'date-fns'

export async function GET() {
  try {
    const supabase = createServerClient()
    const now = new Date()
    const todayStr = formatISO(now, { representation: 'date' })
    const sevenDaysAgo = formatISO(subDays(now, 7), { representation: 'date' })

    const [projectsResult, tasksResult] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*, project:projects(id, name)').order('created_at', { ascending: false }),
    ])

    const projects = projectsResult.data || []
    const tasks = tasksResult.data || []

    const overdueTasks = tasks.filter(t => t.deadline && t.deadline < todayStr && t.status !== 'done')
    const highPriorityTasks = tasks.filter(t => (t.priority === 'high' || t.priority === 'urgent') && t.status !== 'done')
    const stalledTasks = tasks.filter(t => t.status === 'in_progress' && t.updated_at < sevenDaysAgo + 'T00:00:00Z')
    const blockedTasks = tasks.filter(t => t.status === 'blocked')

    const statusCounts = tasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const priorityCounts = tasks.reduce((acc, t) => {
      acc[t.priority] = (acc[t.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      summary: {
        total_projects: projects.length,
        projects_by_status: projects.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        total_tasks: tasks.length,
        tasks_by_status: statusCounts,
        tasks_by_priority: priorityCounts,
      },
      overdue_tasks: overdueTasks.map(t => ({
        id: t.id, title: t.title, priority: t.priority, deadline: t.deadline,
        project_name: t.project?.name, status: t.status,
      })),
      high_priority_tasks: highPriorityTasks.map(t => ({
        id: t.id, title: t.title, priority: t.priority, status: t.status,
        deadline: t.deadline, project_name: t.project?.name,
      })),
      stalled_tasks: stalledTasks.map(t => ({
        id: t.id, title: t.title, priority: t.priority, status: t.status,
        last_updated: t.updated_at, project_name: t.project?.name,
      })),
      blocked_tasks: blockedTasks.map(t => ({
        id: t.id, title: t.title, priority: t.priority, deadline: t.deadline,
        project_name: t.project?.name,
      })),
      projects: projects.map(p => ({
        id: p.id, name: p.name, status: p.status, description: p.description,
        task_count: tasks.filter(t => t.project_id === p.id).length,
        done_count: tasks.filter(t => t.project_id === p.id && t.status === 'done').length,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}
