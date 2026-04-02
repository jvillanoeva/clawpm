import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// ============================================================
// Hardcoded checklists — stamped on show creation.
// Tasks irrelevant to a specific show are marked 'na' by Jorge.
// ============================================================

type ChecklistTask = { section: string; task_name: string }

const CHECKLISTS: Record<string, ChecklistTask[]> = {
  promoter: [
    // Booking
    { section: 'Booking', task_name: 'Contract received from agency' },
    { section: 'Booking', task_name: 'Contract signed and returned' },
    { section: 'Booking', task_name: 'Booking fee (BF) paid — proof sent to agency' },
    { section: 'Booking', task_name: '50% artist fee invoiced' },
    { section: 'Booking', task_name: '50% artist fee paid' },
    // Production
    { section: 'Production', task_name: 'Tech rider received from artist' },
    { section: 'Production', task_name: 'Tech rider reviewed and approved' },
    { section: 'Production', task_name: 'Stage plot confirmed' },
    { section: 'Production', task_name: 'Backline confirmed' },
    // Marketing
    { section: 'Marketing', task_name: 'Flyer design brief sent to designer' },
    { section: 'Marketing', task_name: 'Artist assets received (photo, font, artwork) from agency' },
    { section: 'Marketing', task_name: 'Flyer draft sent to agency for approval' },
    { section: 'Marketing', task_name: 'Flyer approved by agency' },
    { section: 'Marketing', task_name: 'Flyer published / on-sale announcement live' },
    // Trámites / Venue
    { section: 'Trámites / Venue', task_name: 'Venue permit confirmed' },
    { section: 'Trámites / Venue', task_name: 'Rigging weights (memoria de cálculo) sent to venue' },
    { section: 'Trámites / Venue', task_name: 'SACM/ISEP filed' },
    { section: 'Trámites / Venue', task_name: 'Government permit' },
    { section: 'Trámites / Venue', task_name: 'Withholding tax (international artist)' },
    // Hospitalidad
    { section: 'Hospitalidad', task_name: 'Hospitality rider reviewed' },
    { section: 'Hospitalidad', task_name: 'Catering confirmed' },
    { section: 'Hospitalidad', task_name: 'Hotel confirmed' },
    { section: 'Hospitalidad', task_name: 'Ground transport confirmed' },
  ],
  bar_operator: [
    // Menu & Pricing
    { section: 'Menu & Pricing', task_name: 'Menu items confirmed' },
    { section: 'Menu & Pricing', task_name: 'Pricing sheet approved' },
    { section: 'Menu & Pricing', task_name: 'Menu design brief sent to designer' },
    { section: 'Menu & Pricing', task_name: 'Menu design approved' },
    { section: 'Menu & Pricing', task_name: 'Pricing loaded to POS' },
    { section: 'Menu & Pricing', task_name: 'Staff scheduled and confirmed' },
    { section: 'Menu & Pricing', task_name: 'Print / signage order confirmed' },
    // Bar Setup / Production
    { section: 'Bar Setup / Production', task_name: 'Bar layout confirmed with venue' },
    { section: 'Bar Setup / Production', task_name: 'Bar equipment and supplies confirmed' },
    { section: 'Bar Setup / Production', task_name: 'Ice and perishables delivery confirmed' },
    { section: 'Bar Setup / Production', task_name: 'POS and payment terminals set up' },
    { section: 'Bar Setup / Production', task_name: 'Opening float confirmed' },
    // Trámites / Venue
    { section: 'Trámites / Venue', task_name: 'Alcohol permit confirmed' },
    { section: 'Trámites / Venue', task_name: 'Health permit confirmed' },
    // Settlement
    { section: 'Settlement', task_name: 'Cash sales reconciled' },
    { section: 'Settlement', task_name: 'Card sales reconciled' },
    { section: 'Settlement', task_name: 'Bar expenses logged' },
    { section: 'Settlement', task_name: 'Settlement report sent' },
  ],
}

const VALID_STAGES = new Set(['exploring', 'offer', 'contracted', 'pre-production', 'settlement'])
const VALID_SHOW_TYPES = new Set(['promoter', 'bar_operator'])

export async function GET() {
  try {
    const supabase = createServerClient()

    // Fetch all shows with task health counts in one shot
    const { data: shows, error } = await supabase
      .from('shows')
      .select(`
        id, slug, artist, venue_name, show_date, on_sale_date,
        capacity, deal_type, show_type, stage, workspace_path,
        created_at, updated_at,
        show_tasks(status)
      `)
      .order('show_date', { ascending: true, nullsFirst: false })

    if (error) throw error

    const result = shows.map((show) => {
      const tasks = (show.show_tasks ?? []) as { status: string }[]
      const active = tasks.filter((t) => t.status !== 'na')
      const blocked = active.filter((t) => t.status === 'bloqueado').length
      const pending = active.filter((t) => t.status === 'pendiente').length

      let health: 'red' | 'yellow' | 'green' = 'green'
      if (blocked > 0) health = 'red'
      else if (pending > 0) health = 'yellow'

      const { show_tasks: _, ...showData } = show
      return {
        ...showData,
        health,
        task_counts: {
          total: tasks.length,
          active: active.length,
          blocked,
          pending,
          ok: active.filter((t) => t.status === 'ok').length,
          na: tasks.filter((t) => t.status === 'na').length,
        },
      }
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch shows' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Required fields
    if (!body.slug || typeof body.slug !== 'string' || body.slug.trim().length === 0) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 })
    }
    if (!/^[a-z0-9-]+$/.test(body.slug.trim())) {
      return NextResponse.json({ error: 'slug must be lowercase letters, numbers, and hyphens only' }, { status: 400 })
    }
    if (!body.artist || typeof body.artist !== 'string' || body.artist.trim().length === 0) {
      return NextResponse.json({ error: 'artist is required' }, { status: 400 })
    }
    if (body.show_type !== undefined && !VALID_SHOW_TYPES.has(body.show_type)) {
      return NextResponse.json({ error: `show_type must be one of: ${Array.from(VALID_SHOW_TYPES).join(', ')}` }, { status: 400 })
    }
    if (body.stage !== undefined && !VALID_STAGES.has(body.stage)) {
      return NextResponse.json({ error: `stage must be one of: ${Array.from(VALID_STAGES).join(', ')}` }, { status: 400 })
    }
    if (body.show_date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(body.show_date)) {
      return NextResponse.json({ error: 'show_date must be in YYYY-MM-DD format' }, { status: 400 })
    }
    if (body.on_sale_date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(body.on_sale_date)) {
      return NextResponse.json({ error: 'on_sale_date must be in YYYY-MM-DD format' }, { status: 400 })
    }
    if (body.capacity !== undefined && (!Number.isInteger(body.capacity) || body.capacity < 0)) {
      return NextResponse.json({ error: 'capacity must be a non-negative integer' }, { status: 400 })
    }

    const show_type: string = body.show_type ?? 'promoter'

    const supabase = createServerClient()

    // Create show
    const { data: show, error: showError } = await supabase
      .from('shows')
      .insert({
        slug:           body.slug.trim(),
        artist:         body.artist.trim(),
        venue_name:     body.venue_name?.trim() ?? null,
        show_date:      body.show_date ?? null,
        on_sale_date:   body.on_sale_date ?? null,
        capacity:       body.capacity ?? null,
        deal_type:      body.deal_type?.trim() ?? null,
        show_type,
        stage:          body.stage ?? 'exploring',
        workspace_path: body.workspace_path?.trim() ?? null,
      })
      .select()
      .single()

    if (showError) {
      if (showError.code === '23505') {
        return NextResponse.json({ error: `slug '${body.slug.trim()}' already exists` }, { status: 409 })
      }
      throw showError
    }

    // Stamp checklist
    const checklist = CHECKLISTS[show_type] ?? CHECKLISTS.promoter
    const tasks = checklist.map((item) => ({
      show_id:   show.id,
      section:   item.section,
      task_name: item.task_name,
      status:    'pendiente',
    }))

    const { error: tasksError } = await supabase.from('show_tasks').insert(tasks)
    if (tasksError) throw tasksError

    return NextResponse.json(
      { ...show, tasks_created: tasks.length },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: 'Failed to create show' }, { status: 500 })
  }
}
