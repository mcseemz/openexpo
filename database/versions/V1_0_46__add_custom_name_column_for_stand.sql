ALTER TABLE "stand" ADD custom_name varchar UNIQUE NULL;
COMMENT ON COLUMN "stand".custom_name IS 'name for custom routing';