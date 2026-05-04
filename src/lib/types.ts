export type PaymentMethod = "credit" | "debit" | "pix" | "cash";

export type Profile = {
  id: string;
  name: string;
  emoji: string;
  color: string;
};

export type Account = {
  id: string;
  name: string;
  color: string;
  balance: number;
  credit_limit: number | null;
  credit_used: number;
  position: number;
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
  hourly_rate: number;
  hours_per_day: number;
  working_days: number;
  manual_adjustment: number;
};
