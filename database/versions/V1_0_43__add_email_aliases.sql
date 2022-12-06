ALTER TABLE person ADD email_alias jsonb default '{}';
COMMENT ON COLUMN person.email_alias IS 'aliases used for indiviual events';
