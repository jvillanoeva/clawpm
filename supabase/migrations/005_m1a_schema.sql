-- ============================================================
-- 005_m1a_schema.sql — ClawPM Data Foundation
-- Creates: shows, show_tasks, show_files
-- (003/004 were never applied to production — old design, skipped)
-- Applied: 2026-04-01
-- ============================================================

-- ============================================================
-- 1. SHOWS
-- ============================================================
CREATE TABLE shows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  artist TEXT NOT NULL,
  venue_name TEXT,
  show_date DATE,
  on_sale_date DATE,
  capacity INTEGER,
  deal_type TEXT,
  show_type TEXT NOT NULL DEFAULT 'promoter' CHECK (show_type IN ('promoter', 'bar_operator')),
  stage TEXT NOT NULL DEFAULT 'exploring' CHECK (stage IN (
    'exploring', 'offer', 'contracted', 'pre-production', 'settlement'
  )),
  workspace_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. SHOW_TASKS
-- ============================================================
CREATE TABLE show_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  task_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN (
    'pendiente', 'ok', 'bloqueado', 'na'
  )),
  assigned_to TEXT,
  assigned_whatsapp TEXT,
  deadline DATE,
  notes TEXT,
  last_updated_by TEXT CHECK (last_updated_by IN ('browser', 'clawbot')),
  last_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. SHOW_FILES
-- ============================================================
CREATE TABLE show_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  task_id UUID REFERENCES show_tasks(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  doc_type TEXT,
  original_filename TEXT,
  received_from TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_shows_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_shows_updated_at
  BEFORE UPDATE ON shows
  FOR EACH ROW EXECUTE FUNCTION update_shows_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_shows_slug ON shows(slug);
CREATE INDEX idx_shows_stage ON shows(stage);
CREATE INDEX idx_shows_show_type ON shows(show_type);
CREATE INDEX idx_show_tasks_show_id ON show_tasks(show_id);
CREATE INDEX idx_show_tasks_status ON show_tasks(status);
CREATE INDEX idx_show_tasks_section ON show_tasks(section);
CREATE INDEX idx_show_files_show_id ON show_files(show_id);
CREATE INDEX idx_show_files_task_id ON show_files(task_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage shows" ON shows
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));
CREATE POLICY "Authenticated users manage show_tasks" ON show_tasks
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));
CREATE POLICY "Authenticated users manage show_files" ON show_files
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));
