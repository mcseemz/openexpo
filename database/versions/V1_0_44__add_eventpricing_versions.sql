ALTER TABLE event_pricing ADD version jsonb DEFAULT '[]'::jsonb;
COMMENT ON COLUMN event_pricing.version IS 'versions used to control changes';