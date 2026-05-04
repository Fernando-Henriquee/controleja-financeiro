import type { Account, Expense, Income, PaymentMethod } from "./types";

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Alimentação: ["almoço","almoco","jantar","café","cafe","lanche","comida","ifood","rappi","restaurante","padaria","mercado","supermercado"],
  Transporte: ["uber","99","gasolina","combustível","combustivel","estacionamento","ônibus","onibus","metro","metrô","passagem"],
  Lazer: ["cinema","bar","show","balada","netflix","spotify","jogo","game","viagem"],
  Saúde: ["farmácia","farmacia","remédio","remedio","médico","medico","consulta","academia","gym"],
  Moradia: ["aluguel","luz","água","agua","internet","condomínio","condominio","gás","gas"],
  Compras: ["roupa","tênis","tenis","amazon","shopee","mercado livre","presente"],
  Outros: [],
};

const METHOD_KEYWORDS: Record<PaymentMethod, string[]> = {
  credit: ["credito","crédito","credit","cartão","cartao","cc"],
  debit: ["debito","débito","debit"],
  pix: ["pix"],
  cash: ["dinheiro","cash","espécie","especie"],
};

export type ParsedExpense = {
  amount: number;
  description: string;
  category: string;
  method: PaymentMethod;
  account_id: string;
  raw: string;
};

export function parseExpense(input: string, accounts: Account[]): ParsedExpense | null {
  const text = input.trim().toLowerCase();
  if (!text || !accounts.length) return null;
  const amountMatch = text.match(/(\d+[.,]?\d*)/);
  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1].replace(",", "."));
  if (!isFinite(amount) || amount <= 0) return null;

  let method: PaymentMethod = "debit";
  for (const [m, kws] of Object.entries(METHOD_KEYWORDS)) {
    if (kws.some(k => text.includes(k))) { method = m as PaymentMethod; break; }
  }

  let account_id = accounts[0].id;
  for (const a of accounts) {
    const first = a.name.toLowerCase().split(" ")[0];
    if (text.includes(a.name.toLowerCase().replace(/\s+/g, "")) || text.includes(first)) {
      account_id = a.id;
      break;
    }
  }

  let category = "Outros";
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some(k => text.includes(k))) { category = cat; break; }
  }

  const description = input.replace(amountMatch[0], "").trim() || category;
  return { amount, description, category, method, account_id, raw: input };
}

// Finance calcs
export function expectedMonthlyIncome(income: Income): number {
  return income.hourly_rate * income.hours_per_day * income.working_days + income.manual_adjustment;
}
export function totalBalance(accounts: Account[]): number {
  return accounts.reduce((a, x) => a + Number(x.balance), 0);
}
export function totalCreditUsed(accounts: Account[]): number {
  return accounts.reduce((a, x) => a + Number(x.credit_used ?? 0), 0);
}
export function monthStart(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function monthSpent(expenses: Expense[]): number {
  const t = monthStart().getTime();
  return expenses.filter(e => new Date(e.occurred_at).getTime() >= t).reduce((a, e) => a + Number(e.amount), 0);
}
export function todaySpent(expenses: Expense[]): number {
  const k = new Date().toDateString();
  return expenses.filter(e => new Date(e.occurred_at).toDateString() === k).reduce((a, e) => a + Number(e.amount), 0);
}
export function daysRemaining(): number {
  const t = new Date();
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  return Math.max(1, last - t.getDate() + 1);
}
export function dailyLimit(income: Income, expenses: Expense[]): number {
  const i = expectedMonthlyIncome(income);
  const remaining = i - monthSpent(expenses);
  return Math.max(0, remaining / daysRemaining());
}
export type Status = "safe" | "warn" | "danger";
export function dailyStatus(income: Income, expenses: Expense[]): Status {
  const limit = dailyLimit(income, expenses);
  const spent = todaySpent(expenses);
  if (limit <= 0 || spent > limit) return "danger";
  if (spent > limit * 0.75) return "warn";
  return "safe";
}
export function monthProgress(income: Income, expenses: Expense[]): number {
  const i = expectedMonthlyIncome(income);
  if (i <= 0) return 0;
  return Math.min(1, monthSpent(expenses) / i);
}
export function forecastEndOfMonth(expenses: Expense[]): number {
  const t = new Date();
  const day = t.getDate();
  const lastDay = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  const avg = monthSpent(expenses) / Math.max(1, day);
  return avg * lastDay;
}
export function fmtBRL(v: number): string {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
