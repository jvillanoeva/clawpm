import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('ai_notes')
      .select('*, project:projects(name), task:tasks(title)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (projectId) query = query.eq('project_id', projectId)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch AI notes' }, { status: 500 })
  }
}
