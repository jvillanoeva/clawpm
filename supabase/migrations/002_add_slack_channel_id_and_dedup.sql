-- Add slack_channel_id column to projects (stores Slack API channel ID like C0123456)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS slack_channel_id TEXT;

-- Add last_notified_at to tasks for notification deduplication
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMPTZ;

-- Add user_id columns for auth (nullable for backward compat, will be required via RLS)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE ai_notes ADD COLUMN IF NOT EXISTS user_id UUID;

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_notes_user_id ON ai_notes(user_id);

-- Add recurring task support
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

-- Drop old permissive policies and create proper user-scoped RLS policies
DROP POLICY IF EXISTS "Allow all for service role" ON projects;
DROP POLICY IF EXISTS "Allow all for service role" ON tasks;
DROP POLICY IF EXISTS "Allow all for service role" ON ai_notes;

-- Projects: users see their own + null user_id (legacy data)
CREATE POLICY "Users manage own projects" ON projects FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- Tasks: users see tasks in their projects + null user_id
CREATE POLICY "Users manage own tasks" ON tasks FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- AI notes: users see notes in their projects + null user_id
CREATE POLICY "Users manage own notes" ON ai_notes FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- Service role bypass (for cron jobs and server-side operations)
CREATE POLICY "Service role bypass projects" ON projects FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass tasks" ON tasks FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass notes" ON ai_notes FOR ALL
  USING (auth.role() = 'service_role');

-- Notification log table for routing layer
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('slack', 'email')),
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_notification_log_task_id ON notification_log(task_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON notification_log(sent_at);
