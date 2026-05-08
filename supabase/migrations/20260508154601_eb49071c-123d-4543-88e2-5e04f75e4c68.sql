create table public.coach_conversations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  month_key text not null,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, month_key)
);

alter table public.coach_conversations enable row level security;

create policy coach_conv_select on public.coach_conversations
  for select to authenticated using (public.is_profile_owner(profile_id));
create policy coach_conv_insert on public.coach_conversations
  for insert to authenticated with check (public.is_profile_owner(profile_id));
create policy coach_conv_update on public.coach_conversations
  for update to authenticated using (public.is_profile_owner(profile_id))
  with check (public.is_profile_owner(profile_id));
create policy coach_conv_delete on public.coach_conversations
  for delete to authenticated using (public.is_profile_owner(profile_id));