-- Add 'validation' to category check constraint in statuses table
-- 1. Identify constraint name (usually statuses_category_check) and drop it
do $$
declare
    constr_name text;
begin
    select constraint_name into constr_name
    from information_schema.constraint_column_usage
    where table_name = 'statuses' and column_name = 'category'
    limit 1;

    if constr_name is not null then
        execute 'alter table statuses drop constraint ' || constr_name;
    end if;
end $$;

-- 2. Add new constraint with 'validation'
alter table statuses add constraint statuses_category_check 
check (category in ('backlog', 'active', 'validation', 'done', 'archived'));

-- 3. Update existing statuses named 'Validation' to the new category
update statuses set category = 'validation' where name = 'Validation';
