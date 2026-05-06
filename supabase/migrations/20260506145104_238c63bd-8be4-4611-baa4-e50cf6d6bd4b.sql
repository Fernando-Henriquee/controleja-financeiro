CREATE TABLE public.installment_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL,
  account_id uuid NOT NULL,
  description text NOT NULL DEFAULT '',
  total_amount numeric NOT NULL DEFAULT 0,
  installment_count integer NOT NULL DEFAULT 1,
  installment_amount numeric NOT NULL DEFAULT 0,
  first_month_key text NOT NULL,
  paid_installments integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.installment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "installment_plans_select" ON public.installment_plans
  FOR SELECT TO authenticated USING (public.is_profile_owner(profile_id));

CREATE POLICY "installment_plans_insert" ON public.installment_plans
  FOR INSERT TO authenticated WITH CHECK (public.is_profile_owner(profile_id));

CREATE POLICY "installment_plans_update" ON public.installment_plans
  FOR UPDATE TO authenticated USING (public.is_profile_owner(profile_id)) WITH CHECK (public.is_profile_owner(profile_id));

CREATE POLICY "installment_plans_delete" ON public.installment_plans
  FOR DELETE TO authenticated USING (public.is_profile_owner(profile_id));

CREATE INDEX idx_installment_plans_profile ON public.installment_plans(profile_id);
CREATE INDEX idx_installment_plans_account ON public.installment_plans(account_id);