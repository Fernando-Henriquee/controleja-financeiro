ALTER TABLE public.income_records ADD COLUMN IF NOT EXISTS worked_hours numeric;
ALTER TABLE public.income_records ADD COLUMN IF NOT EXISTS deposit_account_id uuid;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS overdraft_limit numeric;