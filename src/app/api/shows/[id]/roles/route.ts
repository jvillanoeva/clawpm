import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const VALID_ROLE_TYPES = new Set([
  'head_of_operations', 'promotor', 'productor', 'productor_tecnico',
  'gestor', 'bar_ops_lead', 'access_coordinator', 'brand_coordinator',
  'hospitality_lead',
])

const ALLOWED_FIELDS = new Set([
  'role_type', 'person_name', 'whatsapp', 'email',
])

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('show_roles')
      .select('*')
      .eq('show_id', id)
      .order('role_type', { ascending: true })

    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!body.role_type || !VALID_ROLE_TYPES.has(body.role_type)) {
      return NextResponse.json({ error: `role_type is required and must be one of: ${[...VALID_ROLE_TYPES].join(', ')}` }, { status: 400 })
    }
    if (!body.person_name || typeof body.person_name !== 'string' || body.person_name.trim().length === 0) {
      return NextResponse.json({ error: 'person_name is required' }, { status: 400 })
    }
    if (body.person_name.trim().length > 200) {
      return NextResponse.json({ error: 'person_name must be 200 characters or less' }, { status: 400 })
    }
    if (body.email !== undefined && typeof body.email === 'string' && !body.email.includes('@')) {
      return NextResponse.json({ error: 'email must be a valid email address' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Verify show exists
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('id')
      .eq('id', id)
      .single()

    if (showError || !show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    }

    const insert: Record<string, unknown> = { show_id: id }
    for (const key of Object.keys(body)) {
      if (ALLOWED_FIELDS.has(key)) {
        insert[key] = typeof body[key] === 'string' ? body[key].trim() : body[key]
      }
    }

    const { data, error } = await supabase
      .from('show_roles')
      .insert(insert)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: showId } = await params
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: 'id (role id) is required in the request body' }, { status: 400 })
    }

    if (body.role_type !== undefined && !VALID_ROLE_TYPES.has(body.role_type)) {
      return NextResponse.json({ error: `role_type must be one of: ${[...VALID_ROLE_TYPES].join(', ')}` }, { status: 400 })
    }
    if (body.person_name !== undefined) {
      if (typeof body.person_name !== 'string' || body.person_name.trim().length === 0) {
        return NextResponse.json({ error: 'person_name must be a non-empty string' }, { status: 400 })
      }
      if (body.person_name.trim().length > 200) {
        return NextResponse.json({ error: 'person_name must be 200 characters or less' }, { status: 400 })
      }
    }
    if (body.email !== undefined && typeof body.email === 'string' && !body.email.includes('@')) {
      return NextResponse.json({ error: 'email must be a valid email address' }, { status: 400 })
    }

    const update: Record<string, unknown> = {}
    for (const key of Object.keys(body)) {
      if (ALLOWED_FIELDS.has(key)) {
        update[key] = typeof body[key] === 'string' ? body[key].trim() : body[key]
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('show_roles')
      .update(update)
      .eq('id', body.id)
      .eq('show_id', showId)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: showId } = await params
    const { searchParams } = new URL(request.url)
    const roleId = searchParams.get('role_id')

    if (!roleId) {
      return NextResponse.json({ error: 'role_id query parameter is required' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('show_roles')
      .delete()
      .eq('id', roleId)
      .eq('show_id', showId)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 })
  }
}
