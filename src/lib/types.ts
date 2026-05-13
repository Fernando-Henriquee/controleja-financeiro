export type PaymentMethod = "credit" | "debit" | "pix" | "cash";

export type Profile = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  cycle_start_day?: number;
};

export type AccountKind = "debit" | "credit";

export type Account = {
  id: string;
  name: string;
  color: string;
  balance: number;
  credit_limit: number | null;
  credit_used: number;
  position: number;
  kind: AccountKind;
  overdraft_limit?: number | null;
  closing_day?: number | null;
  due_day?: number | null;
};

export type InvoiceStatus = "open" | "closed" | "paid";

export type CardInvoice = {
  id: string;
  profile_id: string;
  account_id: string;
  cycle_key: string;
  period_start: string;
  period_end: string;
  due_date: string;
  total: number;
  status: InvoiceStatus;
  paid_from_account_id: string | null;
  paid_at: string | null;
};

export type Loan = {
  id: string;
  profile_id: string;
  bank: string;
  total_amount: number;
  installment_amount: number;
  total_installments: number;
  paid_installments: number;
  payment_day: number;
  notes: string | null;
};

export type InstallmentPlan = {
  id: string;
  profile_id: string;
  account_id: string;
  description: string;
  total_amount: number;
  installment_count: number;
  installment_amount: number;
  first_month_key: string;
  paid_installments: number;
};

export type Expense = {
  id: string;
  amount: number;
  description: string;
  category: string;
  method: PaymentMethod;
  account_id: string;
  occurred_at: string;
  raw?: string | null;
  is_pending?: boolean;
  invoice_id?: string | null;
};

export type Income = {
  mode: "clt" | "pj";
  monthly_salary: number;
  hourly_rate: number;
  working_days: number;
  worked_hours?: number | null;
  extra_income: number;
  deposit_account_id?: string | null;
  paid_at?: string | null;
};

export type RecurringRule = {
  id: string;
  profile_id: string;
  description: string;
  amount: number;
  category: string;
  method: PaymentMethod;
  account_id: string;
  day_of_month: number;
  applied_months: string[];
  paid_months: string[];
  auto_apply: boolean;
};

export type Reminder = {
  id: string;
  profile_id: string;
  title: string;
  day_of_month: number;
  enabled: boolean;
};

export type ExpensePattern = {
  id: string;
  profile_id: string;
  pattern: string;
  category: string;
  method: PaymentMethod;
  account_id: string;
  use_count: number;
  last_used_at: string;
};
