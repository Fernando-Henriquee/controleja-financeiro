import type { Account, Expense, Income, InstallmentPlan, Loan, PaymentMethod, RecurringRule } from "./types";

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

function norm(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function parseExpense(input: string, accounts: Account[]): ParsedExpense | null {
  const raw = input.trim();
  const text = norm(raw);
  if (!text || !accounts.length) return null;
  const amountMatch = text.match(/(\d+[.,]?\d*)/);
  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1].replace(",", "."));
  if (!isFinite(amount) || amount <= 0) return null;

  let method: PaymentMethod = "debit";
  for (const [m, kws] of Object.entries(METHOD_KEYWORDS)) {
    if (kws.some(k => text.includes(norm(k)))) { method = m as PaymentMethod; break; }
  }

  const wantsCredit = method === "credit";
  const kindMatch = (a: Account) => wantsCredit ? a.kind === "credit" : a.kind === "debit";
  // Default: first account that matches the requested kind, fallback to first overall
  let account_id = (accounts.find(kindMatch) ?? accounts[0]).id;
  let bestScore = 0;
  for (const a of accounts) {
    const full = norm(a.name).replace(/\s+/g, "");
    const first = norm(a.name).split(" ")[0];
    let nameLen = 0;
    if (full && text.includes(full)) nameLen = full.length;
    else if (first && text.includes(first)) nameLen = first.length;
    if (nameLen <= 0) continue;
    // Heavy bonus when kind matches the chosen payment method
    const score = nameLen + (kindMatch(a) ? 1000 : 0);
    if (score > bestScore) { account_id = a.id; bestScore = score; }
  }

  let category = "Outros";
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some(k => text.includes(norm(k)))) { category = cat; break; }
  }

  const description = raw.replace(amountMatch[0], "").trim() || category;
  return { amount, description, category, method, account_id, raw };
}

export function parseExpenseWithHistory(input: string, accounts: Account[], expenses: Expense[]): ParsedExpense | null {
  const parsed = parseExpense(input, accounts);
  if (!parsed) return null;
  const text = norm(input);
  const hasMethod = /(credito|credit|cartao|cc|debito|debit|pix|dinheiro|cash|especie)/.test(text);
  const hasAccount = accounts.some((a) => {
    const n = norm(a.name);
    return text.includes(n) || text.includes(n.split(" ")[0]);
  });
  if (hasMethod && hasAccount) return parsed;

  const needle = norm(parsed.description).replace(/\s+/g, " ").trim();
  const match = expenses.find((e) => norm(e.description).includes(needle));
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
  const hours = income.worked_hours && income.worked_hours > 0
    ? income.worked_hours
    : income.working_days * 8;
  return income.hourly_rate * hours + income.extra_income;
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
// Marking the income as paid credits the account balance once (see store.updateIncome).
// These helpers stay for compatibility but no longer add anything on top of stored balance.
export function incomeDepositedToday(_income: Income): number {
  return 0;
}
export function effectiveAccountBalance(account: Account, _income: Income): number {
  return Number(account.balance);
}
export function totalEffectiveBalance(accounts: Account[], _income?: Income): number {
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

/** Meses entre firstMonthKey (inclusive) e monthKey — 0 se for o mesmo mês. */
export function monthsBetweenMonthKeys(firstMonthKey: string, monthKey: string): number {
  const [y1, m1] = firstMonthKey.split("-").map(Number);
  const [y2, m2] = monthKey.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

/** Parcela da compra ainda pendente neste mês de referência (índice do cronograma). */
export function installmentDueForMonth(plan: InstallmentPlan, monthKeyStr: string): boolean {
  const idx = monthsBetweenMonthKeys(plan.first_month_key, monthKeyStr);
  if (idx < 0 || idx >= plan.installment_count) return false;
  return idx >= plan.paid_installments;
}

export function totalInstallmentsDueInMonth(plans: InstallmentPlan[], monthKeyStr: string): number {
  return plans.reduce(
    (s, p) => s + (installmentDueForMonth(p, monthKeyStr) ? Number(p.installment_amount) : 0),
    0,
  );
}

/** Empréstimos com parcelas restantes: uma parcela por mês até quitar. */
export function totalLoanInstallmentsDueInMonth(loans: Loan[]): number {
  return loans
    .filter((l) => l.paid_installments < l.total_installments)
    .reduce((s, l) => s + Number(l.installment_amount), 0);
}

/** Total de recorrentes do mês ainda nao pagas (para o mes de referencia). */
export function totalUnpaidRecurringInMonth(rules: RecurringRule[], monthKeyStr: string): number {
  return rules
    .filter((r) => !r.paid_months.includes(monthKeyStr))
    .reduce((s, r) => s + Number(r.amount), 0);
}

export type ObligationOpts = {
  skippedAccountIds?: string[];
  skippedRecurringIds?: string[];
  savingsGoal?: number;
};

export type ObligationBreakdown = {
  renda: number;
  gasto: number;
  emprestimos: number;
  parcelas: number;
  faturas: number;
  recorrentes: number;
  poupanca: number;
  sobra: number;
};

export function obligationBreakdown(
  income: Income,
  expenses: Expense[],
  loans: Loan[],
  installmentPlans: InstallmentPlan[],
  obligationMonthKey: string,
  accounts: Account[] = [],
  recurringRules: RecurringRule[] = [],
  opts: ObligationOpts = {},
): ObligationBreakdown {
  const renda = expectedMonthlyIncome(income);
  const gasto = monthSpent(expenses);
  const emprestimos = totalLoanInstallmentsDueInMonth(loans);
  const parcelas = totalInstallmentsDueInMonth(installmentPlans, obligationMonthKey);
  const skipAcc = new Set(opts.skippedAccountIds ?? []);
  const skipRec = new Set(opts.skippedRecurringIds ?? []);
  const faturas = accounts.filter(a => !skipAcc.has(a.id)).reduce((s, a) => s + Number(a.credit_used ?? 0), 0);
  const recorrentes = recurringRules
    .filter(r => !r.paid_months.includes(obligationMonthKey) && !skipRec.has(r.id))
    .reduce((s, r) => s + Number(r.amount), 0);
  const poupanca = Math.max(0, opts.savingsGoal ?? 0);
  const sobra = renda - gasto - emprestimos - parcelas - faturas - recorrentes - poupanca;
  return { renda, gasto, emprestimos, parcelas, faturas, recorrentes, poupanca, sobra };
}

export function remainingAfterObligations(
  income: Income,
  expenses: Expense[],
  loans: Loan[],
  installmentPlans: InstallmentPlan[],
  obligationMonthKey: string,
  accounts: Account[] = [],
  recurringRules: RecurringRule[] = [],
  opts: ObligationOpts = {},
): number {
  return obligationBreakdown(income, expenses, loans, installmentPlans, obligationMonthKey, accounts, recurringRules, opts).sobra;
}

export function dailyLimitRealistic(
  income: Income,
  expenses: Expense[],
  loans: Loan[],
  installmentPlans: InstallmentPlan[],
  obligationMonthKey: string,
  accounts: Account[] = [],
  recurringRules: RecurringRule[] = [],
  opts: ObligationOpts = {},
): number {
  const sobra = remainingAfterObligations(income, expenses, loans, installmentPlans, obligationMonthKey, accounts, recurringRules, opts);
  const days = Math.max(1, daysRemaining());
  return Math.max(0, sobra / days);
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

export function dailyStatusRealistic(
  income: Income,
  expenses: Expense[],
  loans: Loan[],
  plans: InstallmentPlan[],
  obligationMonthKey: string,
  accounts: Account[] = [],
  recurringRules: RecurringRule[] = [],
  opts: ObligationOpts = {},
): Status {
  const sobra = remainingAfterObligations(income, expenses, loans, plans, obligationMonthKey, accounts, recurringRules, opts);
  if (sobra <= 0) return "danger";
  const limit = dailyLimitRealistic(income, expenses, loans, plans, obligationMonthKey, accounts, recurringRules, opts);
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

// ---- Calendar helpers ----
export type DayCell = {
  date: Date;
  day: number;
  isWeekend: boolean;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  inMonth: boolean;
  spent: number;          // actual spent that day (past/today)
  projected: number;      // projected spend that day (future)
  dailyLimit: number;     // even daily limit for that day from remaining budget
  cumulativeBalance: number; // remaining budget after this day
  status: "safe" | "warn" | "danger" | "future-safe" | "future-danger" | "empty";
};

export type MonthCalendar = {
  cells: DayCell[];        // padded to start on Sunday (length multiple of 7)
  monthDays: DayCell[];    // only days in the month
  income: number;
  spentSoFar: number;
  remaining: number;
  remainingDays: number;
  evenDailyLimit: number;  // remaining / remainingDays
  projectedTotal: number;  // spent + projected for future days at evenDailyLimit
  endBalance: number;      // income - projectedTotal
};

export function buildMonthCalendar(
  monthKeyStr: string,
  income: Income,
  expenses: Expense[],
  extraDailyProjection?: number,
): MonthCalendar {
  const { year, month } = parseMonthKey(monthKeyStr);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const totalDays = lastDay.getDate();
  const today = new Date();
  const todayKey = today.toDateString();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month - 1;

  // group expenses by day-of-month
  const byDay = new Map<number, number>();
  for (const e of expenses) {
    const d = new Date(e.occurred_at);
    if (d.getFullYear() === year && d.getMonth() === month - 1) {
      byDay.set(d.getDate(), (byDay.get(d.getDate()) ?? 0) + Number(e.amount));
    }
  }

  const totalIncome = expectedMonthlyIncome(income);
  const spentSoFar = Array.from(byDay.entries())
    .filter(([d]) => !isCurrentMonth || d <= today.getDate())
    .reduce((a, [, v]) => a + v, 0);

  // remaining days: future days inclusive of today (for current month); for past months: 0; future months: all days
  let remainingDays: number;
  if (isCurrentMonth) {
    remainingDays = totalDays - today.getDate() + 1;
  } else if (today > lastDay) {
    remainingDays = 0;
  } else {
    remainingDays = totalDays;
  }
  const remaining = totalIncome - spentSoFar;
  const evenDailyLimit = remainingDays > 0 ? Math.max(0, remaining / remainingDays) : 0;
  const projectionPerDay = extraDailyProjection ?? evenDailyLimit;

  const monthDays: DayCell[] = [];
  let cumulative = totalIncome;
  for (let d = 1; d <= totalDays; d += 1) {
    const date = new Date(year, month - 1, d);
    const weekDay = date.getDay();
    const isWeekend = weekDay === 0 || weekDay === 6;
    const isToday = date.toDateString() === todayKey;
    const isPast = isCurrentMonth ? d < today.getDate() : date < firstDay ? false : (date < new Date(today.getFullYear(), today.getMonth(), 1));
    const isFuture = isCurrentMonth ? d > today.getDate() : date > today;
    const spent = !isFuture ? (byDay.get(d) ?? 0) : 0;
    const projected = isFuture ? projectionPerDay : 0;
    cumulative -= spent + projected;

    let status: DayCell["status"] = "empty";
    if (isFuture) {
      status = cumulative < 0 ? "future-danger" : "future-safe";
    } else if (spent === 0) {
      status = "empty";
    } else if (evenDailyLimit > 0 && spent > evenDailyLimit * 1.25) {
      status = "danger";
    } else if (evenDailyLimit > 0 && spent > evenDailyLimit * 0.9) {
      status = "warn";
    } else {
      status = "safe";
    }

    monthDays.push({
      date, day: d, isWeekend, isToday, isPast, isFuture, inMonth: true,
      spent, projected, dailyLimit: evenDailyLimit,
      cumulativeBalance: cumulative,
      status,
    });
  }

  // Pad cells to start on Sunday
  const leading = firstDay.getDay();
  const cells: DayCell[] = [];
  for (let i = 0; i < leading; i += 1) {
    const date = new Date(year, month - 1, i - leading + 1);
    cells.push({
      date, day: date.getDate(), isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isToday: false, isPast: true, isFuture: false, inMonth: false,
      spent: 0, projected: 0, dailyLimit: 0, cumulativeBalance: 0, status: "empty",
    });
  }
  cells.push(...monthDays);
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const date = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    cells.push({
      date, day: date.getDate(), isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isToday: false, isPast: false, isFuture: true, inMonth: false,
      spent: 0, projected: 0, dailyLimit: 0, cumulativeBalance: 0, status: "empty",
    });
  }

  const projectedFuture = monthDays.filter(d => d.isFuture).reduce((a, d) => a + d.projected, 0);
  const projectedTotal = spentSoFar + projectedFuture;
  const endBalance = totalIncome - projectedTotal;

  return {
    cells, monthDays,
    income: totalIncome, spentSoFar, remaining, remainingDays,
    evenDailyLimit, projectedTotal, endBalance,
  };
}
