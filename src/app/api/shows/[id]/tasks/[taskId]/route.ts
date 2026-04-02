import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const VALID_STATUSES = new Set(['pendiente', 'ok', 'bloqueado', 'na'])
const VALID_UPDATED_BY = new Set(['browser', 'clawbot'])

const ALLOWED_UPDATE_FIELDS = new Set([
  'status', 'assigned_to', 'assigned_whatsapp', 'deadline', 'notes', 'last_updated_by',
])

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id, taskId } = await params
    const body = await request.json()

    if (body.status !== undefined && !VALID_STATUSES.has(body.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${Array.from(VALID_STATUSES).join(', ')}` },
        { status: 400 }
      )
    }
    if (body.last_updated_by !== undefined && !VALID_UPDATED_BY.has(body.last_updated_by)) {
      return NextResponse.json(
        { error: `last_updated_by must be one of: ${Array.from(VALID_UPDATED_BY).join(', ')}` },
        { status: 400 }
      )
    }
    if (body.deadline !== undefined && body.deadline !== null && !/^\d{4}-\d{2}-\d{2}$/.test(body.deadline)) {
      return NextResponse.json({ error: 'deadline must be in YYYY-MM-DD format' }, { status: 400 })
    }

    const update: Record<string, unknown> = {}
    for (const key of Object.keys(body)) {
      if (ALLOWED_UPDATE_FIELDS.has(key)) {
        update[key] = typeof body[key] === 'string' ? body[key].trim() : body[key]
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Always stamp last_updated_at
    update.last_updated_at = new Date().toISOString()

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('show_tasks')
      .update(update)
      .eq('id', taskId)
      .eq('show_id', id) // scope to the show — prevents cross-show task mutation
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}
