import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const VALID_STATUSES = new Set(['setup', 'pre-production', 'production', 'show_day', 'wrap'])

const ALLOWED_UPDATE_FIELDS = new Set([
  'name', 'show_date', 'venue_id', 'status', 'setup_answers',
])

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('shows')
      .select('*, venues(*), show_roles(*)')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch show' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 })
      }
      if (body.name.trim().length > 200) {
        return NextResponse.json({ error: 'name must be 200 characters or less' }, { status: 400 })
      }
    }
    if (body.show_date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(body.show_date)) {
      return NextResponse.json({ error: 'show_date must be in YYYY-MM-DD format' }, { status: 400 })
    }
    if (body.status !== undefined && !VALID_STATUSES.has(body.status)) {
      return NextResponse.json({ error: `status must be one of: ${Array.from(VALID_STATUSES).join(', ')}` }, { status: 400 })
    }
    if (body.setup_answers !== undefined && (typeof body.setup_answers !== 'object' || body.setup_answers === null || Array.isArray(body.setup_answers))) {
      return NextResponse.json({ error: 'setup_answers must be a JSON object' }, { status: 400 })
    }

    const supabase = createServerClient()

    if (body.venue_id) {
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .select('id')
        .eq('id', body.venue_id)
        .single()

      if (venueError || !venue) {
        return NextResponse.json({ error: 'venue_id references a venue that does not exist' }, { status: 400 })
      }
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

    const { data, error } = await supabase
      .from('shows')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to update show' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('shows')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete show' }, { status: 500 })
  }
}
