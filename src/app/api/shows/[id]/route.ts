import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const VALID_STAGES = new Set(['exploring', 'offer', 'contracted', 'pre-production', 'settlement'])
const VALID_SHOW_TYPES = new Set(['promoter', 'bar_operator'])

const ALLOWED_UPDATE_FIELDS = new Set([
  'artist', 'venue_name', 'show_date', 'on_sale_date',
  'capacity', 'deal_type', 'show_type', 'stage', 'workspace_path',
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
      .select('*, show_tasks(*)')
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

    if (body.artist !== undefined) {
      if (typeof body.artist !== 'string' || body.artist.trim().length === 0) {
        return NextResponse.json({ error: 'artist must be a non-empty string' }, { status: 400 })
      }
    }
    if (body.show_date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(body.show_date)) {
      return NextResponse.json({ error: 'show_date must be in YYYY-MM-DD format' }, { status: 400 })
    }
    if (body.on_sale_date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(body.on_sale_date)) {
      return NextResponse.json({ error: 'on_sale_date must be in YYYY-MM-DD format' }, { status: 400 })
    }
    if (body.stage !== undefined && !VALID_STAGES.has(body.stage)) {
      return NextResponse.json({ error: `stage must be one of: ${Array.from(VALID_STAGES).join(', ')}` }, { status: 400 })
    }
    if (body.show_type !== undefined && !VALID_SHOW_TYPES.has(body.show_type)) {
      return NextResponse.json({ error: `show_type must be one of: ${Array.from(VALID_SHOW_TYPES).join(', ')}` }, { status: 400 })
    }
    if (body.capacity !== undefined && (!Number.isInteger(body.capacity) || body.capacity < 0)) {
      return NextResponse.json({ error: 'capacity must be a non-negative integer' }, { status: 400 })
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

    const supabase = createServerClient()
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
