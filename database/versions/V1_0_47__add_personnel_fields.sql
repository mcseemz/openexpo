ALTER TABLE "personnel"
    ADD COLUMN IF NOT EXISTS name varchar default null,
    ADD COLUMN IF NOT EXISTS tags jsonb default '[]',
    ADD COLUMN IF NOT EXISTS status user_status_type default 'incomplete';

COMMENT ON COLUMN personnel.name IS 'personnel name if not backed by real person';
COMMENT ON COLUMN personnel.tags IS 'tags to group by for collections and management';
COMMENT ON COLUMN personnel.status IS 'profile status for invited personnel';

ALTER TYPE string_entity ADD VALUE IF NOT EXISTS 'personnel';