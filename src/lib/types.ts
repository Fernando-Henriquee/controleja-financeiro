export type PaymentMethod = "credit" | "debit" | "pix" | "cash";

export type Profile = {
  id: string;
  name: string;
  emoji: string;
  color: string;
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

export type Expense = {
  id: string;
  amount: number;
  description: string;
  category: string;
  method: PaymentMethod;
  account_id: string;
  occurred_at: string;
  raw?: string | null;
};

export type Income = {
  mode: "clt" | "pj";
  monthly_salary: number;
  hourly_rate: number;
  working_days: number;
  extra_income: number;
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
