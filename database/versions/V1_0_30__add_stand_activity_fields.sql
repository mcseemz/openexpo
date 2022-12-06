ALTER TABLE "stand" ADD COLUMN IF NOT EXISTS contacts jsonb default '{}';

ALTER TABLE "activity" ADD COLUMN IF NOT EXISTS records jsonb default '[]';
