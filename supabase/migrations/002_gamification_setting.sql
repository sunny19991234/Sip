-- 002_gamification_setting.sql
BEGIN;

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS gamification_enabled boolean NOT NULL DEFAULT false;

COMMIT;
