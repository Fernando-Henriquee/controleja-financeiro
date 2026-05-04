export type PaymentMethod = "credit" | "debit" | "pix" | "cash";

export type Account = {
  id: string;
  name: string;
  color: string;
  balance: number; // debit balance
  creditLimit?: number;
  creditUsed?: number;
};

export type Expense = {
  id: string;
  amount: number;
  description: string;
  category: string;
  method: PaymentMethod;
  accountId: string;
  date: string; // ISO
  raw?: string;
};

export type Income = {
  hourlyRate: number;
  hoursPerDay: number;
  workingDays: number; // per month
  manualAdjustment?: number; // R$ added/removed
};

export type AppState = {
  accounts: Account[];
  expenses: Expense[];
  income: Income;
  monthStart: string; // ISO date
};
