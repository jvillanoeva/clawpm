export type ProjectStatus = 'active' | 'paused' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'

export interface Project {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  slack_channel_id: string | null
  slack_channel_webhook: string | null
  user_id: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  deadline: string | null
  last_notified_at: string | null
  recurrence_rule: string | null
  recurrence_parent_id: string | null
  user_id: string | null
  created_at: string
  updated_at: string
  project?: Project
}

export interface AiNote {
  id: string
  project_id: string
  task_id: string | null
  note: string
  user_id: string | null
  created_at: string
}

export interface NotificationLog {
  id: string
  task_id: string | null
  project_id: string | null
  channel: 'slack' | 'email'
  message: string
  sent_at: string
  success: boolean
}
