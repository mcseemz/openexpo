ALTER TYPE binaries_category_type ADD VALUE IF NOT EXISTS 'recording';

alter table binaries
    add column if not exists ref string_entity,
    add column if not exists ref_id integer,
    add column if not exists original_filename varchar(1000);

update binaries set ref='news', ref_id = news
where news is not null;

update binaries set ref='user', ref_id = person
where person is not null;

update binaries set ref='company', ref_id = company
where company is not null;


--alter table binaries
--    drop column if exists company,
--    drop column if exists person,
--    drop column if exists news;