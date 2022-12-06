ALTER TABLE "event_pricing" ADD COLUMN tags jsonb default '[]';

ALTER TABLE "ticket" ADD COLUMN tags jsonb default '[]';
