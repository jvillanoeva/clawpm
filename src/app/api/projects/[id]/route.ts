import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const ALLOWED_UPDATE_FIELDS = new Set(['name', 'description', 'status', 'slack_channel_webhook'])
const VALID_STATUSES = new Set(['active', 'paused', 'done'])

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .single()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    // Whitelist fields
    const update: Record<string, unknown> = {}
    for (const key of Object.keys(body)) {
      if (ALLOWED_UPDATE_FIELDS.has(key)) {
        update[key] = body[key]
      }
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Validate specific fields
    if ('name' in update) {
      if (typeof update.name !== 'string' || !update.name.toString().trim()) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      }
      update.name = (update.name as string).trim()
    }
    if ('status' in update && !VALID_STATUSES.has(update.status as string)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    if ('slack_channel_webhook' in update && update.slack_channel_webhook !== null) {
      if (typeof update.slack_channel_webhook !== 'string' || !update.slack_channel_webhook.toString().startsWith('https://')) {
        return NextResponse.json({ error: 'Webhook must be an HTTPS URL' }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('projects')
      .update(update)
      .eq('id', params.id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const { error } = await supabase.from('projects').delete().eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
