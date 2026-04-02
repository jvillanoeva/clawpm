-- ============================================================
-- 003_shows_system.sql — Phase 1, Step 1.1
-- Adds: venues, vendors, vendor_documents, shows, show_roles,
--        show_tasks, show_task_documents, show_task_chase_log,
--        checklist_templates, triggers
-- Existing tables (projects, tasks, ai_notes) are untouched.
-- ============================================================

-- ------------------------------------------------------------
-- 1. VENUES
-- ------------------------------------------------------------
CREATE TABLE venues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  alcaldia TEXT,
  capacity INTEGER,
  contact_name TEXT,
  contact_whatsapp TEXT,
  contact_email TEXT,
  handles_permitting BOOLEAN NOT NULL DEFAULT false,
  handles_bars BOOLEAN NOT NULL DEFAULT false,
  handles_ticketing BOOLEAN NOT NULL DEFAULT false,
  ticketing_platform TEXT,
  rigging_plot_url TEXT,
  base_layout_url TEXT,
  uso_de_suelo_url TEXT,
  aviso_funcionamiento_url TEXT,
  pipc_authorization_url TEXT,
  standard_contract_url TEXT,
  noise_restrictions TEXT,
  load_in_access TEXT,
  parking TEXT,
  special_requirements TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. VENDORS
-- ------------------------------------------------------------
CREATE TABLE vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  whatsapp TEXT,
  email TEXT,
  vendor_type TEXT NOT NULL CHECK (vendor_type IN (
    'seguridad_privada', 'servicio_medico', 'extintores',
    'sanitarios', 'generadores', 'carpas', 'pirotecnia',
    'drones', 'juegos_mecanicos', 'dro', 'f_and_b',
    'audio_iluminacion', 'other'
  )),
  rate_card JSONB DEFAULT '{}',
  performance_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3. VENDOR DOCUMENTS
-- ------------------------------------------------------------
CREATE TABLE vendor_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  expires_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 4. SHOWS
-- ------------------------------------------------------------
CREATE TABLE shows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  show_date DATE NOT NULL,
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN (
    'setup', 'pre-production', 'production', 'show_day', 'wrap'
  )),
  setup_answers JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 5. SHOW ROLES
-- ------------------------------------------------------------
CREATE TABLE show_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL,
  person_name TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT
);

-- ------------------------------------------------------------
-- 6. CHECKLIST TEMPLATES
-- (before show_tasks, since show_tasks references template_item_id)
-- ------------------------------------------------------------
CREATE TABLE checklist_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  layer TEXT NOT NULL CHECK (layer IN ('pc', 'production')),
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  default_responsible_role TEXT,
  default_days_before INTEGER NOT NULL DEFAULT 14,
  condition_key TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ------------------------------------------------------------
-- 7. SHOW TASKS
-- ------------------------------------------------------------
CREATE TABLE show_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  template_item_id UUID REFERENCES checklist_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_role TEXT,
  assigned_vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN (
    'pendiente', 'en_proceso', 'ok', 'na'
  )),
  deadline DATE,
  condition TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  section TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 8. SHOW TASK DOCUMENTS
-- ------------------------------------------------------------
CREATE TABLE show_task_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  show_task_id UUID NOT NULL REFERENCES show_tasks(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 9. SHOW TASK CHASE LOG
-- ------------------------------------------------------------
CREATE TABLE show_task_chase_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  show_task_id UUID NOT NULL REFERENCES show_tasks(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  message TEXT NOT NULL,
  whatsapp_number TEXT,
  message_sid TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 10. TRIGGERS (cascade rules)
-- ------------------------------------------------------------
CREATE TABLE triggers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_task_template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  creates_task_template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE
);

-- ============================================================
-- INDEXES
-- ============================================================

-- venues
CREATE INDEX idx_venues_name ON venues(name);

-- vendors
CREATE INDEX idx_vendors_vendor_type ON vendors(vendor_type);
CREATE INDEX idx_vendors_company_name ON vendors(company_name);

-- vendor_documents
CREATE INDEX idx_vendor_documents_vendor_id ON vendor_documents(vendor_id);
CREATE INDEX idx_vendor_documents_expires_at ON vendor_documents(expires_at);

-- shows
CREATE INDEX idx_shows_show_date ON shows(show_date);
CREATE INDEX idx_shows_status ON shows(status);
CREATE INDEX idx_shows_venue_id ON shows(venue_id);

-- show_roles
CREATE INDEX idx_show_roles_show_id ON show_roles(show_id);

-- checklist_templates
CREATE INDEX idx_checklist_templates_layer ON checklist_templates(layer);
CREATE INDEX idx_checklist_templates_condition_key ON checklist_templates(condition_key);

-- show_tasks
CREATE INDEX idx_show_tasks_show_id ON show_tasks(show_id);
CREATE INDEX idx_show_tasks_status ON show_tasks(status);
CREATE INDEX idx_show_tasks_deadline ON show_tasks(deadline);
CREATE INDEX idx_show_tasks_assigned_vendor_id ON show_tasks(assigned_vendor_id);
CREATE INDEX idx_show_tasks_template_item_id ON show_tasks(template_item_id);

-- show_task_documents
CREATE INDEX idx_show_task_documents_show_task_id ON show_task_documents(show_task_id);

-- show_task_chase_log
CREATE INDEX idx_show_task_chase_log_show_task_id ON show_task_chase_log(show_task_id);
CREATE INDEX idx_show_task_chase_log_created_at ON show_task_chase_log(created_at);

-- triggers
CREATE INDEX idx_triggers_trigger_task_template_id ON triggers(trigger_task_template_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- (reuses update_updated_at_column() from 001_initial.sql)
-- ============================================================

CREATE TRIGGER update_venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shows_updated_at
  BEFORE UPDATE ON shows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_show_tasks_updated_at
  BEFORE UPDATE ON show_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_task_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_task_chase_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE triggers ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage all show-related data
-- (single-user system for now; tighten with user_id scoping later)
CREATE POLICY "Authenticated users manage venues" ON venues
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));
CREATE POLICY "Authenticated users manage vendors" ON vendors
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));
CREATE POLICY "Authenticated users manage vendor_documents" ON vendor_documents
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));
CREATE POLICY "Authenticated users manage shows" ON shows
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));
CREATE POLICY "Authenticated users manage show_roles" ON show_roles
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));
CREATE POLICY "Authenticated users manage checklist_templates" ON checklist_templates
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));
CREATE POLICY "Authenticated users manage show_tasks" ON show_tasks
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));
CREATE POLICY "Authenticated users manage show_task_documents" ON show_task_documents
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));
CREATE POLICY "Authenticated users manage show_task_chase_log" ON show_task_chase_log
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));
CREATE POLICY "Authenticated users manage triggers" ON triggers
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));
