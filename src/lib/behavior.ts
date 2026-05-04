import type { Account, Expense, Income } from "./types";
import { dailyLimit, todaySpent, endOfMonthBalanceIfCurrentPace } from "./finance";

export type AlertLevel = "safe" | "warn" | "danger";

export type BehaviorAlert = {
  id: string;
  level: AlertLevel;
  message: string;
};

function startOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = (day + 6) % 7;
  const base = new Date(now);
  base.setDate(now.getDate() - diff);
  base.setHours(0, 0, 0, 0);
  return base;
}

export function buildBehaviorAlerts(income: Income, expenses: Expense[], accounts: Account[]): BehaviorAlert[] {
  const alerts: BehaviorAlert[] = [];
  const limit = dailyLimit(income, expenses);
  const spentToday = todaySpent(expenses);
  const pct = limit > 0 ? spentToday / limit : 1;
  const paceBalance = endOfMonthBalanceIfCurrentPace(income, expenses);
  const weekStart = startOfWeek().getTime();
  const weekExpenses = expenses.filter((e) => new Date(e.occurred_at).getTime() >= weekStart);
  const twoDaysSpend = weekExpenses
    .slice()
    .sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at))
    .slice(0, 8)
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const weekTotal = weekExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const creditPressure = accounts.reduce((sum, a) => {
    if (!a.credit_limit) return sum;
    return sum + Number(a.credit_used) / Number(a.credit_limit);
  }, 0) / Math.max(1, accounts.filter((a) => !!a.credit_limit).length);

  if (pct >= 1) {
    alerts.push({ id: "today-over", level: "danger", message: "Hoje nao e um bom dia para gastar mais." });
  } else if (pct >= 0.7) {
    alerts.push({ id: "today-70", level: "warn", message: "Voce ja usou mais de 70% do limite diario." });
  } else if (pct >= 0.4) {
    alerts.push({ id: "today-40", level: "warn", message: "Voce ja usou 40% do limite do dia." });
  }

  if (paceBalance < 0) {
    alerts.push({ id: "pace-negative", level: "danger", message: "Se continuar assim, voce pode estourar o mes." });
  }

  if (weekTotal > 0 && twoDaysSpend / weekTotal > 0.7) {
    alerts.push({ id: "week-concentration", level: "warn", message: "Voce gastou grande parte da semana em poucos dias." });
  }

  if (creditPressure >= 0.7) {
    alerts.push({ id: "credit-pressure", level: "danger", message: "Evite usar credito hoje para reduzir pressao das faturas." });
  }

  if (!alerts.length) {
    alerts.push({ id: "all-good", level: "safe", message: "Bom ritmo. Mantenha esse padrao para fechar no verde." });
  }

  return alerts.slice(0, 3);
}
