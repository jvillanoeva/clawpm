import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    const project_id = typeof body.project_id === 'string' ? body.project_id.trim() : ''
    const task_id = typeof body.task_id === 'string' ? body.task_id.trim() : null
    const note = typeof body.note === 'string' ? body.note.trim() : ''

    if (!project_id || !note) {
      return NextResponse.json({ error: 'project_id and note required' }, { status: 400 })
    }
    if (note.length > 10000) {
      return NextResponse.json({ error: 'Note too long' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('ai_notes')
      .insert({ project_id, task_id: task_id || null, note })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save AI note' }, { status: 500 })
  }
}
