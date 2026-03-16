import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { sendProjectNotification } from '@/lib/slack'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    if (!projectId || !message) {
      return NextResponse.json({ error: 'projectId and message required' }, { status: 400 })
    }
    if (message.length > 4000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: project } = await supabase
      .from('projects')
      .select('slack_channel_id, slack_channel_webhook')
      .eq('id', projectId)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const success = await sendProjectNotification(project, message)
    if (!success) {
      return NextResponse.json({ error: 'No Slack channel configured for this project' }, { status: 400 })
    }
    return NextResponse.json({ success })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
