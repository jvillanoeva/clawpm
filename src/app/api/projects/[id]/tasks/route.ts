import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { sendProjectNotification, formatTaskCreatedMessage } from '@/lib/slack'

const VALID_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent'])
const VALID_STATUSES = new Set(['todo', 'in_progress', 'blocked', 'done'])

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', params.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    // Validate and whitelist fields
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : null
    const priority = VALID_PRIORITIES.has(body.priority) ? body.priority : 'medium'
    const status = VALID_STATUSES.has(body.status) ? body.status : 'todo'
    const deadline = typeof body.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.deadline) ? body.deadline : null

    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    if (title.length > 500) return NextResponse.json({ error: 'Title must be 500 characters or less' }, { status: 400 })

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({ project_id: params.id, title, description, priority, status, deadline })
      .select()
      .single()
    if (error) throw error

    // Send Slack notification
    const { data: project } = await supabase
      .from('projects')
      .select('name, slack_channel_id, slack_channel_webhook')
      .eq('id', params.id)
      .single()
    if (project) {
      const message = formatTaskCreatedMessage({ taskTitle: title, priority, projectName: project.name, deadline })
      await sendProjectNotification(project, message)
    }

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
