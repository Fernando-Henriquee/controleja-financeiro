ALTER TABLE public.recurring_rules
  ADD COLUMN IF NOT EXISTS paid_months text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS auto_apply boolean NOT NULL DEFAULT false;