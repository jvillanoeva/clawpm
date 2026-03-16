# Project Manager

A full-stack project management app built with Next.js 14, Supabase, and Tailwind CSS.

## Features
- Project management with status tracking
- Task board with Kanban view (drag-and-drop)
- Priority and deadline tracking
- Slack notifications for task creation and deadline alerts
- AI summary endpoint for programmatic consumption
- Dashboard with overdue and upcoming tasks

## Setup

### 1. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/001_initial.sql` in the Supabase SQL editor
3. Get your project URL and keys from Project Settings → API

### 2. Environment Variables
Copy `.env.example` to `.env.local` and fill in:
```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/slack/webhook  # optional fallback
```

### 3. Local Development
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Railway Deployment
1. Connect your GitHub repo to Railway
2. Add environment variables in Railway dashboard
3. Railway auto-detects the Dockerfile and deploys

## API Reference

### Projects
- `GET /api/projects` — list all projects
- `POST /api/projects` — create project `{ name, description?, status?, slack_channel_webhook? }`
- `GET /api/projects/:id` — get project
- `PUT /api/projects/:id` — update project
- `DELETE /api/projects/:id` — delete project

### Tasks
- `GET /api/projects/:id/tasks` — list tasks for project
- `POST /api/projects/:id/tasks` — create task `{ title, description?, priority?, status?, deadline? }`
- `GET /api/tasks/:id` — get task
- `PUT /api/tasks/:id` — update task
- `DELETE /api/tasks/:id` — delete task

### Slack
- `POST /api/slack/notify` — `{ projectId, message }` — send Slack message

### AI Integration
- `GET /api/ai/summary` — full JSON summary of all projects/tasks (overdue, high-priority, stalled)
- `POST /api/ai/note` — `{ project_id, task_id?, note }` — log AI observation
- `GET /api/ai/notes?project_id=&limit=` — retrieve AI notes

### Cron
- `GET /api/cron/deadline-check` — check overdue tasks and send Slack alerts (call from external cron)
