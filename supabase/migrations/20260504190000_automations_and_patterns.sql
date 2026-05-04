create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  description text not null,
  amount numeric not null check (amount > 0),
  category text not null default 'Outros',
  method text not null check (method in ('credit','debit','pix','cash')),
  account_id uuid not null references public.accounts(id) on delete cascade,
  day_of_month int not null check (day_of_month between 1 and 31),
  applied_months text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists recurring_rules_profile_idx on public.recurring_rules(profile_id);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  day_of_month int not null check (day_of_month between 1 and 31),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists reminders_profile_idx on public.reminders(profile_id);

create table if not exists public.expense_patterns (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  pattern text not null,
  category text not null default 'Outros',
  method text not null check (method in ('credit','debit','pix','cash')),
  account_id uuid not null references public.accounts(id) on delete cascade,
  use_count int not null default 1,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (profile_id, pattern)
);
create index if not exists expense_patterns_profile_idx on public.expense_patterns(profile_id);
create index if not exists expense_patterns_use_count_idx on public.expense_patterns(profile_id, use_count desc);

alter table public.recurring_rules enable row level security;
alter table public.reminders enable row level security;
alter table public.expense_patterns enable row level security;

create policy "recurring_rules_select" on public.recurring_rules for select to authenticated using (public.is_profile_owner(profile_id));
create policy "recurring_rules_insert" on public.recurring_rules for insert to authenticated with check (public.is_profile_owner(profile_id));
create policy "recurring_rules_update" on public.recurring_rules for update to authenticated using (public.is_profile_owner(profile_id)) with check (public.is_profile_owner(profile_id));
create policy "recurring_rules_delete" on public.recurring_rules for delete to authenticated using (public.is_profile_owner(profile_id));

create policy "reminders_select" on public.reminders for select to authenticated using (public.is_profile_owner(profile_id));
create policy "reminders_insert" on public.reminders for insert to authenticated with check (public.is_profile_owner(profile_id));
create policy "reminders_update" on public.reminders for update to authenticated using (public.is_profile_owner(profile_id)) with check (public.is_profile_owner(profile_id));
create policy "reminders_delete" on public.reminders for delete to authenticated using (public.is_profile_owner(profile_id));

create policy "expense_patterns_select" on public.expense_patterns for select to authenticated using (public.is_profile_owner(profile_id));
create policy "expense_patterns_insert" on public.expense_patterns for insert to authenticated with check (public.is_profile_owner(profile_id));
create policy "expense_patterns_update" on public.expense_patterns for update to authenticated using (public.is_profile_owner(profile_id)) with check (public.is_profile_owner(profile_id));
create policy "expense_patterns_delete" on public.expense_patterns for delete to authenticated using (public.is_profile_owner(profile_id));
