/* function for deep merge two jsonb objects, without duplicates. we use that to update ticket and relation json parameters */
create or replace function jsonb_merge(CurrentData jsonb, newData jsonb)
    returns jsonb
    language sql
    immutable
as
$jsonb_merge_func$
select case jsonb_typeof(CurrentData)
    when 'object' then case jsonb_typeof(newData)
                          when 'object' then (
                              select jsonb_object_agg(k, case
                                     when e2.v is null then e1.v
                                     when e1.v is null then e2.v
                                     when e1.v = e2.v then e1.v
                                     else jsonb_merge(e1.v, e2.v)
                                  end)
                              from jsonb_each(CurrentData) e1(k, v)
                                       full join jsonb_each(newData) e2(k, v) using (k)
                          )
                          else newData
       end
    when 'array' then array_to_json(array(select distinct jsonb_array_elements(CurrentData || newData)))::jsonb
    else newData
    end
$jsonb_merge_func$;