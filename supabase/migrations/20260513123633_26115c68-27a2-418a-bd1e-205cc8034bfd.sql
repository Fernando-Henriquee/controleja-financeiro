-- Phase 2: per-card cycle days + uniqueness for invoices
ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS closing_day INTEGER,
  ADD COLUMN IF NOT EXISTS due_day INTEGER;

ALTER TABLE public.accounts
  DROP CONSTRAINT IF EXISTS accounts_closing_day_check,
  ADD CONSTRAINT accounts_closing_day_check CHECK (closing_day IS NULL OR (closing_day BETWEEN 1 AND 28));

ALTER TABLE public.accounts
  DROP CONSTRAINT IF EXISTS accounts_due_day_check,
  ADD CONSTRAINT accounts_due_day_check CHECK (due_day IS NULL OR (due_day BETWEEN 1 AND 28));

-- Ensure one invoice per card per cycle
CREATE UNIQUE INDEX IF NOT EXISTS card_invoices_account_cycle_uidx
  ON public.card_invoices(account_id, cycle_key);

CREATE INDEX IF NOT EXISTS card_invoices_profile_cycle_idx
  ON public.card_invoices(profile_id, cycle_key);

CREATE INDEX IF NOT EXISTS expenses_invoice_idx
  ON public.expenses(invoice_id);
