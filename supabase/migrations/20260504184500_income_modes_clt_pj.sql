alter table public.income_settings
  add column if not exists mode text not null default 'pj' check (mode in ('clt','pj')),
  add column if not exists monthly_salary numeric not null default 0,
  add column if not exists extra_income numeric not null default 0;

update public.income_settings
set
  mode = coalesce(mode, 'pj'),
  monthly_salary = coalesce(monthly_salary, 0),
  extra_income = coalesce(extra_income, manual_adjustment, 0);
