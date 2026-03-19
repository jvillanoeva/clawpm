import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const VALID_VENDOR_TYPES = new Set([
  'seguridad_privada', 'servicio_medico', 'extintores', 'sanitarios',
  'generadores', 'carpas', 'pirotecnia', 'drones', 'juegos_mecanicos',
  'dro', 'f_and_b', 'audio_iluminacion',
])

const ALLOWED_UPDATE_FIELDS = new Set([
  'company_name', 'contact_name', 'whatsapp', 'email',
  'vendor_type', 'rate_card', 'performance_notes',
])

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch vendor' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (body.company_name !== undefined) {
      if (typeof body.company_name !== 'string' || body.company_name.trim().length === 0) {
        return NextResponse.json({ error: 'company_name must be a non-empty string' }, { status: 400 })
      }
      if (body.company_name.trim().length > 200) {
        return NextResponse.json({ error: 'company_name must be 200 characters or less' }, { status: 400 })
      }
    }
    if (body.vendor_type !== undefined && !VALID_VENDOR_TYPES.has(body.vendor_type)) {
      return NextResponse.json({ error: `vendor_type must be one of: ${[...VALID_VENDOR_TYPES].join(', ')}` }, { status: 400 })
    }
    if (body.email !== undefined && typeof body.email === 'string' && !body.email.includes('@')) {
      return NextResponse.json({ error: 'email must be a valid email address' }, { status: 400 })
    }
    if (body.rate_card !== undefined && (typeof body.rate_card !== 'object' || body.rate_card === null || Array.isArray(body.rate_card))) {
      return NextResponse.json({ error: 'rate_card must be a JSON object' }, { status: 400 })
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
      .from('vendors')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 })
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
      .from('vendors')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 })
  }
}
