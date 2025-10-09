-- SQL Migration for Codes and Answer-Code relationships
-- Date: 2025-01-06
-- Description: Create codes table and answer_codes pivot table

-- Create codes table
create table if not exists codes (
  id bigserial primary key,
  name text unique not null,
  slug text generated always as (regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) stored
);

-- Create index for slug
create index if not exists idx_codes_slug on codes(slug);

-- Create answer_codes pivot table (N:M relationship)
create table if not exists answer_codes (
  answer_id bigint references answers(id) on delete cascade,
  code_id bigint references codes(id) on delete cascade,
  primary key (answer_id, code_id)
);

-- Enable RLS and create policies for codes table
alter table codes enable row level security;
drop policy if exists "codes read" on codes;
drop policy if exists "codes write" on codes;
create policy "codes read"  on codes for select using (true);
create policy "codes write" on codes for insert with check (true);

-- Enable RLS and create policies for answer_codes table
alter table answer_codes enable row level security;
drop policy if exists "answer_codes read" on answer_codes;
drop policy if exists "answer_codes write" on answer_codes;
create policy "answer_codes read"  on answer_codes for select using (true);
create policy "answer_codes write" on answer_codes for insert with check (true);
