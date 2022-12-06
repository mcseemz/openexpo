CREATE TABLE "discount" (
  "id" varchar(32) PRIMARY KEY,
  "company" int NOT NULL,
  "name" varchar NOT NULL DEFAULT '',
  "is_active" boolean NOT NULL DEFAULT true, 
  "definition" jsonb NOT NULL DEFAULT '{}'
);
ALTER TABLE "discount" ADD FOREIGN KEY ("company") REFERENCES "company" ("id");

ALTER TABLE "company" ADD COLUMN is_partner boolean DEFAULT false;

ALTER TABLE "event" ADD COLUMN discount varchar(32);
ALTER TABLE "event" ADD FOREIGN KEY ("discount") REFERENCES "discount" ("id");