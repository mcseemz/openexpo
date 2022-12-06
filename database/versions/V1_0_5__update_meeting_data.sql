alter table activity
  alter column value type jsonb using to_jsonb(value);