import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createSlackChannel } from '@/lib/slack'

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    // Validate and whitelist fields
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : null
    const status = ['active', 'paused', 'done'].includes(body.status) ? body.status : 'active'
    const slack_channel_webhook =
      typeof body.slack_channel_webhook === 'string' && body.slack_channel_webhook.startsWith('https://')
        ? body.slack_channel_webhook.trim()
        : null

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (name.length > 200) return NextResponse.json({ error: 'Name must be 200 characters or less' }, { status: 400 })

    // Auto-create Slack channel for the project
    const { channelId } = await createSlackChannel(name)

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        status,
        slack_channel_id: channelId || null,
        slack_channel_webhook: slack_channel_webhook || null,
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
