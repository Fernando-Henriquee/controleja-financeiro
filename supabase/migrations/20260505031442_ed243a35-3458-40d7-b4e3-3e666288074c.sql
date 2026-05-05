-- Remove default mock values from columns
ALTER TABLE public.income_settings ALTER COLUMN hourly_rate SET DEFAULT 0;
ALTER TABLE public.income_settings ALTER COLUMN working_days SET DEFAULT 0;
ALTER TABLE public.income_settings ALTER COLUMN hours_per_day SET DEFAULT 0;

-- Reset existing mock rows that were never edited (still at the old defaults)
UPDATE public.income_settings
SET hourly_rate = 0, working_days = 0, hours_per_day = 0
WHERE hourly_rate = 50 AND working_days = 22 AND monthly_salary = 0 AND extra_income = 0;

-- Stop seeding income_settings for new profiles; keep account seeding
CREATE OR REPLACE FUNCTION public.seed_profile_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.accounts(profile_id, name, color, balance, credit_limit, position, kind) values
    (new.id, 'Itaú', '#ec7000', 0, 5000, 0, 'credit'),
    (new.id, 'Nubank', '#8a05be', 0, 3500, 1, 'credit'),
    (new.id, 'Nubank PJ', '#5b0a8c', 0, 2000, 2, 'credit'),
    (new.id, 'PicPay', '#11c76f', 0, 800, 3, 'credit'),
    (new.id, 'Mercado Pago', '#00b1ea', 0, 1500, 4, 'credit');
  return new;
end;
$function$;