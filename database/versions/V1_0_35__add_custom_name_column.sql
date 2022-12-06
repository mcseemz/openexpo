ALTER TABLE "activity" ADD custom_name varchar NULL;
COMMENT ON COLUMN "activity".custom_name IS 'name for custom routing';
