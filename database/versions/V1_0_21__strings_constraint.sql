DROP INDEX IF EXISTS strings_uq_index;

ALTER TABLE strings
ADD CONSTRAINT strings_uq UNIQUE (ref, ref_id, category, language);
