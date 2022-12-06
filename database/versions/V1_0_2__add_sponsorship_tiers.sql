ALTER TYPE binaries_category_type ADD VALUE 'sponsor';

ALTER TYPE string_entity ADD VALUE 'tier';

INSERT INTO public.tier(
    is_enabled, default_id, logo, pricing, event, switches)
    VALUES (false, null, null, null, null, jsonb '{"logo":true,"lottery":false,"video":false,"pics":false,"banner":true}');

INSERT INTO public.strings(
    ref, ref_id, category, language, value, is_default)
    VALUES ('tier', 1, 'name', 'en_GB', 'Basic', true);
    
INSERT INTO public.tier(
    is_enabled, default_id, logo, pricing, event, switches)
    VALUES (false, null, null, null, null, jsonb '{"logo":true,"lottery":true,"video":false,"pics":true,"banner":true}');

INSERT INTO public.strings(
    ref, ref_id, category, language, value, is_default)
    VALUES ('tier', 2, 'name', 'en_GB', 'Silver', true);
    
INSERT INTO public.tier(
    is_enabled, default_id, logo, pricing, event, switches)
    VALUES (false, null, null, null, null, jsonb '{"logo":true,"lottery":true,"video":true,"pics":true,"banner":true}');

INSERT INTO public.strings(
    ref, ref_id, category, language, value, is_default)
    VALUES ('tier', 3, 'name', 'en_GB', 'Gold', true);