/* function for deep merge two jsonb objects, without duplicates. we use that to update ticket and relation json parameters */
create unique index if not exists strings_uq_index
    on strings (ref, ref_id, category, language);
