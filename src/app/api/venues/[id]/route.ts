import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const ALLOWED_UPDATE_FIELDS = new Set([
  'name', 'address', 'alcaldia', 'capacity',
  'contact_name', 'contact_whatsapp',
  'handles_permitting', 'handles_bars', 'handles_ticketing', 'ticketing_platform',
  'rigging_plot_url', 'base_layout_url', 'uso_de_suelo_url',
  'aviso_funcionamiento_url', 'pipc_authorization_url', 'standard_contract_url',
  'noise_restrictions', 'load_in_access', 'parking', 'special_requirements',
])

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch venue' }, { status: 500 })
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
    if (body.capacity !== undefined && (typeof body.capacity !== 'number' || body.capacity < 0)) {
      return NextResponse.json({ error: 'capacity must be a non-negative number' }, { status: 400 })
    }
    for (const boolField of ['handles_permitting', 'handles_bars', 'handles_ticketing']) {
      if (body[boolField] !== undefined && typeof body[boolField] !== 'boolean') {
        return NextResponse.json({ error: `${boolField} must be a boolean` }, { status: 400 })
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

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('venues')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to update venue' }, { status: 500 })
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
      .from('venues')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete venue' }, { status: 500 })
  }
}
