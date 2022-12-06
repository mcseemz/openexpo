create or replace function add_personnel_role(roleName text, beautifulName text, grants json) returns void
as $$
declare
v int;
begin
select id from role where name = roleName into v;
if not found then
        INSERT INTO role (name, grants) VALUES (roleName, grants) returning id into v;
        insert into strings (ref, ref_id, category, language, value, is_default) VALUES ('role', v, 'name', 'en_GB', beautifulName, true);
end if;

end
$$ language plpgsql;

--add values
select add_personnel_role('event-speaker', 'Invited speaker', '[]'::json);
select add_personnel_role('stand-speaker', 'Invited speaker', '[]'::json);