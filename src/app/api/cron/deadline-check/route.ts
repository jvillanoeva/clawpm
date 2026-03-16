import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { sendProjectNotification, formatDeadlinePassedMessage } from '@/lib/slack'
import { formatISO, subHours } from 'date-fns'

export async function GET(request: Request) {
  // Bearer token auth
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServerClient()
    const todayStr = formatISO(new Date(), { representation: 'date' })
    const dedupeWindow = formatISO(subHours(new Date(), 24))

    const { data: overdueTasks, error } = await supabase
      .from('tasks')
      .select('*, project:projects(name, slack_channel_id, slack_channel_webhook)')
      .lt('deadline', todayStr)
      .not('status', 'eq', 'done')
      .not('deadline', 'is', null)

    if (error) throw error

    const notifications = []
    for (const task of (overdueTasks || [])) {
      // Deduplication: skip if notified in the last 24 hours
      if (task.last_notified_at && task.last_notified_at > dedupeWindow) {
        continue
      }

      const message = formatDeadlinePassedMessage({
        taskTitle: task.title,
        priority: task.priority,
        projectName: task.project?.name || 'Unknown',
        deadline: task.deadline,
      })
      const sent = await sendProjectNotification(task.project || {}, message)

      if (sent) {
        // Update last_notified_at for deduplication
        await supabase.from('tasks').update({ last_notified_at: new Date().toISOString() }).eq('id', task.id)

        // Log the notification
        await supabase.from('notification_log').insert({
          task_id: task.id,
          project_id: task.project_id,
          channel: 'slack',
          message,
          success: true,
        })
      }

      notifications.push({ taskId: task.id, taskTitle: task.title, sent })
    }

    return NextResponse.json({
      checked: overdueTasks?.length || 0,
      notifications,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Deadline check failed' }, { status: 500 })
  }
}
