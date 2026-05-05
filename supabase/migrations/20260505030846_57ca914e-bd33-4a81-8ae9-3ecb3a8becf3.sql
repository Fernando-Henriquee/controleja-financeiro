-- Add account kind to distinguish debit vs credit
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'debit';

-- Backfill: any existing account with credit_limit set is a credit card
UPDATE public.accounts SET kind = 'credit' WHERE credit_limit IS NOT NULL AND kind = 'debit';

ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_kind_check CHECK (kind IN ('debit', 'credit'));

-- Loans table
CREATE TABLE IF NOT EXISTS public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bank text NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  installment_amount numeric NOT NULL DEFAULT 0,
  total_installments integer NOT NULL DEFAULT 1,
  paid_installments integer NOT NULL DEFAULT 0,
  payment_day integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loans_select" ON public.loans FOR SELECT TO authenticated USING (public.is_profile_owner(profile_id));
CREATE POLICY "loans_insert" ON public.loans FOR INSERT TO authenticated WITH CHECK (public.is_profile_owner(profile_id));
CREATE POLICY "loans_update" ON public.loans FOR UPDATE TO authenticated USING (public.is_profile_owner(profile_id)) WITH CHECK (public.is_profile_owner(profile_id));
CREATE POLICY "loans_delete" ON public.loans FOR DELETE TO authenticated USING (public.is_profile_owner(profile_id));