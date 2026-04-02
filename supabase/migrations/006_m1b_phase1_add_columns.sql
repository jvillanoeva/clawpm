-- ============================================================
-- 006_m1b_phase1 — Add structured columns to pnls, create ticket_phases
-- pnls.data JSONB is untouched until Phase 3 (after Jorge confirms).
-- Applied: 2026-04-01
-- ============================================================

-- 1. Structured columns on pnls (all nullable — existing rows unaffected)
ALTER TABLE pnls
  ADD COLUMN IF NOT EXISTS artist_fee_usd     NUMERIC,
  ADD COLUMN IF NOT EXISTS exchange_rate       NUMERIC,
  ADD COLUMN IF NOT EXISTS withholding_pct     NUMERIC,
  ADD COLUMN IF NOT EXISTS deal_type           TEXT,
  ADD COLUMN IF NOT EXISTS deal_pct            NUMERIC,
  ADD COLUMN IF NOT EXISTS ticketing_comm_pct  NUMERIC,
  ADD COLUMN IF NOT EXISTS fb_avg_ga           NUMERIC,
  ADD COLUMN IF NOT EXISTS fb_cash_pct         NUMERIC,
  ADD COLUMN IF NOT EXISTS fb_ops_cost_pct     NUMERIC,
  ADD COLUMN IF NOT EXISTS table_count         INTEGER,
  ADD COLUMN IF NOT EXISTS table_min_spend     NUMERIC,
  ADD COLUMN IF NOT EXISTS table_costs         NUMERIC,
  ADD COLUMN IF NOT EXISTS sponsorship         NUMERIC,
  ADD COLUMN IF NOT EXISTS venue_rev_pct       NUMERIC,
  ADD COLUMN IF NOT EXISTS venue_rev_enabled   BOOLEAN,
  ADD COLUMN IF NOT EXISTS hall_rent_pct       NUMERIC,
  ADD COLUMN IF NOT EXISTS hall_rent_enabled   BOOLEAN,
  ADD COLUMN IF NOT EXISTS sacm_pct            NUMERIC,
  ADD COLUMN IF NOT EXISTS isep_pct            NUMERIC,
  ADD COLUMN IF NOT EXISTS costs_data          JSONB,
  ADD COLUMN IF NOT EXISTS comps               INTEGER;

-- 2. ticket_phases — normalised pricing tiers
CREATE TABLE IF NOT EXISTS ticket_phases (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pnl_id     UUID NOT NULL REFERENCES pnls(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  price      NUMERIC NOT NULL DEFAULT 0,
  qty        INTEGER NOT NULL DEFAULT 0,
  sold       INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_phases_pnl_id ON ticket_phases(pnl_id);

ALTER TABLE ticket_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage ticket_phases" ON ticket_phases
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));
