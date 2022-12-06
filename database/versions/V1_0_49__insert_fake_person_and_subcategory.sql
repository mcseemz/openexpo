INSERT INTO person (id, name, status, email) VALUES (-1, 'inactive user', 'blocked', '')
ON CONFLICT DO NOTHING ;

DO $$ BEGIN
    CREATE TYPE upload_subcategory_type AS ENUM (
        'activity_thumb',
        'article_banner',
        'article_thumb',
        'banner_image',
        'collection_hero',
        'collection_thumb',
        'content_carousel',
        'content_main_image',
        'logo_image',
        'main_image',
        'upload_thumb');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE binaries
    ADD COLUMN IF NOT EXISTS subcategory upload_subcategory_type default null;
COMMENT ON COLUMN binaries.subcategory IS 'for branding we have multiple types of supporting binaries. This column matches filename';

--update old records, invent category for them. may not match, but not critical
UPDATE binaries SET subcategory =
    CASE ref
        WHEN 'user' THEN 'logo_image'::upload_subcategory_type
        WHEN 'company' THEN 'main_image'::upload_subcategory_type
        WHEN 'collection' THEN 'collection_thumb'::upload_subcategory_type
        WHEN 'news' THEN 'main_image'::upload_subcategory_type
        ELSE CASE split_part(url,'/',1)
            WHEN 'branding' THEN 'main_image'::upload_subcategory_type
            WHEN 'user' THEN 'logo_image'::upload_subcategory_type
            WHEN 'news' THEN 'article_thumb'::upload_subcategory_type END
        END
WHERE category<>'binary'
    AND category<>'sponsor'
    AND right(split_part(url,'-',1), 1)='f'
    AND original_filename IS NULL
    AND subcategory IS NULL;

--update new records, take subcategory from filename
UPDATE binaries SET subcategory =
    CASE split_part(url,'-',2)
        WHEN 'logo' THEN null
        WHEN 'none' THEN null
        ELSE split_part(url,'-',2)::upload_subcategory_type END
WHERE category<>'binary'
  AND category<>'sponsor'
  AND right(split_part(url,'-',1), 1)='d'
  AND subcategory IS NULL;
