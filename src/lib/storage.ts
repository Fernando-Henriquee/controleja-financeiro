import type { AppState, Account } from "./types";

const KEY = "copilot-financeiro-v1";

const defaultAccounts: Account[] = [
  { id: "itau", name: "Itaú", color: "#ec7000", balance: 2400, creditLimit: 5000, creditUsed: 0 },
  { id: "nubank", name: "Nubank", color: "#8a05be", balance: 850, creditLimit: 3500, creditUsed: 0 },
  { id: "nubank-pj", name: "Nubank PJ", color: "#5b0a8c", balance: 1200, creditLimit: 2000, creditUsed: 0 },
  { id: "picpay", name: "PicPay", color: "#11c76f", balance: 120, creditLimit: 800, creditUsed: 0 },
  { id: "mercadopago", name: "Mercado Pago", color: "#00b1ea", balance: 340, creditLimit: 1500, creditUsed: 0 },
];

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const today = new Date();
  return {
    accounts: defaultAccounts,
    expenses: [],
    income: { hourlyRate: 50, hoursPerDay: 8, workingDays: 22, manualAdjustment: 0 },
    monthStart: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(),
  };
}

export function saveState(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}
