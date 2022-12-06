ALTER TABLE "event" ADD COLUMN tags_json jsonb default '[]';
UPDATE "event" SET tags_json = array_to_json(string_to_array(regexp_replace(regexp_replace(tags,'(\s?,\s?)',','),'(^,)',''),','));
ALTER TABLE "event" DROP COLUMN tags;
ALTER TABLE "event" RENAME COLUMN tags_json TO tags;

ALTER TABLE "activity" ADD COLUMN tags_json jsonb default '[]';
UPDATE "activity" SET tags_json = array_to_json(string_to_array(regexp_replace(regexp_replace(tags,'(\s?,\s?)',','),'(^,)',''),','));
ALTER TABLE "activity" DROP COLUMN tags;
ALTER TABLE "activity" RENAME COLUMN tags_json TO tags;

ALTER TABLE "binaries" ADD COLUMN tags_json jsonb default '[]';
UPDATE "binaries" SET tags_json = array_to_json(string_to_array(regexp_replace(regexp_replace(tags,'(\s?,\s?)',','),'(^,)',''),','));
ALTER TABLE "binaries" DROP COLUMN tags;
ALTER TABLE "binaries" RENAME COLUMN tags_json TO tags;

ALTER TABLE "company" ADD COLUMN tags_json jsonb default '[]';
UPDATE "company" SET tags_json = array_to_json(string_to_array(regexp_replace(regexp_replace(tags,'(\s?,\s?)',','),'(^,)',''),','));
ALTER TABLE "company" DROP COLUMN tags;
ALTER TABLE "company" RENAME COLUMN tags_json TO tags;

ALTER TABLE "news" ADD COLUMN tags_json jsonb default '[]';
UPDATE "news" SET tags_json = array_to_json(string_to_array(regexp_replace(regexp_replace(tags,'(\s?,\s?)',','),'(^,)',''),','));
ALTER TABLE "news" DROP COLUMN tags;
ALTER TABLE "news" RENAME COLUMN tags_json TO tags;

ALTER TABLE "person" ADD COLUMN tags_json jsonb default '[]';
UPDATE "person" SET tags_json = array_to_json(string_to_array(regexp_replace(regexp_replace(tags,'(\s?,\s?)',','),'(^,)',''),','));
ALTER TABLE "person" DROP COLUMN tags;
ALTER TABLE "person" RENAME COLUMN tags_json TO tags;

ALTER TABLE "stand" ADD COLUMN tags_json jsonb default '[]';
UPDATE "stand" SET tags_json = array_to_json(string_to_array(regexp_replace(regexp_replace(tags,'(\s?,\s?)',','),'(^,)',''),','));
ALTER TABLE "stand" DROP COLUMN tags;
ALTER TABLE "stand" RENAME COLUMN tags_json TO tags;