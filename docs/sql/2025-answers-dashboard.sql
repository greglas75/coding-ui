-- SQL Migration for Answers Dashboard
-- Date: 2025-01-06
-- Description: Add new columns for enhanced coding dashboard

-- Add new columns to answers table
alter table answers
  add column if not exists language text,
  add column if not exists country text,
  add column if not exists translation_en text, -- tłumaczenie na angielski (UI pokazuje tę kolumnę)
  add column if not exists quick_status text check (quick_status in ('Other','Ignore','Global Blacklist','Blacklist','Confirmed')) default null,
  add column if not exists general_status text,  -- „Status ogólny" (może być alias istniejącego 'status' – na razie osobna kolumna)
  add column if not exists selected_code text,   -- wybrany kod (string; później można podpiąć FK)
  add column if not exists ai_suggested_code text, -- kod zaproponowany przez AI (readonly w UI)
  add column if not exists coding_date timestamptz; -- data kodowania (ustawiana przy zmianie quick_status/kodu)

-- Create helpful indexes
create index if not exists idx_answers_language on answers(language);
create index if not exists idx_answers_country on answers(country);
create index if not exists idx_answers_general_status on answers(general_status);
create index if not exists idx_answers_quick_status on answers(quick_status);
create index if not exists idx_answers_coding_date on answers(coding_date desc);

-- RLS: allow update on new columns (temporary, prototype)
drop policy if exists "answers UPDATE (anon ok)" on answers;
create policy "answers UPDATE (anon ok)" on answers
for update using (true) with check (true);
