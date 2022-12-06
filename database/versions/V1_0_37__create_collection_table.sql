CREATE TABLE collection (
	id SERIAL PRIMARY KEY,
	custom_name varchar UNIQUE NULL,
	ref string_entity NOT NULL,
	tags jsonb NOT NULL DEFAULT '[]'::jsonb,
	event int4 NULL,
	stand int4 NULL,
	CONSTRAINT collection_event_fkey FOREIGN KEY ("event") REFERENCES public."event"(id)
);

ALTER TYPE string_entity ADD VALUE IF NOT EXISTS 'collection';

COMMENT ON COLUMN collection.ref IS 'type of collection content. Available entities: user, activity, stand';
COMMENT ON COLUMN collection.tags IS 'an array of tags by which the content will be grouped';