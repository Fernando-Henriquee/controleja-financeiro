import type { AppState } from "./types";

export function expectedMonthlyIncome(s: AppState): number {
  const { hourlyRate, hoursPerDay, workingDays, manualAdjustment = 0 } = s.income;
  return hourlyRate * hoursPerDay * workingDays + manualAdjustment;
}

export function totalBalance(s: AppState): number {
  return s.accounts.reduce((acc, a) => acc + a.balance, 0);
}

export function totalCreditUsed(s: AppState): number {
  return s.accounts.reduce((acc, a) => acc + (a.creditUsed ?? 0), 0);
}

export function monthSpent(s: AppState): number {
  const start = new Date(s.monthStart).getTime();
  return s.expenses.filter(e => new Date(e.date).getTime() >= start).reduce((a, e) => a + e.amount, 0);
}

export function todaySpent(s: AppState): number {
  const today = new Date();
  const k = today.toDateString();
  return s.expenses.filter(e => new Date(e.date).toDateString() === k).reduce((a, e) => a + e.amount, 0);
}

export function daysRemaining(s: AppState): number {
  const today = new Date();
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return Math.max(1, last - today.getDate() + 1);
}

export function dailyLimit(s: AppState): number {
  const income = expectedMonthlyIncome(s);
  const spent = monthSpent(s);
  const remaining = income - spent;
  return Math.max(0, remaining / daysRemaining(s));
}

export type Status = "safe" | "warn" | "danger";

export function dailyStatus(s: AppState): Status {
  const limit = dailyLimit(s);
  const spent = todaySpent(s);
  if (limit <= 0 || spent > limit) return "danger";
  if (spent > limit * 0.75) return "warn";
  return "safe";
}

export function monthProgress(s: AppState): number {
  const income = expectedMonthlyIncome(s);
  if (income <= 0) return 0;
  return Math.min(1, monthSpent(s) / income);
}

export function forecastEndOfMonth(s: AppState): number {
  const today = new Date();
  const day = today.getDate();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const avg = monthSpent(s) / Math.max(1, day);
  return avg * lastDay;
}

export function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
