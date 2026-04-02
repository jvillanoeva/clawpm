-- ============================================================
-- 007_m1b_phase2 — Populate structured columns from pnls.data JSONB,
-- create shows rows, create ticket_phases rows.
-- pnls.data is NOT dropped here — Phase 3 waits for Jorge's sign-off.
-- Applied: 2026-04-01
-- ============================================================

-- 1. Populate pnls structured columns from data JSONB
UPDATE pnls SET
  artist_fee_usd    = NULLIF(data->>'artistFeeUSD', '')::numeric,
  exchange_rate     = NULLIF(data->>'exchangeRate', '')::numeric,
  withholding_pct   = NULLIF(data->>'withholding', '')::numeric,
  deal_type         = NULLIF(data->>'dealType', ''),
  deal_pct          = NULLIF(data->>'dealPct', '')::numeric,
  ticketing_comm_pct = NULLIF(data->>'ticketingCommPct', '')::numeric,
  fb_avg_ga         = NULLIF(data->>'fbAvgGA', '')::numeric,
  fb_cash_pct       = NULLIF(data->>'fbCashPct', '')::numeric,
  fb_ops_cost_pct   = NULLIF(data->>'fbOpsCostPct', '')::numeric,
  table_count       = NULLIF(data->>'tableCount', '')::integer,
  table_min_spend   = NULLIF(data->>'tableMinSpend', '')::numeric,
  table_costs       = NULLIF(data->>'tableCosts', '')::numeric,
  sponsorship       = NULLIF(data->>'sponsorship', '')::numeric,
  venue_rev_pct     = NULLIF(data->>'venueRevPct', '')::numeric,
  venue_rev_enabled = CASE
    WHEN data->>'venueRevEnabled' IS NULL THEN NULL
    ELSE (data->>'venueRevEnabled')::boolean
  END,
  hall_rent_pct     = NULLIF(data->>'hallRentPct', '')::numeric,
  hall_rent_enabled = CASE
    WHEN data->>'hallRentEnabled' IS NULL THEN NULL
    ELSE (data->>'hallRentEnabled')::boolean
  END,
  sacm_pct          = NULLIF(data->>'sacmPct', '')::numeric,
  isep_pct          = NULLIF(data->>'isepPct', '')::numeric,
  costs_data        = data->'costsData',
  comps             = NULLIF(data->>'comps', '')::integer
WHERE data IS NOT NULL;

-- 2. Seed shows table from pnls
--    Stage mapping: settlement pnls → settlement, all others → pre-production
INSERT INTO shows (slug, artist, venue_name, show_date, capacity, show_type, stage)
SELECT
  p.slug,
  COALESCE(NULLIF(TRIM(p.data->>'eventName'), ''), p.name) AS artist,
  NULLIF(TRIM(p.data->>'venue'), '')                        AS venue_name,
  NULLIF(NULLIF(TRIM(p.data->>'showDate'), ''), 'null')::date AS show_date,
  NULLIF(p.data->>'capacity', '')::integer                  AS capacity,
  'promoter'                                                AS show_type,
  CASE p.phase
    WHEN 'settlement' THEN 'settlement'
    ELSE 'pre-production'
  END                                                       AS stage
FROM pnls p
WHERE p.slug IS NOT NULL
ON CONFLICT (slug) DO UPDATE SET
  artist     = EXCLUDED.artist,
  venue_name = EXCLUDED.venue_name,
  show_date  = EXCLUDED.show_date,
  capacity   = EXCLUDED.capacity,
  stage      = EXCLUDED.stage;

-- 3. Seed ticket_phases from pnls.data.phases array (idempotent)
DELETE FROM ticket_phases WHERE pnl_id IN (SELECT id FROM pnls WHERE data->'phases' IS NOT NULL);

INSERT INTO ticket_phases (pnl_id, name, price, qty, sort_order)
SELECT
  p.id,
  TRIM(phase_row->>'name')          AS name,
  (phase_row->>'price')::numeric    AS price,
  (phase_row->>'qty')::integer      AS qty,
  (ord - 1)                         AS sort_order
FROM pnls p,
     jsonb_array_elements(p.data->'phases') WITH ORDINALITY AS t(phase_row, ord)
WHERE p.data->'phases' IS NOT NULL
  AND jsonb_typeof(p.data->'phases') = 'array';
