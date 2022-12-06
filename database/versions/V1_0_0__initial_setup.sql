CREATE TYPE "user_status_type" AS ENUM (
  'incomplete',
  'active',
  'blocked',
  'cancelled',
  'anonymized'
);

CREATE TYPE "stand_status_type" AS ENUM (
  'draft',
  'published',
  'inactive',
  'cancelled',
  'template'
);

CREATE TYPE "binaries_status_type" AS ENUM (
  'stub',
  'draft',
  'published',
  'inactive',
  'cancelled',
  'template'
);

CREATE TYPE "binaries_category_type" AS ENUM (
  'branding',
  'binary',
  'video',
  'news'
);

CREATE TYPE "event_status_type" AS ENUM (
  'draft',
  'active',
  'inactive',
  'cancelled',
  'moderation',
  'demo'
);

CREATE TYPE "string_type" AS ENUM (
  'description_short',
  'description_long',
  'about',
  'name'
);

CREATE TYPE "string_entity" AS ENUM (
  'stand',
  'event',
  'company',
  'user',
  'role',
  'activity',
  'capability',
  'dictionary',
  'upload',
  'pricing',
  'stand_invitation',
  'user_invitation',
  'personnel_invitation',
  'meeting',
  'news'
);

CREATE TYPE "chat_status_type" AS ENUM (
  'active',
  'pending',
  'closed'
);

CREATE TYPE "activity_visibility" AS ENUM (
  'stand_internal',
  'stand_public',
  'stand_proposed',
  'stand_promoted',
  'stand_rejected',
  'event_internal',
  'event_published',
  'event_timeframe',
  'cancelled',
  'private_meeting'
);

CREATE TYPE "meeting_preset_type" AS ENUM (
  'webinar',
  'oneonone',
  'team'
);

CREATE TYPE "meeting_service_type" AS ENUM (
  'zoom_embed',
  'twitch_embed',
  'wcs_native'
);

CREATE TYPE "meeting_status_type" AS ENUM (
  'waiting',
  'started',
  'finished'
);

CREATE TYPE "meeting_attendies_type" AS ENUM (
  'presenter',
  'attendee',
  'moderator'
);

CREATE TYPE "event_pricing_plan_type" AS ENUM (
  'split_stand_price',
  'split_ticket_price',
  'upfront_cost',
  'free',
  'sponsorship_price'
);

CREATE TYPE "ticket_payment_status_type" AS ENUM (
  'payed',
  'not_payed',
  'cancelled',
  'refunded'
);

CREATE TYPE "dictionary_category_type" AS ENUM (
  'industry',
  'category',
  'language',
  'country',
  'timezone',
  'imagesize',
  'currency',
  'emailtemplate'
);

CREATE TYPE "confirmation_action_type" AS ENUM (
  'accept',
  'reject',
  'confirm'
);

CREATE TYPE "news_status_type" AS ENUM (
  'draft',
  'published',
  'deleted'
);

CREATE TYPE "news_content_type" AS ENUM (
  'article',
  'announcement'
);

CREATE TYPE "stream_activity_type" AS ENUM (
  'stand_add',
  'stand_left',
  'news_add',
  'activity_add',
  'activity_start',
  'pricing_change',
  'document_add'
);

CREATE TYPE "relation_type" AS ENUM (
  'notes',
  'follow',
  'mark',
  'sponsor'
);

CREATE TABLE "role" (
  "id" SERIAL PRIMARY KEY,
  "name" varchar,
  "grants" jsonb
);

CREATE TABLE "company" (
  "id" SERIAL PRIMARY KEY,
  "name" varchar,
  "email" varchar,
  "website" varchar,
  "tags" varchar,
  "vat" varchar,
  "address" jsonb
);

CREATE TABLE "person" (
  "id" SERIAL PRIMARY KEY,
  "name" varchar,
  "surname" varchar,
  "timezone" numeric DEFAULT 0,
  "email" varchar UNIQUE NOT NULL,
  "status" user_status_type DEFAULT 'incomplete',
  "last_active" timestamp DEFAULT (now()),
  "company" int,
  "role" int,
  "language" varchar,
  "address" jsonb
);

CREATE TABLE "personnel_invitation" (
  "id" SERIAL PRIMARY KEY,
  "person_from" int,
  "email_to" varchar,
  "role" int,
  "position" varchar,
  "company" int
);

CREATE TABLE "personnel" (
  "id" SERIAL PRIMARY KEY,
  "person" int,
  "stand" int,
  "company" int,
  "event" int,
  "platform" int,
  "role" int,
  "position" varchar,
  "assigned_at" timestamp DEFAULT (now())
);

CREATE TABLE "stand" (
  "id" SERIAL PRIMARY KEY,
  "company" int,
  "event" int,
  "timezone" numeric,
  "language" varchar,
  "status" stand_status_type DEFAULT 'draft',
  "tags" varchar
);

CREATE TABLE "binaries" (
  "id" SERIAL PRIMARY KEY,
  "stand" int,
  "event" int,
  "person" int,
  "company" int,
  "news" int,
  "category" binaries_category_type,
  "size" int,
  "filetype" varchar,
  "uploader" int,
  "uploaded" timestamp,
  "last_accessed" timestamp,
  "url" varchar,
  "tags" varchar,
  "status" binaries_status_type DEFAULT 'stub'
);

CREATE TABLE "stand_invitation" (
  "id" SERIAL PRIMARY KEY,
  "email_to" varchar NOT NULL,
  "event_organiser" int NOT NULL,
  "stand_owner_ok" bool DEFAULT false,
  "event_organiser_ok" bool DEFAULT false,
  "event" int NOT NULL
);

CREATE TABLE "event" (
  "id" SERIAL PRIMARY KEY,
  "date_start" timestamp NOT NULL,
  "date_end" timestamp NOT NULL,
  "custom_name" varchar UNIQUE,
  "timezone" numeric,
  "company" int,
  "platform" int,
  "contacts" jsonb DEFAULT '{}',
  "status" event_status_type,
  "tags" varchar,
  "color" varchar
);

CREATE TABLE "platform" (
  "id" SERIAL PRIMARY KEY,
  "name" varchar
);

CREATE TABLE "strings" (
  "id" SERIAL PRIMARY KEY,
  "ref" string_entity,
  "ref_id" int,
  "category" string_type,
  "language" varchar,
  "value" varchar,
  "is_default" boolean
);

CREATE TABLE "notes" (
  "id" SERIAL PRIMARY KEY,
  "ref" string_entity,
  "ref_id" int,
  "person" int,
  "company" int,
  "value" varchar(3000) NOT NULL,
  "is_default" boolean
);

CREATE TABLE "chat" (
  "id" SERIAL PRIMARY KEY,
  "event" int,
  "person_from" int,
  "person_to" int,
  "stand_to" int,
  "stand_from" int,
  "external_id" varchar,
  "started" timestamp DEFAULT (now()),
  "closed" timestamp,
  "num_of_messages" int DEFAULT 0,
  "last_read_by_user" jsonb DEFAULT '{}',
  "updated" timestamp DEFAULT (now()),
  "status" chat_status_type,
  "external_url" varchar
);

CREATE TABLE "activity" (
  "id" SERIAL PRIMARY KEY,
  "stand" int,
  "event" int NOT NULL,
  "meeting" int,
  "start" timestamp,
  "end" timestamp,
  "timezone" numeric,
  "value" varchar,
  "visibility" activity_visibility,
  "creator" int,
  "tags" varchar
);

CREATE TABLE "meeting" (
  "id" SERIAL PRIMARY KEY,
  "url" varchar,
  "chat" int
);

CREATE TABLE "meeting_attendies" (
  "meeting" int,
  "person" int,
  "status" meeting_attendies_type
);

CREATE TABLE "event_pricing" (
  "id" SERIAL PRIMARY KEY,
  "event" int,
  "pricing_plan" event_pricing_plan_type NOT NULL,
  "access_price" numeric,
  "access_currency" varchar,
  "quantity" int,
  "is_enabled" boolean DEFAULT true
);

CREATE TABLE "ticket" (
  "id" SERIAL PRIMARY KEY,
  "event" int NOT NULL,
  "buyer" int,
  "stand" int,
  "pricing" int NOT NULL,
  "date_action" timestamp NOT NULL DEFAULT (now()),
  "payment_status" ticket_payment_status_type NOT NULL DEFAULT 'not_payed'
);

CREATE TABLE "dictionary" (
  "id" SERIAL PRIMARY KEY,
  "category" dictionary_category_type NOT NULL,
  "value" varchar
);

CREATE TABLE "confirmation" (
  "id" varchar(64) NOT NULL,
  "ref" string_entity,
  "ref_id" int,
  "action" confirmation_action_type NOT NULL,
  "should_login" boolean NOT NULL DEFAULT 'false',
  "action_link" varchar,
  "redirect_link" varchar NOT NULL,
  "expiration" timestamp,
  PRIMARY KEY ("id", "action")
);

CREATE TABLE "news" (
  "id" SERIAL PRIMARY KEY,
  "event" int,
  "stand" int,
  "company" int,
  "editor" int,
  "created" timestamp DEFAULT (now()),
  "updated" timestamp DEFAULT (now()),
  "published" timestamp DEFAULT null,
  "status" news_status_type,
  "content_type" news_content_type,
  "images" jsonb,
  "tags" varchar
);

CREATE TABLE "stream" (
  "id" SERIAL PRIMARY KEY,
  "object_ref" string_entity,
  "object_ref_id" int,
  "created" timestamp DEFAULT (now()),
  "action_date" date DEFAULT (now()),
  "action" stream_activity_type,
  "subject_ref" string_entity,
  "subject_ref_id" int,
  "parameter" jsonb
);

CREATE TABLE "stream_packed" (
  "id" SERIAL PRIMARY KEY,
  "object_ref" string_entity,
  "object_ref_id" int,
  "latest" timestamp DEFAULT (now()),
  "action_date" date DEFAULT (now()),
  "action" stream_activity_type,
  "subject_ref" string_entity,
  "parameter" jsonb
);

CREATE TABLE "relation" (
  "id" SERIAL PRIMARY KEY,
  "object_ref" string_entity,
  "object_ref_id" int,
  "operation" relation_type,
  "subject_ref" string_entity,
  "subject_ref_id" int,
  "parameter" jsonb
);

CREATE TABLE "tier" (
  "id" SERIAL PRIMARY KEY,
  "is_enabled" boolean DEFAULT false,
  "default_id" int,
  "logo" varchar,
  "pricing" int,
  "event" int,
  "switches" jsonb
);

ALTER TABLE "person" ADD FOREIGN KEY ("company") REFERENCES "company" ("id");

ALTER TABLE "person" ADD FOREIGN KEY ("role") REFERENCES "role" ("id");

ALTER TABLE "personnel_invitation" ADD FOREIGN KEY ("person_from") REFERENCES "person" ("id");

ALTER TABLE "personnel_invitation" ADD FOREIGN KEY ("role") REFERENCES "role" ("id");

ALTER TABLE "personnel" ADD FOREIGN KEY ("person") REFERENCES "person" ("id");

ALTER TABLE "personnel" ADD FOREIGN KEY ("stand") REFERENCES "stand" ("id");

ALTER TABLE "personnel" ADD FOREIGN KEY ("company") REFERENCES "company" ("id");

ALTER TABLE "personnel" ADD FOREIGN KEY ("event") REFERENCES "event" ("id");

ALTER TABLE "personnel" ADD FOREIGN KEY ("platform") REFERENCES "platform" ("id");

ALTER TABLE "personnel" ADD FOREIGN KEY ("role") REFERENCES "role" ("id");

ALTER TABLE "stand" ADD FOREIGN KEY ("company") REFERENCES "company" ("id");

ALTER TABLE "stand" ADD FOREIGN KEY ("event") REFERENCES "event" ("id");

ALTER TABLE "binaries" ADD FOREIGN KEY ("stand") REFERENCES "stand" ("id");

ALTER TABLE "binaries" ADD FOREIGN KEY ("event") REFERENCES "event" ("id");

ALTER TABLE "binaries" ADD FOREIGN KEY ("person") REFERENCES "person" ("id");

ALTER TABLE "binaries" ADD FOREIGN KEY ("company") REFERENCES "company" ("id");

ALTER TABLE "binaries" ADD FOREIGN KEY ("news") REFERENCES "news" ("id");

ALTER TABLE "binaries" ADD FOREIGN KEY ("uploader") REFERENCES "person" ("id");

ALTER TABLE "stand_invitation" ADD FOREIGN KEY ("event_organiser") REFERENCES "company" ("id");

ALTER TABLE "stand_invitation" ADD FOREIGN KEY ("event") REFERENCES "event" ("id");

ALTER TABLE "event" ADD FOREIGN KEY ("company") REFERENCES "company" ("id");

ALTER TABLE "event" ADD FOREIGN KEY ("platform") REFERENCES "platform" ("id");

ALTER TABLE "notes" ADD FOREIGN KEY ("person") REFERENCES "person" ("id");

ALTER TABLE "notes" ADD FOREIGN KEY ("company") REFERENCES "company" ("id");

ALTER TABLE "chat" ADD FOREIGN KEY ("event") REFERENCES "event" ("id");

ALTER TABLE "chat" ADD FOREIGN KEY ("person_from") REFERENCES "person" ("id");

ALTER TABLE "chat" ADD FOREIGN KEY ("person_to") REFERENCES "person" ("id");

ALTER TABLE "chat" ADD FOREIGN KEY ("stand_to") REFERENCES "stand" ("id");

ALTER TABLE "chat" ADD FOREIGN KEY ("stand_from") REFERENCES "stand" ("id");

ALTER TABLE "activity" ADD FOREIGN KEY ("stand") REFERENCES "stand" ("id");

ALTER TABLE "activity" ADD FOREIGN KEY ("event") REFERENCES "event" ("id");

ALTER TABLE "activity" ADD FOREIGN KEY ("meeting") REFERENCES "meeting" ("id");

ALTER TABLE "activity" ADD FOREIGN KEY ("creator") REFERENCES "person" ("id");

ALTER TABLE "meeting" ADD FOREIGN KEY ("chat") REFERENCES "chat" ("id");

ALTER TABLE "meeting_attendies" ADD FOREIGN KEY ("meeting") REFERENCES "meeting" ("id");

ALTER TABLE "meeting_attendies" ADD FOREIGN KEY ("person") REFERENCES "person" ("id");

ALTER TABLE "event_pricing" ADD FOREIGN KEY ("event") REFERENCES "event" ("id");

ALTER TABLE "ticket" ADD FOREIGN KEY ("event") REFERENCES "event" ("id");

ALTER TABLE "ticket" ADD FOREIGN KEY ("buyer") REFERENCES "person" ("id");

ALTER TABLE "ticket" ADD FOREIGN KEY ("stand") REFERENCES "stand" ("id");

ALTER TABLE "ticket" ADD FOREIGN KEY ("pricing") REFERENCES "event_pricing" ("id");

ALTER TABLE "news" ADD FOREIGN KEY ("event") REFERENCES "event" ("id");

ALTER TABLE "news" ADD FOREIGN KEY ("stand") REFERENCES "stand" ("id");

ALTER TABLE "news" ADD FOREIGN KEY ("company") REFERENCES "company" ("id");

ALTER TABLE "news" ADD FOREIGN KEY ("editor") REFERENCES "person" ("id");

ALTER TABLE "tier" ADD FOREIGN KEY ("default_id") REFERENCES "tier" ("id");

ALTER TABLE "tier" ADD FOREIGN KEY ("pricing") REFERENCES "event_pricing" ("id");

ALTER TABLE "tier" ADD FOREIGN KEY ("event") REFERENCES "event" ("id");

CREATE UNIQUE INDEX ON "chat" ("event", "person_from", "person_to");

COMMENT ON TABLE "role" IS 'Named grants sets for a user in company required also GIN index in form of: CREATE INDEX role_grants_gin_idx ON public.role  USING gin ((grants->"[]") jsonb_path_ops);';

COMMENT ON COLUMN "role"."grants" IS 'json with list of permissions per role';

COMMENT ON TABLE "company" IS 'entity accumulating available personnel, stands and events';

COMMENT ON COLUMN "company"."tags" IS 'comma-delimited list';

COMMENT ON COLUMN "company"."vat" IS 'tax id number';

COMMENT ON COLUMN "company"."address" IS 'company address';

COMMENT ON COLUMN "person"."company" IS 'when company created';

COMMENT ON COLUMN "person"."role" IS 'when in company, what role';

COMMENT ON COLUMN "person"."language" IS 'ui language, like en_GB';

COMMENT ON COLUMN "person"."address" IS 'user personal/billing address. PII';

COMMENT ON TABLE "personnel_invitation" IS 'when I want somebody to participate, I send a request for approval. Only after that I can assign that person to his task.';

COMMENT ON COLUMN "personnel_invitation"."email_to" IS 'even if user already registered, it should be resolved via email, or invitation created otherwise';

COMMENT ON COLUMN "personnel_invitation"."role" IS 'this is initial role assignment, can be changed further';

COMMENT ON COLUMN "personnel_invitation"."position" IS 'job position on a badge for visitors ';

COMMENT ON COLUMN "personnel_invitation"."company" IS 'in case inviter will be removed before invitation accepted';

COMMENT ON TABLE "personnel" IS 'company user assigned to event or stand with some role';

COMMENT ON COLUMN "personnel"."position" IS 'job position on a badge for visitors ';

COMMENT ON COLUMN "personnel"."assigned_at" IS 'time of assignment';

COMMENT ON COLUMN "stand"."company" IS 'company stand belongs to';

COMMENT ON COLUMN "stand"."event" IS 'null if template';

COMMENT ON COLUMN "stand"."timezone" IS 'default gmt offset for schedule';

COMMENT ON COLUMN "stand"."language" IS 'default stand language';

COMMENT ON COLUMN "stand"."tags" IS 'comma-delimited list';

COMMENT ON TABLE "binaries" IS 'All uploaded binaries';

COMMENT ON COLUMN "binaries"."size" IS 'size in bytes';

COMMENT ON COLUMN "binaries"."filetype" IS 'MIME for a file';

COMMENT ON COLUMN "binaries"."uploaded" IS 'GMT 0';

COMMENT ON COLUMN "binaries"."last_accessed" IS 'GMT 0';

COMMENT ON COLUMN "binaries"."url" IS 'link to storage. Should not be public for permission check';

COMMENT ON COLUMN "binaries"."tags" IS 'comma-delimited list';

COMMENT ON TABLE "stand_invitation" IS 'Stand organisation request between person (as company representative) and company organizer';

COMMENT ON COLUMN "stand_invitation"."email_to" IS 'proxied to company if required';

COMMENT ON COLUMN "stand_invitation"."stand_owner_ok" IS 'true if requester';

COMMENT ON COLUMN "stand_invitation"."event_organiser_ok" IS 'true if requestor';

COMMENT ON COLUMN "event"."custom_name" IS 'name for custom routing';

COMMENT ON COLUMN "event"."timezone" IS 'event gmt offset';

COMMENT ON COLUMN "event"."contacts" IS 'all required contacts in json form';

COMMENT ON COLUMN "event"."tags" IS 'comma-delimited list';

COMMENT ON COLUMN "event"."color" IS 'color schema name or base color';

COMMENT ON TABLE "strings" IS 'Users text localizations are stored here';

COMMENT ON COLUMN "strings"."ref" IS 'entity name';

COMMENT ON COLUMN "strings"."ref_id" IS 'potential integrity break, check for orphans';

COMMENT ON COLUMN "strings"."is_default" IS 'is this language default for this string';

COMMENT ON TABLE "notes" IS 'everyone can store notes on entites there. notes are added to event report';

COMMENT ON COLUMN "notes"."ref" IS 'entity name';

COMMENT ON COLUMN "notes"."ref_id" IS 'potential integrity break, check for orphans';

COMMENT ON COLUMN "notes"."person" IS 'in case thats visitor notes';

COMMENT ON COLUMN "notes"."company" IS 'in case thats company notes';

COMMENT ON COLUMN "notes"."is_default" IS 'is this language default for this string';

COMMENT ON COLUMN "chat"."stand_to" IS 'if visitor talks to stand, stand id here';

COMMENT ON COLUMN "chat"."stand_from" IS 'if stand talks to event, stand id here';

COMMENT ON COLUMN "chat"."external_id" IS 'external chat integraion id';

COMMENT ON COLUMN "chat"."num_of_messages" IS 'number of messages in chat';

COMMENT ON COLUMN "chat"."last_read_by_user" IS 'last unread by user';

COMMENT ON COLUMN "activity"."stand" IS 'null if managed by event organizer';

COMMENT ON COLUMN "activity"."meeting" IS 'if accompanied with meeting';

COMMENT ON COLUMN "activity"."timezone" IS 'GMT timezone';

COMMENT ON COLUMN "activity"."value" IS 'activity text';

COMMENT ON COLUMN "activity"."tags" IS 'comma-delimited list';

COMMENT ON TABLE "meeting" IS 'Any off-chat avtivity - broadcast, offline or zoom. Description is in strings';

COMMENT ON COLUMN "meeting"."url" IS 'meeting URL';

COMMENT ON COLUMN "meeting"."chat" IS 'if meeting is chat outcome, then link to chat, so second participant is resolved, and context present';

COMMENT ON TABLE "meeting_attendies" IS 'For private or multi-presenter meetings';

COMMENT ON COLUMN "meeting_attendies"."person" IS 'attendee';

COMMENT ON TABLE "event_pricing" IS 'Update is possible if there is no tickets sold with this pricing. Otherwise, new pricing created';

COMMENT ON COLUMN "ticket"."stand" IS 'in case stand pay for participation';

COMMENT ON COLUMN "ticket"."pricing" IS 'even when pricing was changed, tickets are linked to actual ones';

COMMENT ON TABLE "dictionary" IS 'different localizable non-hierarchy lists';

COMMENT ON TABLE "confirmation" IS 'general email interactions processing with single entry point';

COMMENT ON COLUMN "confirmation"."should_login" IS 'true if user should be logged in the system for an operation';

COMMENT ON COLUMN "confirmation"."action_link" IS 'if an external call required for an action';

COMMENT ON COLUMN "confirmation"."redirect_link" IS 'redirect response for an action';

COMMENT ON COLUMN "confirmation"."expiration" IS 'time to expire object, gmt0';

COMMENT ON TABLE "news" IS 'all news content created by companies';

COMMENT ON COLUMN "news"."published" IS 'publish schedule by event timezone';

COMMENT ON COLUMN "news"."images" IS 'list of images used by the articles. URLs to S3';

COMMENT ON COLUMN "news"."tags" IS 'comma-delimited list';

COMMENT ON TABLE "stream" IS 'historical data. activity in a form object-verb-subject (parameter)';

COMMENT ON COLUMN "stream"."object_ref" IS 'entity name';

COMMENT ON COLUMN "stream"."object_ref_id" IS 'potential integrity break, check for orphans';

COMMENT ON COLUMN "stream"."created" IS 'used for ordering';

COMMENT ON COLUMN "stream"."action_date" IS 'date to pack into';

COMMENT ON COLUMN "stream"."action" IS 'action';

COMMENT ON COLUMN "stream"."subject_ref" IS 'entity name';

COMMENT ON COLUMN "stream"."subject_ref_id" IS 'potential integrity break, check for orphans';

COMMENT ON TABLE "stream_packed" IS 'packed streams, grouped by days in a form object-verb-(subjects+parameters)';

COMMENT ON COLUMN "stream_packed"."object_ref" IS 'entity name';

COMMENT ON COLUMN "stream_packed"."object_ref_id" IS 'potential integrity break, check for orphans';

COMMENT ON COLUMN "stream_packed"."latest" IS 'used for ordering within day, and for quick addition to raw without repacking';

COMMENT ON COLUMN "stream_packed"."action_date" IS 'date to pack into';

COMMENT ON COLUMN "stream_packed"."action" IS 'action';

COMMENT ON COLUMN "stream_packed"."subject_ref" IS 'entity name';

COMMENT ON COLUMN "stream_packed"."parameter" IS 'array of subjects with parameters and actual timestamps';

COMMENT ON TABLE "relation" IS 'we track secondary relations between users/companies and objects. object-verb-subject-param';

COMMENT ON COLUMN "relation"."object_ref" IS 'entity name. user/company';

COMMENT ON COLUMN "relation"."object_ref_id" IS 'potential integrity break, check for orphans';

COMMENT ON COLUMN "relation"."subject_ref" IS 'entity name';

COMMENT ON COLUMN "relation"."subject_ref_id" IS 'potential integrity break, check for orphans';

COMMENT ON TABLE "tier" IS 'sponsorship tiers configuration, name and description are in strings';

COMMENT ON COLUMN "tier"."is_enabled" IS 'for default tiers this shows if we can use it';

COMMENT ON COLUMN "tier"."default_id" IS 'link back to default tier';

COMMENT ON COLUMN "tier"."logo" IS 'url for a logo';

COMMENT ON COLUMN "tier"."event" IS 'null for default tiers';

COMMENT ON COLUMN "tier"."switches" IS 'list of switches';
