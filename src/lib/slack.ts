export async function sendSlackNotification(webhookUrl: string, message: string): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    })
    return response.ok
  } catch (error) {
    console.error('Slack notification failed:', error)
    return false
  }
}

export async function createSlackChannel(projectName: string): Promise<{ channelId: string | null; channelName: string | null }> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return { channelId: null, channelName: null }

  const channelName = 'proj-' + projectName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 74)

  try {
    const res = await fetch('https://slack.com/api/conversations.create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: channelName, is_private: false }),
    })
    const data = await res.json()
    if (data.ok) {
      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: data.channel.id,
          text: `*${projectName}* project channel created. Task updates will appear here.`,
        }),
      })
      return { channelId: data.channel.id, channelName: data.channel.name }
    }
    console.error('Slack channel creation failed:', data.error)
    return { channelId: null, channelName: null }
  } catch (error) {
    console.error('Slack channel creation error:', error)
    return { channelId: null, channelName: null }
  }
}

export async function postToSlackChannel(channelId: string, message: string): Promise<boolean> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return false
  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel: channelId, text: message }),
    })
    const data = await res.json()
    return data.ok
  } catch {
    return false
  }
}

/**
 * Send a notification to a project's Slack channel.
 * Prefers channel ID (API-based), falls back to webhook URL, then env fallback.
 */
export async function sendProjectNotification(
  project: { slack_channel_id?: string | null; slack_channel_webhook?: string | null },
  message: string
): Promise<boolean> {
  if (project.slack_channel_id) {
    return postToSlackChannel(project.slack_channel_id, message)
  }
  const webhookUrl = project.slack_channel_webhook || process.env.SLACK_WEBHOOK_URL
  if (webhookUrl) {
    return sendSlackNotification(webhookUrl, message)
  }
  return false
}

export function formatTaskCreatedMessage(params: {
  taskTitle: string
  priority: string
  projectName: string
  deadline: string | null
}): string {
  const deadlineStr = params.deadline ? `\nDeadline: ${params.deadline}` : ''
  return `*New Task Created*\n*${params.taskTitle}*\nPriority: ${params.priority.toUpperCase()}\nProject: ${params.projectName}${deadlineStr}`
}

export function formatDeadlinePassedMessage(params: {
  taskTitle: string
  priority: string
  projectName: string
  deadline: string
}): string {
  return `*Task Deadline Passed*\n*${params.taskTitle}*\nPriority: ${params.priority.toUpperCase()}\nProject: ${params.projectName}\nWas due: ${params.deadline}`
}
