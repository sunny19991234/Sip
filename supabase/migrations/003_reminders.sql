-- 003_reminders.sql
BEGIN;

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS reminders_enabled boolean NOT NULL DEFAULT false;

-- Tijdstippen voor herinneringen. expected_ml/enabled zijn voorbereid op de
-- fase 2 push-logica (F-40 t/m F-45) en worden nu nog niet gebruikt.
CREATE TABLE IF NOT EXISTS reminder_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  at_time time NOT NULL,
  expected_ml integer,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminder_rules_user ON reminder_rules (user_id);

ALTER TABLE reminder_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY reminder_rules_select ON reminder_rules FOR SELECT USING (user_id = auth.uid());
CREATE POLICY reminder_rules_insert ON reminder_rules FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY reminder_rules_update ON reminder_rules FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY reminder_rules_delete ON reminder_rules FOR DELETE USING (user_id = auth.uid());

COMMIT;
