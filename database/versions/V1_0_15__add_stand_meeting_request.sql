ALTER TABLE "personnel" ADD COLUMN visible boolean default false;
COMMENT ON COLUMN "personnel"."visible" IS 'personnel visibility flag for visitors';

ALTER TYPE activity_visibility ADD VALUE 'visitor_proposed';
/* [note: 'visitor proposes a meeting'] */

