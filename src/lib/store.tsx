import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Account, Expense, Income, Profile } from "./types";
import { parseExpense } from "./finance";
import { useAuth } from "./auth";

const ACTIVE_KEY = "copilot.activeProfileId";

type Ctx = {
  loading: boolean;
  profiles: Profile[];
  activeProfile: Profile | null;
  setActiveProfile: (p: Profile | null) => void;
  createProfile: (name: string, emoji: string, color: string) => Promise<Profile | null>;
  deleteProfile: (id: string) => Promise<void>;

  accounts: Account[];
  expenses: Expense[];
  income: Income;

  addExpenseFromText: (text: string) => Promise<Expense | null>;
  removeExpense: (id: string) => Promise<void>;
  updateIncome: (patch: Partial<Income>) => Promise<void>;
  refresh: () => Promise<void>;
};

const StoreContext = createContext<Ctx | null>(null);

const DEFAULT_INCOME: Income = { hourly_rate: 50, hours_per_day: 8, working_days: 22, manual_adjustment: 0 };

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfileState] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income>(DEFAULT_INCOME);
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
      return;
    }
    const [a, e, i] = await Promise.all([
      supabase.from("accounts").select("*").eq("profile_id", activeProfile.id).order("position"),
      supabase.from("expenses").select("*").eq("profile_id", activeProfile.id).order("occurred_at", { ascending: false }).limit(500),
      supabase.from("income_settings").select("*").eq("profile_id", activeProfile.id).maybeSingle(),
    ]);
    setAccounts((a.data ?? []) as Account[]);
    setExpenses((e.data ?? []) as Expense[]);
    if (i.data) {
      setIncome({
        hourly_rate: Number(i.data.hourly_rate),
        hours_per_day: Number(i.data.hours_per_day),
        working_days: Number(i.data.working_days),
        manual_adjustment: Number(i.data.manual_adjustment),
      });
    }
  }, [activeProfile]);

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
    if (!activeProfile) return null;
    const parsed = parseExpense(text, accounts);
    if (!parsed) return null;

    const { data, error } = await supabase.from("expenses").insert({
      profile_id: activeProfile.id,
      account_id: parsed.account_id,
      amount: parsed.amount,
      description: parsed.description,
      category: parsed.category,
      method: parsed.method,
      raw: parsed.raw,
    }).select().single();
    if (error || !data) return null;

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
    return exp;
  }, [activeProfile, accounts]);

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

  const updateIncome = useCallback(async (patch: Partial<Income>) => {
    if (!activeProfile) return;
    const next = { ...income, ...patch };
    setIncome(next);
    await supabase.from("income_settings").update(next).eq("profile_id", activeProfile.id);
  }, [income, activeProfile]);

  const value = useMemo<Ctx>(() => ({
    loading, profiles, activeProfile, setActiveProfile,
    createProfile, deleteProfile,
    accounts, expenses, income,
    addExpenseFromText, removeExpense, updateIncome, refresh,
  }), [loading, profiles, activeProfile, setActiveProfile, createProfile, deleteProfile, accounts, expenses, income, addExpenseFromText, removeExpense, updateIncome, refresh]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const c = useContext(StoreContext);
  if (!c) throw new Error("useStore must be used within StoreProvider");
  return c;
}
