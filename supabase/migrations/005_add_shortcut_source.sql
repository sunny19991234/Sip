-- 005_add_shortcut_source.sql
-- Home screen app shortcuts (long-press icoon) loggen via /log?ml=..&src=shortcut,
-- naast de bestaande NFC-route. Aparte source-waarde zodat NFC- en
-- shortcut-taps in de data te onderscheiden blijven.
BEGIN;

ALTER TABLE drink_log DROP CONSTRAINT drink_log_source_check;
ALTER TABLE drink_log ADD CONSTRAINT drink_log_source_check
  CHECK (source IN ('ui', 'nfc', 'manual', 'shortcut'));

COMMIT;
