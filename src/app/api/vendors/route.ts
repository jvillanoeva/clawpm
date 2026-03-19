import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const VALID_VENDOR_TYPES = new Set([
  'seguridad_privada', 'servicio_medico', 'extintores', 'sanitarios',
  'generadores', 'carpas', 'pirotecnia', 'drones', 'juegos_mecanicos',
  'dro', 'f_and_b', 'audio_iluminacion',
])

const ALLOWED_FIELDS = new Set([
  'company_name', 'contact_name', 'whatsapp', 'email',
  'vendor_type', 'rate_card', 'performance_notes',
])

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const supabase = createServerClient()
    let query = supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false })

    if (type) {
      if (!VALID_VENDOR_TYPES.has(type)) {
        return NextResponse.json({ error: `Invalid vendor type. Valid types: ${[...VALID_VENDOR_TYPES].join(', ')}` }, { status: 400 })
      }
      query = query.eq('vendor_type', type)
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.company_name || typeof body.company_name !== 'string' || body.company_name.trim().length === 0) {
      return NextResponse.json({ error: 'company_name is required' }, { status: 400 })
    }
    if (body.company_name.trim().length > 200) {
      return NextResponse.json({ error: 'company_name must be 200 characters or less' }, { status: 400 })
    }
    if (!body.vendor_type || !VALID_VENDOR_TYPES.has(body.vendor_type)) {
      return NextResponse.json({ error: `vendor_type is required and must be one of: ${[...VALID_VENDOR_TYPES].join(', ')}` }, { status: 400 })
    }
    if (body.email !== undefined && typeof body.email === 'string' && !body.email.includes('@')) {
      return NextResponse.json({ error: 'email must be a valid email address' }, { status: 400 })
    }
    if (body.rate_card !== undefined && (typeof body.rate_card !== 'object' || body.rate_card === null || Array.isArray(body.rate_card))) {
      return NextResponse.json({ error: 'rate_card must be a JSON object' }, { status: 400 })
    }

    const insert: Record<string, unknown> = {}
    for (const key of Object.keys(body)) {
      if (ALLOWED_FIELDS.has(key)) {
        insert[key] = typeof body[key] === 'string' ? body[key].trim() : body[key]
      }
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('vendors')
      .insert(insert)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 })
  }
}
