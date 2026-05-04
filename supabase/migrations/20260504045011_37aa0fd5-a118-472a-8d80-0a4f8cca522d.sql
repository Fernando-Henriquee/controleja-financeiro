
-- Multi-profile financial system

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  emoji text not null default '👤',
  color text not null default '#3b82f6',
  created_at timestamptz not null default now()
);
create index profiles_user_id_idx on public.profiles(user_id);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color text not null default '#3b82f6',
  balance numeric not null default 0,
  credit_limit numeric,
  credit_used numeric not null default 0,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index accounts_profile_id_idx on public.accounts(profile_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  amount numeric not null check (amount > 0),
  description text not null,
  category text not null default 'Outros',
  method text not null check (method in ('credit','debit','pix','cash')),
  raw text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index expenses_profile_id_idx on public.expenses(profile_id);
create index expenses_occurred_at_idx on public.expenses(occurred_at desc);

create table public.income_settings (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  hourly_rate numeric not null default 50,
  hours_per_day numeric not null default 8,
  working_days int not null default 22,
  manual_adjustment numeric not null default 0,
  updated_at timestamptz not null default now()
);

-- Helper: check if profile belongs to current user
create or replace function public.is_profile_owner(_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = _profile_id and user_id = auth.uid()
  )
$$;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.expenses enable row level security;
alter table public.income_settings enable row level security;

-- Profiles: users see/manage only their own
create policy "profiles_select_own" on public.profiles for select to authenticated using (user_id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "profiles_delete_own" on public.profiles for delete to authenticated using (user_id = auth.uid());

-- Accounts
create policy "accounts_select" on public.accounts for select to authenticated using (public.is_profile_owner(profile_id));
create policy "accounts_insert" on public.accounts for insert to authenticated with check (public.is_profile_owner(profile_id));
create policy "accounts_update" on public.accounts for update to authenticated using (public.is_profile_owner(profile_id)) with check (public.is_profile_owner(profile_id));
create policy "accounts_delete" on public.accounts for delete to authenticated using (public.is_profile_owner(profile_id));

-- Expenses
create policy "expenses_select" on public.expenses for select to authenticated using (public.is_profile_owner(profile_id));
create policy "expenses_insert" on public.expenses for insert to authenticated with check (public.is_profile_owner(profile_id));
create policy "expenses_update" on public.expenses for update to authenticated using (public.is_profile_owner(profile_id)) with check (public.is_profile_owner(profile_id));
create policy "expenses_delete" on public.expenses for delete to authenticated using (public.is_profile_owner(profile_id));

-- Income
create policy "income_select" on public.income_settings for select to authenticated using (public.is_profile_owner(profile_id));
create policy "income_insert" on public.income_settings for insert to authenticated with check (public.is_profile_owner(profile_id));
create policy "income_update" on public.income_settings for update to authenticated using (public.is_profile_owner(profile_id)) with check (public.is_profile_owner(profile_id));
create policy "income_delete" on public.income_settings for delete to authenticated using (public.is_profile_owner(profile_id));

-- When a new profile is created, seed default accounts + income settings
create or replace function public.seed_profile_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.income_settings(profile_id) values (new.id);
  insert into public.accounts(profile_id, name, color, balance, credit_limit, position) values
    (new.id, 'Itaú', '#ec7000', 0, 5000, 0),
    (new.id, 'Nubank', '#8a05be', 0, 3500, 1),
    (new.id, 'Nubank PJ', '#5b0a8c', 0, 2000, 2),
    (new.id, 'PicPay', '#11c76f', 0, 800, 3),
    (new.id, 'Mercado Pago', '#00b1ea', 0, 1500, 4);
  return new;
end;
$$;

create trigger on_profile_created
after insert on public.profiles
for each row execute function public.seed_profile_defaults();
