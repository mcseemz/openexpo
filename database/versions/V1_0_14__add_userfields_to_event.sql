ALTER TABLE "event" ADD COLUMN user_fields jsonb default '[]'::json;

COMMENT ON COLUMN "event"."user_fields" IS 'array of mandaory fields that user have to fill to register on event';
