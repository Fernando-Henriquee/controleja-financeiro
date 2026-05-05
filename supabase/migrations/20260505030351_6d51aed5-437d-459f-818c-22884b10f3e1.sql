-- Fix permission on existing function
GRANT EXECUTE ON FUNCTION public.is_profile_owner(uuid) TO authenticated, anon;

-- Add missing columns to income_settings to match app code
ALTER TABLE public.income_settings
  ADD COLUMN IF NOT EXISTS monthly_salary numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_income numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'clt';

-- expense_patterns
CREATE TABLE IF NOT EXISTS public.expense_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  pattern text NOT NULL,
  category text NOT NULL DEFAULT 'Outros',
  method text NOT NULL,
  use_count integer NOT NULL DEFAULT 1,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expense_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patterns_select" ON public.expense_patterns FOR SELECT TO authenticated USING (public.is_profile_owner(profile_id));
CREATE POLICY "patterns_insert" ON public.expense_patterns FOR INSERT TO authenticated WITH CHECK (public.is_profile_owner(profile_id));
CREATE POLICY "patterns_update" ON public.expense_patterns FOR UPDATE TO authenticated USING (public.is_profile_owner(profile_id)) WITH CHECK (public.is_profile_owner(profile_id));
CREATE POLICY "patterns_delete" ON public.expense_patterns FOR DELETE TO authenticated USING (public.is_profile_owner(profile_id));
CREATE INDEX IF NOT EXISTS idx_patterns_profile ON public.expense_patterns(profile_id, use_count DESC);

-- recurring_rules
CREATE TABLE IF NOT EXISTS public.recurring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL,
  category text NOT NULL DEFAULT 'Outros',
  method text NOT NULL,
  day_of_month integer NOT NULL,
  applied_months text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recurring_select" ON public.recurring_rules FOR SELECT TO authenticated USING (public.is_profile_owner(profile_id));
CREATE POLICY "recurring_insert" ON public.recurring_rules FOR INSERT TO authenticated WITH CHECK (public.is_profile_owner(profile_id));
CREATE POLICY "recurring_update" ON public.recurring_rules FOR UPDATE TO authenticated USING (public.is_profile_owner(profile_id)) WITH CHECK (public.is_profile_owner(profile_id));
CREATE POLICY "recurring_delete" ON public.recurring_rules FOR DELETE TO authenticated USING (public.is_profile_owner(profile_id));

-- reminders
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  day_of_month integer NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminders_select" ON public.reminders FOR SELECT TO authenticated USING (public.is_profile_owner(profile_id));
CREATE POLICY "reminders_insert" ON public.reminders FOR INSERT TO authenticated WITH CHECK (public.is_profile_owner(profile_id));
CREATE POLICY "reminders_update" ON public.reminders FOR UPDATE TO authenticated USING (public.is_profile_owner(profile_id)) WITH CHECK (public.is_profile_owner(profile_id));
CREATE POLICY "reminders_delete" ON public.reminders FOR DELETE TO authenticated USING (public.is_profile_owner(profile_id));

-- income_records (monthly history)
CREATE TABLE IF NOT EXISTS public.income_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month_key text NOT NULL,
  mode text NOT NULL DEFAULT 'clt',
  monthly_salary numeric NOT NULL DEFAULT 0,
  hourly_rate numeric NOT NULL DEFAULT 0,
  working_days integer NOT NULL DEFAULT 22,
  extra_income numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, month_key)
);
ALTER TABLE public.income_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "income_records_select" ON public.income_records FOR SELECT TO authenticated USING (public.is_profile_owner(profile_id));
CREATE POLICY "income_records_insert" ON public.income_records FOR INSERT TO authenticated WITH CHECK (public.is_profile_owner(profile_id));
CREATE POLICY "income_records_update" ON public.income_records FOR UPDATE TO authenticated USING (public.is_profile_owner(profile_id)) WITH CHECK (public.is_profile_owner(profile_id));
CREATE POLICY "income_records_delete" ON public.income_records FOR DELETE TO authenticated USING (public.is_profile_owner(profile_id));

-- Ensure trigger that seeds defaults exists on profiles
DROP TRIGGER IF EXISTS trg_seed_profile_defaults ON public.profiles;
CREATE TRIGGER trg_seed_profile_defaults
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.seed_profile_defaults();