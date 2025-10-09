-- SQL Migration for Codes and Relations
-- Date: 2025-01-06
-- Description: Create codes table and relations with categories

-- BEGIN SQL --
create table if not exists codes (
  id bigserial primary key,
  name text not null unique,
  slug text generated always as (regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) stored,
  is_whitelisted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists codes_categories (
  code_id bigint not null references codes(id) on delete cascade,
  category_id bigint not null references categories(id) on delete cascade,
  primary key (code_id, category_id)
);

-- indeksy
create index if not exists idx_codes_slug on codes(slug);
create index if not exists idx_codes_is_whitelisted on codes(is_whitelisted);

-- RLS (otwarte na prototyp)
alter table codes enable row level security;
alter table codes_categories enable row level security;

drop policy if exists "codes read" on codes;
drop policy if exists "codes write" on codes;
create policy "codes read"  on codes for select using (true);
create policy "codes write" on codes for all using (true) with check (true);

drop policy if exists "codes_categories read" on codes_categories;
drop policy if exists "codes_categories write" on codes_categories;
create policy "codes_categories read"  on codes_categories for select using (true);
create policy "codes_categories write" on codes_categories for all using (true) with check (true);

-- (Opcjonalnie) AUTO-ASSIGN dla nowych answers:
-- Jeśli is_whitelisted = true i answer_text ILIKE name → ustaw selected_code + whitelist
-- Uwaga: prosta reguła, może być "za szeroka" – traktuj jako MVP
create or replace function assign_whitelisted_code()
returns trigger as $$
begin
  perform 1 from codes c
   where new.answer_text ilike '%' || c.name || '%'
     and c.is_whitelisted = true
   limit 1;
  if found then
    select c.name into new.selected_code
    from codes c
    where new.answer_text ilike '%' || c.name || '%'
      and c.is_whitelisted = true
    order by length(c.name) desc  -- preferuj dłuższe dopasowanie
    limit 1;

    new.quick_status  := 'Confirmed';
    new.general_status := 'whitelist';
    new.coding_date   := now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_assign_whitelisted_code on answers;
create trigger trg_assign_whitelisted_code
before insert on answers
for each row execute function assign_whitelisted_code();
-- END SQL --
