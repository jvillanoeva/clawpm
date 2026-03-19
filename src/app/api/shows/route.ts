import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const VALID_STATUSES = new Set(['setup', 'pre-production', 'production', 'show_day', 'wrap'])

const ALLOWED_FIELDS = new Set([
  'name', 'show_date', 'venue_id', 'status', 'setup_answers',
])

// Maps condition_key values to a function that returns true when the task should be ACTIVE.
// If a condition_key is not in this map, the task defaults to active.
const CONDITION_EVALUATORS: Record<string, (answers: Record<string, boolean>) => boolean> = {
  IF_NOT_VENUE_PERMITTING: (a) => !a.venue_permitting,
  IF_NOT_VENUE_BARS:       (a) => !a.venue_bars,
  IF_NOT_VENUE_TICKETING:  (a) => !a.venue_ticketing,
  IF_HAS_PIROTECNIA:       (a) => !!a.has_pirotecnia,
  IF_HAS_DRONES:           (a) => !!a.has_drones,
  IF_HAS_JUEGOS_MECANICOS: (a) => !!a.has_juegos_mecanicos,
  IF_HAS_CARPAS:           (a) => !!a.has_carpas,
  IF_HAS_GENERADORES:      (a) => !!a.has_generadores,
  IF_HAS_SANITARIOS:       (a) => !!a.has_sanitarios,
  IF_HAS_F_AND_B:          (a) => !!a.has_f_and_b,
  IF_HAS_DRO:              (a) => !!a.has_dro,
}

function isConditionActive(
  conditionKey: string | null,
  setupAnswers: Record<string, boolean>
): boolean {
  if (!conditionKey) return true
  const evaluator = CONDITION_EVALUATORS[conditionKey]
  if (!evaluator) return true // unknown condition → default active
  return evaluator(setupAnswers)
}

function subtractDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00')
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('shows')
      .select('*, venues(name)')
      .order('show_date', { ascending: true })

    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch shows' }, { status: 500 })
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
    if (!body.show_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.show_date)) {
      return NextResponse.json({ error: 'show_date is required in YYYY-MM-DD format' }, { status: 400 })
    }
    if (body.status !== undefined && !VALID_STATUSES.has(body.status)) {
      return NextResponse.json({ error: `status must be one of: ${[...VALID_STATUSES].join(', ')}` }, { status: 400 })
    }
    if (body.setup_answers !== undefined && (typeof body.setup_answers !== 'object' || body.setup_answers === null || Array.isArray(body.setup_answers))) {
      return NextResponse.json({ error: 'setup_answers must be a JSON object' }, { status: 400 })
    }

    const supabase = createServerClient()

    // --- Step 1: Fetch venue if provided, merge attributes into setup_answers ---
    let mergedAnswers: Record<string, boolean> = body.setup_answers ? { ...body.setup_answers } : {}

    if (body.venue_id) {
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .select('*')
        .eq('id', body.venue_id)
        .single()

      if (venueError || !venue) {
        return NextResponse.json({ error: 'venue_id references a venue that does not exist' }, { status: 400 })
      }

      // Merge venue booleans into setup_answers (venue wins for its own capabilities)
      if (venue.handles_permitting) mergedAnswers.venue_permitting = true
      if (venue.handles_bars)       mergedAnswers.venue_bars = true
      if (venue.handles_ticketing)  mergedAnswers.venue_ticketing = true
    }

    // --- Step 2: Create the show record ---
    const insert: Record<string, unknown> = {}
    for (const key of Object.keys(body)) {
      if (ALLOWED_FIELDS.has(key)) {
        insert[key] = typeof body[key] === 'string' ? body[key].trim() : body[key]
      }
    }
    if (!insert.status) insert.status = 'setup'
    insert.setup_answers = mergedAnswers // store the merged version

    const { data: show, error: showError } = await supabase
      .from('shows')
      .insert(insert)
      .select()
      .single()

    if (showError) throw showError

    // --- Step 3: Fetch all checklist templates ---
    const { data: templates, error: templateError } = await supabase
      .from('checklist_templates')
      .select('*')
      .order('sort_order', { ascending: true })

    if (templateError) throw templateError

    // --- Step 4 & 5: Evaluate conditions and create show_tasks ---
    let activeCount = 0
    let naCount = 0

    if (templates && templates.length > 0) {
      const tasks = templates.map((tpl: Record<string, unknown>) => {
        const active = isConditionActive(tpl.condition_key as string | null, mergedAnswers)
        if (active) activeCount++
        else naCount++

        return {
          show_id: show.id,
          template_item_id: tpl.id,
          title: tpl.title,
          description: tpl.description,
          section: tpl.section,
          assigned_role: tpl.default_responsible_role,
          status: active ? 'pendiente' : 'na',
          deadline: tpl.default_days_before
            ? subtractDays(body.show_date, tpl.default_days_before as number)
            : null,
          condition: tpl.condition_key,
          sort_order: tpl.sort_order,
        }
      })

      const { error: tasksError } = await supabase
        .from('show_tasks')
        .insert(tasks)

      if (tasksError) throw tasksError
    }

    return NextResponse.json(
      { ...show, tasks_created: { active: activeCount, na: naCount, total: activeCount + naCount } },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: 'Failed to create show' }, { status: 500 })
  }
}
