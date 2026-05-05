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

export function parseExpenseWithHistory(input: string, accounts: Account[], expenses: Expense[]): ParsedExpense | null {
  const parsed = parseExpense(input, accounts);
  if (!parsed) return null;
  const text = input.trim().toLowerCase();
  const hasMethod = /(credito|crédito|credit|cartão|cartao|cc|debito|débito|debit|pix|dinheiro|cash|espécie|especie)/.test(text);
  const hasAccount = accounts.some((a) => {
    const n = a.name.toLowerCase();
    return text.includes(n) || text.includes(n.split(" ")[0]);
  });
  if (hasMethod && hasAccount) return parsed;

  const needle = parsed.description.toLowerCase().replace(/\s+/g, " ").trim();
  const match = expenses.find((e) => e.description.toLowerCase().includes(needle));
  if (!match) return parsed;

  return {
    ...parsed,
    method: hasMethod ? parsed.method : (match.method as PaymentMethod),
    account_id: hasAccount ? parsed.account_id : match.account_id,
  };
}

// Finance calcs
export function expectedMonthlyIncome(income: Income): number {
  if (income.mode === "clt") {
    return income.monthly_salary + income.extra_income;
  }
  return income.hourly_rate * 8 * income.working_days + income.extra_income;
}

export function businessDaysInMonth(baseDate = new Date()): number {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const last = new Date(year, month + 1, 0).getDate();
  let total = 0;
  for (let day = 1; day <= last; day += 1) {
    const weekDay = new Date(year, month, day).getDay();
    if (weekDay !== 0 && weekDay !== 6) total += 1;
  }
  return total;
}

export function businessDaysInMonthKey(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return businessDaysInMonth(new Date(y, m - 1, 1));
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
  return expenses.reduce((a, e) => a + Number(e.amount), 0);
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

export function idealDailyAverage(income: Income): number {
  return Math.max(0, expectedMonthlyIncome(income) / Math.max(1, daysRemaining() + (new Date().getDate() - 1)));
}

export function dailyDeviationFromIdeal(income: Income, expenses: Expense[]): number {
  return todaySpent(expenses) - idealDailyAverage(income);
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

export function disciplinedForecastEndOfMonth(income: Income, expenses: Expense[]): number {
  const spent = monthSpent(expenses);
  const projectedExtra = dailyLimit(income, expenses) * daysRemaining();
  return spent + projectedExtra;
}

export function endOfMonthBalanceIfCurrentPace(income: Income, expenses: Expense[]): number {
  return expectedMonthlyIncome(income) - forecastEndOfMonth(expenses);
}

export function endOfMonthBalanceIfDisciplined(income: Income, expenses: Expense[]): number {
  return expectedMonthlyIncome(income) - disciplinedForecastEndOfMonth(income, expenses);
}
export function fmtBRL(v: number): string {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthKey(key: string): { year: number; month: number } {
  const [y, m] = key.split("-").map((v) => Number(v));
  return { year: y, month: m };
}

export function monthDateRange(key: string): { startIso: string; endIso: string } {
  const { year, month } = parseMonthKey(key);
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function monthLabel(key: string): string {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
