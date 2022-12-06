CREATE TYPE "event_pricing_status_type" AS ENUM (
  'enabled',
  'disabled',
  'archived'
);

ALTER TABLE event_pricing ADD status event_pricing_status_type DEFAULT 'disabled';
COMMENT ON COLUMN event_pricing.status IS 'status is used for control whether it is enabled or not. "archived" means further editing is impossible';

UPDATE event_pricing SET status = CASE WHEN is_enabled = true THEN 'enabled'::event_pricing_status_type ELSE 'disabled'::event_pricing_status_type END;

ALTER TABLE event_pricing DROP COLUMN is_enabled;