
-- Phase 1: cycle start day per profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cycle_start_day INT NOT NULL DEFAULT 1;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_cycle_start_day_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_cycle_start_day_check
  CHECK (cycle_start_day BETWEEN 1 AND 28);

-- Phase 2: card invoices table (wiring will follow)
CREATE TABLE IF NOT EXISTS public.card_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  account_id UUID NOT NULL,
  cycle_key TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  paid_from_account_id UUID,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, cycle_key)
);

ALTER TABLE public.card_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS card_invoices_select ON public.card_invoices;
CREATE POLICY card_invoices_select ON public.card_invoices FOR SELECT TO authenticated
  USING (public.is_profile_owner(profile_id));
DROP POLICY IF EXISTS card_invoices_insert ON public.card_invoices;
CREATE POLICY card_invoices_insert ON public.card_invoices FOR INSERT TO authenticated
  WITH CHECK (public.is_profile_owner(profile_id));
DROP POLICY IF EXISTS card_invoices_update ON public.card_invoices;
CREATE POLICY card_invoices_update ON public.card_invoices FOR UPDATE TO authenticated
  USING (public.is_profile_owner(profile_id))
  WITH CHECK (public.is_profile_owner(profile_id));
DROP POLICY IF EXISTS card_invoices_delete ON public.card_invoices;
CREATE POLICY card_invoices_delete ON public.card_invoices FOR DELETE TO authenticated
  USING (public.is_profile_owner(profile_id));

-- Optional link from expenses to invoice
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS invoice_id UUID;
