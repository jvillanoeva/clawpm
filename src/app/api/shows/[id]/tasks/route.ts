import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const VALID_STATUSES = new Set(['pendiente', 'en_proceso', 'ok', 'na'])

const VALID_SECTIONS = new Set([
  'tramites_gobierno', 'responsivas_proveedores', 'planos_y_programas',
  'bars_fnb', 'access_ticketing', 'brands_partnerships',
  'produccion_tecnica', 'post_layout_cascade',
])

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section')
    const status = searchParams.get('status')
    const assignedRole = searchParams.get('assigned_role')

    const supabase = createServerClient()
    let query = supabase
      .from('show_tasks')
      .select('*')
      .eq('show_id', id)
      .order('sort_order', { ascending: true })

    if (section) {
      if (!VALID_SECTIONS.has(section)) {
        return NextResponse.json({ error: `Invalid section. Valid sections: ${[...VALID_SECTIONS].join(', ')}` }, { status: 400 })
      }
      query = query.eq('section', section)
    }

    if (status) {
      if (!VALID_STATUSES.has(status)) {
        return NextResponse.json({ error: `Invalid status. Valid statuses: ${[...VALID_STATUSES].join(', ')}` }, { status: 400 })
      }
      query = query.eq('status', status)
    }

    if (assignedRole) {
      query = query.eq('assigned_role', assignedRole)
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}
