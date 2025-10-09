-- SQL Migration for Categories UI
-- Date: 2025-01-06
-- Description: Create categories table and assign all existing codes to "Home Fragrances"

-- BEGIN SQL --
-- Upewnij się, że istnieje tabela categories
create table if not exists categories (
  id bigserial primary key,
  name text not null unique,
  slug text generated always as (regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table categories enable row level security;
drop policy if exists "categories read" on categories;
drop policy if exists "categories write" on categories;
create policy "categories read" on categories for select using (true);
create policy "categories write" on categories for all using (true) with check (true);

-- Jednorazowo utwórz kategorię „Home Fragrances" i przypisz do niej wszystkie istniejące kody
insert into categories(name) 
select 'Home Fragrances'
where not exists (select 1 from categories where name = 'Home Fragrances');

-- Powiąż WSZYSTKIE istniejące codes z kategorią „Home Fragrances"
insert into codes_categories(code_id, category_id)
select c.id, cat.id
from codes c
cross join (select id from categories where name = 'Home Fragrances' limit 1) cat
where not exists (
  select 1 from codes_categories cc 
  where cc.code_id = c.id and cc.category_id = cat.id
);
-- END SQL --
