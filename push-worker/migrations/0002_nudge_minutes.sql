-- RITUEL v1.5: user-selectable interval for optional follow-up push (30 / 45 / 60 / 90 minutes).
-- Production Worker also applies this change idempotently in ensureSchema().
ALTER TABLE devices ADD COLUMN nudge_minutes INTEGER NOT NULL DEFAULT 45;
