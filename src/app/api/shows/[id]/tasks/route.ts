import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const VALID_STATUSES = new Set(['pendiente', 'ok', 'bloqueado', 'na'])

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section')
    const status = searchParams.get('status')

    const supabase = createServerClient()
    let query = supabase
      .from('show_tasks')
      .select('*')
      .eq('show_id', id)
      .order('created_at', { ascending: true })

    if (section) {
      query = query.eq('section', section)
    }

    if (status) {
      if (!VALID_STATUSES.has(status)) {
        return NextResponse.json(
          { error: `status must be one of: ${Array.from(VALID_STATUSES).join(', ')}` },
          { status: 400 }
        )
      }
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}
