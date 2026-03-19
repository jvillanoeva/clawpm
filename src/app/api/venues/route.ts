import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const ALLOWED_FIELDS = new Set([
  'name', 'address', 'alcaldia', 'capacity',
  'contact_name', 'contact_whatsapp',
  'handles_permitting', 'handles_bars', 'handles_ticketing', 'ticketing_platform',
  'rigging_plot_url', 'base_layout_url', 'uso_de_suelo_url',
  'aviso_funcionamiento_url', 'pipc_authorization_url', 'standard_contract_url',
  'noise_restrictions', 'load_in_access', 'parking', 'special_requirements',
])

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    if (body.name.trim().length > 200) {
      return NextResponse.json({ error: 'name must be 200 characters or less' }, { status: 400 })
    }
    if (body.capacity !== undefined && (typeof body.capacity !== 'number' || body.capacity < 0)) {
      return NextResponse.json({ error: 'capacity must be a non-negative number' }, { status: 400 })
    }
    for (const boolField of ['handles_permitting', 'handles_bars', 'handles_ticketing']) {
      if (body[boolField] !== undefined && typeof body[boolField] !== 'boolean') {
        return NextResponse.json({ error: `${boolField} must be a boolean` }, { status: 400 })
      }
    }

    const insert: Record<string, unknown> = {}
    for (const key of Object.keys(body)) {
      if (ALLOWED_FIELDS.has(key)) {
        insert[key] = typeof body[key] === 'string' ? body[key].trim() : body[key]
      }
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('venues')
      .insert(insert)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create venue' }, { status: 500 })
  }
}
