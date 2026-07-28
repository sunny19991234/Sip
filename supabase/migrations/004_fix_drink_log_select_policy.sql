-- 004_fix_drink_log_select_policy.sql
-- Postgres past bij UPDATE ook de SELECT-policy toe op de resulterende rij: een
-- soft-delete (deleted_at wordt niet-null) voldoet daardoor nooit aan
-- "deleted_at IS NULL", wat elke undo laat mislukken met een RLS-violation.
-- Filtering op deleted_at gebeurt al op query-niveau (.is('deleted_at', null))
-- en in de daily_intake-view; RLS hoeft alleen eigenaarschap te bewaken.
BEGIN;

DROP POLICY IF EXISTS drink_log_select ON drink_log;
CREATE POLICY drink_log_select ON drink_log FOR SELECT USING (user_id = auth.uid());

COMMIT;
