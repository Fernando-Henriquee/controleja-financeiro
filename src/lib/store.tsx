import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Account, AccountKind, Expense, ExpensePattern, Income, Loan, PaymentMethod, Profile, RecurringRule, Reminder } from "./types";
import { businessDaysInMonth, monthDateRange, monthKey, parseExpenseWithHistory } from "./finance";
import { useAuth } from "./auth";

const ACTIVE_KEY = "copilot.activeProfileId";

type Ctx = {
  loading: boolean;
  profiles: Profile[];
  activeProfile: Profile | null;
  selectedMonth: string;
  setActiveProfile: (p: Profile | null) => void;
  setSelectedMonth: (month: string) => void;
  createProfile: (name: string, emoji: string, color: string) => Promise<Profile | null>;
  deleteProfile: (id: string) => Promise<void>;

  accounts: Account[];
  expenses: Expense[];
  income: Income;
  recurringRules: RecurringRule[];
  reminders: Reminder[];
  patterns: ExpensePattern[];
  loans: Loan[];

  addExpenseFromText: (text: string) => Promise<{ expense: Expense | null; error?: string }>;
  addExpenseManual: (input: { amount: number; description: string; category?: string; method: PaymentMethod; account_id: string }) => Promise<{ expense: Expense | null; error?: string }>;
  removeExpense: (id: string) => Promise<void>;
  updateAccountCreditLimit: (accountId: string, creditLimit: number | null) => Promise<void>;
  updateAccountCreditUsed: (accountId: string, creditUsed: number) => Promise<void>;
  addCreditAccount: (name: string, color: string, creditLimit: number) => Promise<void>;
  addDebitAccount: (name: string, color: string, balance: number) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  updateIncome: (patch: Partial<Income>) => Promise<void>;
  addRecurringRule: (rule: Omit<RecurringRule, "id" | "profile_id" | "applied_months">) => Promise<void>;
  removeRecurringRule: (id: string) => Promise<void>;
  addReminder: (reminder: Omit<Reminder, "id" | "profile_id">) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  addLoan: (loan: Omit<Loan, "id" | "profile_id">) => Promise<void>;
  updateLoan: (id: string, patch: Partial<Omit<Loan, "id" | "profile_id">>) => Promise<void>;
  removeLoan: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const StoreContext = createContext<Ctx | null>(null);

const DEFAULT_INCOME: Income = { mode: "pj", monthly_salary: 0, hourly_rate: 50, working_days: businessDaysInMonth(), extra_income: 0 };

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfileState] = useState<Profile | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(monthKey());
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income>(DEFAULT_INCOME);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [patterns, setPatterns] = useState<ExpensePattern[]>([]);
  const [loading, setLoading] = useState(true);

  const setActiveProfile = useCallback((p: Profile | null) => {
    setActiveProfileState(p);
    if (p) localStorage.setItem(ACTIVE_KEY, p.id);
    else localStorage.removeItem(ACTIVE_KEY);
  }, []);

  // Load profiles when user changes
  useEffect(() => {
    if (!user) {
      setProfiles([]); setActiveProfileState(null);
      setAccounts([]); setExpenses([]); setIncome(DEFAULT_INCOME);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });
      const list = (data ?? []) as Profile[];
      setProfiles(list);
      const savedId = localStorage.getItem(ACTIVE_KEY);
      const found = list.find(p => p.id === savedId) ?? null;
      setActiveProfileState(found);
      setLoading(false);
    })();
  }, [user]);

  const refresh = useCallback(async () => {
    if (!activeProfile) {
      setAccounts([]); setExpenses([]); setIncome(DEFAULT_INCOME);
      setRecurringRules([]); setReminders([]); setPatterns([]);
      return;
    }
    const range = monthDateRange(selectedMonth);
    const [a, e, i, ir, rr, re, ep] = await Promise.all([
      supabase.from("accounts").select("*").eq("profile_id", activeProfile.id).order("position"),
      supabase
        .from("expenses")
        .select("*")
        .eq("profile_id", activeProfile.id)
        .gte("occurred_at", range.startIso)
        .lt("occurred_at", range.endIso)
        .order("occurred_at", { ascending: false })
        .limit(500),
      supabase.from("income_settings").select("*").eq("profile_id", activeProfile.id).maybeSingle(),
      supabase.from("income_records").select("*").eq("profile_id", activeProfile.id).eq("month_key", selectedMonth).maybeSingle(),
      supabase.from("recurring_rules").select("*").eq("profile_id", activeProfile.id).order("created_at", { ascending: false }),
      supabase.from("reminders").select("*").eq("profile_id", activeProfile.id).order("created_at", { ascending: false }),
      supabase.from("expense_patterns").select("*").eq("profile_id", activeProfile.id).order("use_count", { ascending: false }).limit(200),
    ]);
    setAccounts((a.data ?? []) as Account[]);
    setExpenses((e.data ?? []) as Expense[]);
    setRecurringRules((rr.data ?? []) as RecurringRule[]);
    setReminders((re.data ?? []) as Reminder[]);
    setPatterns((ep.data ?? []) as ExpensePattern[]);
    if (ir.data) {
      setIncome({
        mode: (ir.data.mode as "clt" | "pj") ?? "pj",
        monthly_salary: Number(ir.data.monthly_salary ?? 0),
        hourly_rate: Number(ir.data.hourly_rate),
        working_days: Number(ir.data.working_days ?? businessDaysInMonth()),
        extra_income: Number(ir.data.extra_income ?? 0),
      });
    } else if (i.data) {
      setIncome({
        mode: (i.data.mode as "clt" | "pj") ?? "pj",
        monthly_salary: Number(i.data.monthly_salary ?? 0),
        hourly_rate: Number(i.data.hourly_rate),
        working_days: Number(i.data.working_days ?? businessDaysInMonth()),
        extra_income: Number(i.data.extra_income ?? 0),
      });
    }
  }, [activeProfile, selectedMonth]);

  useEffect(() => { refresh(); }, [refresh]);

  const createProfile = useCallback(async (name: string, emoji: string, color: string) => {
    if (!user) return null;
    const { data, error } = await supabase.from("profiles")
      .insert({ name, emoji, color, user_id: user.id })
      .select().single();
    if (error || !data) return null;
    const p = data as Profile;
    setProfiles(prev => [...prev, p]);
    return p;
  }, [user]);

  const deleteProfile = useCallback(async (id: string) => {
    await supabase.from("profiles").delete().eq("id", id);
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (activeProfile?.id === id) setActiveProfile(null);
  }, [activeProfile, setActiveProfile]);

  const addExpenseFromText = useCallback(async (text: string) => {
    if (!activeProfile) return { expense: null, error: "Selecione um perfil para lançar gastos." };
    const parsed = parseExpenseWithHistory(text, accounts, expenses);
    if (!parsed) return { expense: null, error: "Não consegui entender este gasto. Ex: 30 almoço débito itaú" };

    const { data, error } = await supabase.from("expenses").insert({
      profile_id: activeProfile.id,
      account_id: parsed.account_id,
      amount: parsed.amount,
      description: parsed.description,
      category: parsed.category,
      method: parsed.method,
      raw: parsed.raw,
    }).select().single();
    if (error || !data) {
      return {
        expense: null,
        error: error?.message ?? "Falha ao salvar gasto. Verifique permissões e tente novamente.",
      };
    }

    // Update account balance/credit
    const acc = accounts.find(a => a.id === parsed.account_id);
    if (acc) {
      const patch = parsed.method === "credit"
        ? { credit_used: Number(acc.credit_used) + parsed.amount }
        : { balance: Number(acc.balance) - parsed.amount };
      await supabase.from("accounts").update(patch).eq("id", acc.id);
      setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, ...patch } : a));
    }
    const exp = data as Expense;
    setExpenses(prev => [exp, ...prev]);
    const pattern = parsed.description.toLowerCase().trim().slice(0, 120);
    if (pattern) {
      const existing = patterns.find((p) => p.pattern === pattern);
      if (existing) {
        await supabase.from("expense_patterns").update({
          use_count: existing.use_count + 1,
          last_used_at: new Date().toISOString(),
          method: parsed.method,
          account_id: parsed.account_id,
          category: parsed.category,
        }).eq("id", existing.id);
      } else {
        await supabase.from("expense_patterns").insert({
          profile_id: activeProfile.id,
          pattern,
          method: parsed.method,
          account_id: parsed.account_id,
          category: parsed.category,
          use_count: 1,
        });
      }
    }
    return { expense: exp };
  }, [activeProfile, accounts, expenses, patterns]);

  const removeExpense = useCallback(async (id: string) => {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;
    await supabase.from("expenses").delete().eq("id", id);
    const acc = accounts.find(a => a.id === exp.account_id);
    if (acc) {
      const patch = exp.method === "credit"
        ? { credit_used: Math.max(0, Number(acc.credit_used) - Number(exp.amount)) }
        : { balance: Number(acc.balance) + Number(exp.amount) };
      await supabase.from("accounts").update(patch).eq("id", acc.id);
      setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, ...patch } : a));
    }
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, [expenses, accounts]);

  const updateAccountCreditLimit = useCallback(async (accountId: string, creditLimit: number | null) => {
    await supabase.from("accounts").update({ credit_limit: creditLimit }).eq("id", accountId);
    setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, credit_limit: creditLimit } : a)));
  }, []);

  const updateAccountCreditUsed = useCallback(async (accountId: string, creditUsed: number) => {
    const normalized = Math.max(0, creditUsed);
    await supabase.from("accounts").update({ credit_used: normalized }).eq("id", accountId);
    setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, credit_used: normalized } : a)));
  }, []);

  const addCreditAccount = useCallback(async (name: string, color: string, creditLimit: number) => {
    if (!activeProfile) return;
    const nextPosition = accounts.length ? Math.max(...accounts.map((a) => Number(a.position))) + 1 : 0;
    const { data } = await supabase.from("accounts").insert({
      profile_id: activeProfile.id,
      name,
      color,
      balance: 0,
      credit_limit: creditLimit,
      credit_used: 0,
      position: nextPosition,
    }).select().single();
    if (data) setAccounts((prev) => [...prev, data as Account]);
  }, [activeProfile, accounts]);

  const updateIncome = useCallback(async (patch: Partial<Income>) => {
    if (!activeProfile) return;
    const next = { ...income, ...patch };
    if (next.mode === "pj") {
      next.working_days = businessDaysInMonth();
    }
    setIncome(next);
    await supabase.from("income_settings").upsert({
      profile_id: activeProfile.id,
      ...next,
    });
    await supabase.from("income_records").upsert({
      profile_id: activeProfile.id,
      month_key: selectedMonth,
      ...next,
      updated_at: new Date().toISOString(),
    });
  }, [income, activeProfile, selectedMonth]);

  useEffect(() => {
    if (!activeProfile || !recurringRules.length) return;
    const now = new Date();
    const key = monthKey(now);
    const due = recurringRules.filter((r) => r.day_of_month <= now.getDate() && !r.applied_months.includes(key));
    if (!due.length) return;

    (async () => {
      for (const rule of due) {
        const { data, error } = await supabase.from("expenses").insert({
          profile_id: activeProfile.id,
          account_id: rule.account_id,
          amount: rule.amount,
          description: `[Recorrente] ${rule.description}`,
          category: rule.category,
          method: rule.method,
          raw: `recorrente:${rule.id}`,
        }).select().single();
        if (error || !data) continue;

        const acc = accounts.find((a) => a.id === rule.account_id);
        if (acc) {
          const patch = rule.method === "credit"
            ? { credit_used: Number(acc.credit_used) + rule.amount }
            : { balance: Number(acc.balance) - rule.amount };
          await supabase.from("accounts").update(patch).eq("id", acc.id);
          setAccounts((prev) => prev.map((a) => a.id === acc.id ? { ...a, ...patch } : a));
        }
        setExpenses((prev) => [data as Expense, ...prev]);
        setRecurringRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, applied_months: [...r.applied_months, key] } : r));
      }
    })();
  }, [activeProfile, recurringRules, accounts]);

  const addRecurringRule = useCallback(async (rule: Omit<RecurringRule, "id" | "profile_id" | "applied_months">) => {
    if (!activeProfile) return;
    const { data } = await supabase.from("recurring_rules").insert({
      profile_id: activeProfile.id,
      ...rule,
      applied_months: [],
    }).select().single();
    if (data) setRecurringRules((prev) => [data as RecurringRule, ...prev]);
  }, [activeProfile]);

  const removeRecurringRule = useCallback(async (id: string) => {
    await supabase.from("recurring_rules").delete().eq("id", id);
    setRecurringRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addReminder = useCallback(async (reminder: Omit<Reminder, "id" | "profile_id">) => {
    if (!activeProfile) return;
    const { data } = await supabase.from("reminders").insert({
      profile_id: activeProfile.id,
      ...reminder,
    }).select().single();
    if (data) setReminders((prev) => [data as Reminder, ...prev]);
  }, [activeProfile]);

  const removeReminder = useCallback(async (id: string) => {
    await supabase.from("reminders").delete().eq("id", id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const value = useMemo<Ctx>(() => ({
    loading, profiles, activeProfile, selectedMonth, setActiveProfile, setSelectedMonth,
    createProfile, deleteProfile,
    accounts, expenses, income, recurringRules, reminders, patterns,
    addExpenseFromText, removeExpense, updateAccountCreditLimit, updateAccountCreditUsed, addCreditAccount, updateIncome,
    addRecurringRule, removeRecurringRule, addReminder, removeReminder,
    refresh,
  }), [loading, profiles, activeProfile, selectedMonth, setActiveProfile, createProfile, deleteProfile, accounts, expenses, income, recurringRules, reminders, patterns, addExpenseFromText, removeExpense, updateAccountCreditLimit, updateAccountCreditUsed, addCreditAccount, updateIncome, addRecurringRule, removeRecurringRule, addReminder, removeReminder, refresh]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const c = useContext(StoreContext);
  if (!c) throw new Error("useStore must be used within StoreProvider");
  return c;
}
