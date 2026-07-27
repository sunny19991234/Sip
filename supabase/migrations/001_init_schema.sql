-- 001_init_schema.sql
BEGIN;

-- extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- settings
CREATE TABLE IF NOT EXISTS settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  daily_target_ml integer NOT NULL DEFAULT 3000,
  day_start_hour integer NOT NULL DEFAULT 4,
  timezone text NOT NULL DEFAULT 'Europe/Amsterdam',
  quiet_hours jsonb NOT NULL DEFAULT '{"from":"22:00","to":"08:00"}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- containers (snelknoppen)
CREATE TABLE IF NOT EXISTS containers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  volume_ml integer NOT NULL,
  sort_order integer,
  is_nfc_default boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- drink_log
CREATE TABLE IF NOT EXISTS drink_log (
  id uuid PRIMARY KEY, -- client-generated
  user_id uuid NOT NULL REFERENCES auth.users(id),
  amount_ml integer NOT NULL CHECK (amount_ml >= 1 AND amount_ml <= 5000),
  source text NOT NULL CHECK (source IN ('ui','nfc','manual')),
  logged_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_drink_log_user_logged_at ON drink_log (user_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_containers_user ON containers (user_id);

-- Enable RLS and policies (allow only rows belonging to the authenticated user)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_select ON settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY settings_insert ON settings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY settings_update ON settings FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY settings_delete ON settings FOR DELETE USING (user_id = auth.uid());

ALTER TABLE containers ENABLE ROW LEVEL SECURITY;
CREATE POLICY containers_select ON containers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY containers_insert ON containers FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY containers_update ON containers FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY containers_delete ON containers FOR DELETE USING (user_id = auth.uid());

ALTER TABLE drink_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY drink_log_select ON drink_log FOR SELECT USING (user_id = auth.uid() AND deleted_at IS NULL);
CREATE POLICY drink_log_insert ON drink_log FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY drink_log_update ON drink_log FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY drink_log_delete ON drink_log FOR DELETE USING (user_id = auth.uid());

-- View: daily_intake
CREATE OR REPLACE VIEW daily_intake AS
SELECT
  dl.user_id,
  (
    (
      (dl.logged_at AT TIME ZONE s.timezone)
      - (s.day_start_hour || ' hours')::interval
    )::date
  ) AS day,
  SUM(dl.amount_ml) FILTER (WHERE dl.deleted_at IS NULL) AS total_ml,
  s.daily_target_ml AS target_ml,
  (SUM(dl.amount_ml) FILTER (WHERE dl.deleted_at IS NULL) >= s.daily_target_ml) AS goal_met
FROM drink_log dl
JOIN settings s ON s.user_id = dl.user_id
GROUP BY dl.user_id,
  (
    (
      (dl.logged_at AT TIME ZONE s.timezone)
      - (s.day_start_hour || ' hours')::interval
    )::date
  ),
  s.daily_target_ml;

-- Seed: standaard snelknoppen voor alle bestaande users (idempotent)
-- Glas 250 ml (sort_order 1)
INSERT INTO containers (user_id, name, volume_ml, sort_order, is_nfc_default)
SELECT u.id, 'Glas 250 ml', 250, 1, false
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM containers c WHERE c.user_id = u.id AND c.name = 'Glas 250 ml'
);

-- Fles 750 ml (sort_order 2)
INSERT INTO containers (user_id, name, volume_ml, sort_order, is_nfc_default)
SELECT u.id, 'Fles 750 ml', 750, 2, true
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM containers c WHERE c.user_id = u.id AND c.name = 'Fles 750 ml'
);

-- Liter 1000 ml (sort_order 3)
INSERT INTO containers (user_id, name, volume_ml, sort_order, is_nfc_default)
SELECT u.id, 'Liter 1000 ml', 1000, 3, false
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM containers c WHERE c.user_id = u.id AND c.name = 'Liter 1000 ml'
);

COMMIT;
