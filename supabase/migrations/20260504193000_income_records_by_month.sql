create table if not exists public.income_records (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  month_key text not null,
  mode text not null default 'pj' check (mode in ('clt','pj')),
  monthly_salary numeric not null default 0,
  hourly_rate numeric not null default 50,
  working_days int not null default 22,
  extra_income numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, month_key)
);

create index if not exists income_records_profile_idx on public.income_records(profile_id, month_key);

alter table public.income_records enable row level security;

create policy "income_records_select" on public.income_records for select to authenticated using (public.is_profile_owner(profile_id));
create policy "income_records_insert" on public.income_records for insert to authenticated with check (public.is_profile_owner(profile_id));
create policy "income_records_update" on public.income_records for update to authenticated using (public.is_profile_owner(profile_id)) with check (public.is_profile_owner(profile_id));
create policy "income_records_delete" on public.income_records for delete to authenticated using (public.is_profile_owner(profile_id));
