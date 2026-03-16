import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const ALLOWED_UPDATE_FIELDS = new Set(['title', 'description', 'priority', 'status', 'deadline'])
const VALID_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent'])
const VALID_STATUSES = new Set(['todo', 'in_progress', 'blocked', 'done'])

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('tasks')
      .select('*, project:projects(*)')
      .eq('id', params.id)
      .single()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    // Whitelist fields
    const update: Record<string, unknown> = {}
    for (const key of Object.keys(body)) {
      if (ALLOWED_UPDATE_FIELDS.has(key)) {
        update[key] = body[key]
      }
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Validate specific fields
    if ('title' in update) {
      if (typeof update.title !== 'string' || !update.title.toString().trim()) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
      }
      update.title = (update.title as string).trim()
    }
    if ('priority' in update && !VALID_PRIORITIES.has(update.priority as string)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
    }
    if ('status' in update && !VALID_STATUSES.has(update.status as string)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    if ('deadline' in update && update.deadline !== null) {
      if (typeof update.deadline !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(update.deadline)) {
        return NextResponse.json({ error: 'Deadline must be YYYY-MM-DD format' }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(update)
      .eq('id', params.id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const { error } = await supabase.from('tasks').delete().eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
