import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { AppState, Expense } from "./types";
import { loadState, saveState } from "./storage";
import { parseExpense } from "./parser";

type Ctx = {
  state: AppState;
  addExpenseFromText: (text: string) => Expense | null;
  removeExpense: (id: string) => void;
  updateIncome: (income: Partial<AppState["income"]>) => void;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => { saveState(state); }, [state]);

  const value = useMemo<Ctx>(() => ({
    state,
    addExpenseFromText: (text) => {
      const parsed = parseExpense(text, state.accounts);
      if (!parsed) return null;
      const exp: Expense = { ...parsed, id: crypto.randomUUID(), date: new Date().toISOString() };
      setState(s => {
        const accounts = s.accounts.map(a => {
          if (a.id !== exp.accountId) return a;
          if (exp.method === "credit") return { ...a, creditUsed: (a.creditUsed ?? 0) + exp.amount };
          return { ...a, balance: a.balance - exp.amount };
        });
        return { ...s, accounts, expenses: [exp, ...s.expenses] };
      });
      return exp;
    },
    removeExpense: (id) => setState(s => {
      const exp = s.expenses.find(e => e.id === id);
      if (!exp) return s;
      const accounts = s.accounts.map(a => {
        if (a.id !== exp.accountId) return a;
        if (exp.method === "credit") return { ...a, creditUsed: Math.max(0, (a.creditUsed ?? 0) - exp.amount) };
        return { ...a, balance: a.balance + exp.amount };
      });
      return { ...s, accounts, expenses: s.expenses.filter(e => e.id !== id) };
    }),
    updateIncome: (income) => setState(s => ({ ...s, income: { ...s.income, ...income } })),
  }), [state]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
