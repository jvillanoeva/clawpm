import { sendProjectNotification } from './slack'
import { createServerClient } from './supabase/server'

export type NotificationChannel = 'slack' | 'email'

interface NotificationPayload {
  projectId: string
  taskId?: string
  message: string
  channels?: NotificationChannel[]
}

/**
 * Route a notification to configured channels for a project.
 * Currently supports Slack; email is stubbed for future implementation.
 */
export async function routeNotification(payload: NotificationPayload): Promise<{ channel: string; success: boolean }[]> {
  const supabase = createServerClient()
  const { data: project } = await supabase
    .from('projects')
    .select('slack_channel_id, slack_channel_webhook')
    .eq('id', payload.projectId)
    .single()

  const channels = payload.channels || ['slack']
  const results: { channel: string; success: boolean }[] = []

  for (const channel of channels) {
    let success = false

    switch (channel) {
      case 'slack':
        if (project) {
          success = await sendProjectNotification(project, payload.message)
        }
        break
      case 'email':
        // Stubbed for future implementation
        console.log(`[notifications] Email channel not yet implemented. Message: ${payload.message.slice(0, 100)}`)
        success = false
        break
    }

    // Log the notification
    await supabase.from('notification_log').insert({
      task_id: payload.taskId || null,
      project_id: payload.projectId,
      channel,
      message: payload.message,
      success,
    })

    results.push({ channel, success })
  }

  return results
}
