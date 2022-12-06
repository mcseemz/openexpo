alter table binaries
    drop column if exists company,
    drop column if exists person,
    drop column if exists news;