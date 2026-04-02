-- ============================================================
-- 008_m1b_phase3 — Drop pnls.data and pnls.phase
-- All values migrated to structured columns (006/007).
-- Code confirmed clean before this migration was applied.
-- Applied: 2026-04-01
-- ============================================================

ALTER TABLE pnls
  DROP COLUMN IF EXISTS data,
  DROP COLUMN IF EXISTS phase;
