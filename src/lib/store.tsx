import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Account, AccountKind, Expense, ExpensePattern, Income, InstallmentPlan, Loan, PaymentMethod, Profile, RecurringRule, Reminder } from "./types";
import { businessDaysInMonth, businessDaysInMonthKey, monthDateRange, monthKey, parseExpenseWithHistory } from "./finance";
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
  installmentPlans: InstallmentPlan[];

  addExpenseFromText: (text: string) => Promise<{ expense: Expense | null; error?: string }>;
  addExpenseManual: (input: { amount: number; description: string; category?: string; method: PaymentMethod; account_id: string }) => Promise<{ expense: Expense | null; error?: string }>;
  removeExpense: (id: string) => Promise<void>;
  updateExpense: (id: string, patch: Partial<Pick<Expense, "amount" | "description" | "category" | "method" | "account_id" | "occurred_at">>) => Promise<void>;
  updateAccount: (id: string, patch: Partial<Pick<Account, "name" | "color" | "balance" | "credit_limit" | "credit_used" | "overdraft_limit">>) => Promise<void>;
  updateAccountCreditLimit: (accountId: string, creditLimit: number | null) => Promise<void>;
  updateAccountCreditUsed: (accountId: string, creditUsed: number) => Promise<void>;
  payCreditInvoice: (creditAccountId: string, fromDebitAccountId?: string) => Promise<{ amount: number; fromDebit: Account | undefined } | void>;
  addCreditAccount: (name: string, color: string, creditLimit: number) => Promise<void>;
  addDebitAccount: (name: string, color: string, balance: number, overdraftLimit?: number | null) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  updateIncome: (patch: Partial<Income>, opts?: { applyToFuture?: boolean }) => Promise<void>;
  addRecurringRule: (rule: Omit<RecurringRule, "id" | "profile_id" | "applied_months" | "paid_months">) => Promise<void>;
  removeRecurringRule: (id: string) => Promise<void>;
  markRecurringPaid: (ruleId: string, monthKey: string, overrides?: { account_id?: string; method?: PaymentMethod }) => Promise<void>;
  unmarkRecurringPaid: (ruleId: string, monthKey: string) => Promise<void>;
  addReminder: (reminder: Omit<Reminder, "id" | "profile_id">) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  addLoan: (loan: Omit<Loan, "id" | "profile_id">) => Promise<void>;
  updateLoan: (id: string, patch: Partial<Omit<Loan, "id" | "profile_id">>) => Promise<void>;
  removeLoan: (id: string) => Promise<void>;
  addInstallmentPlan: (input: Omit<InstallmentPlan, "id" | "profile_id">) => Promise<void>;
  updateInstallmentPlan: (id: string, patch: Partial<Omit<InstallmentPlan, "id" | "profile_id">>) => Promise<void>;
  removeInstallmentPlan: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const StoreContext = createContext<Ctx | null>(null);

const DEFAULT_INCOME: Income = { mode: "pj", monthly_salary: 0, hourly_rate: 0, working_days: 0, worked_hours: null, extra_income: 0, deposit_account_id: null, paid_at: null };

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
  const [loans, setLoans] = useState<Loan[]>([]);
  const [installmentPlans, setInstallmentPlans] = useState<InstallmentPlan[]>([]);
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
      setLoans([]); setInstallmentPlans([]);
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
      setRecurringRules([]); setReminders([]); setPatterns([]); setLoans([]); setInstallmentPlans([]);
      return;
    }
    const range = monthDateRange(selectedMonth);
    const [a, e, i, ir, rr, re, ep, ln, ip] = await Promise.all([
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
      supabase.from("loans").select("*").eq("profile_id", activeProfile.id).order("created_at", { ascending: false }),
      supabase.from("installment_plans").select("*").eq("profile_id", activeProfile.id).order("created_at", { ascending: false }),
    ]);
    setAccounts((a.data ?? []) as Account[]);
    setExpenses((e.data ?? []) as Expense[]);
    setRecurringRules((rr.data ?? []) as RecurringRule[]);
    setReminders((re.data ?? []) as Reminder[]);
    setPatterns((ep.data ?? []) as ExpensePattern[]);
    setLoans((ln.data ?? []) as Loan[]);
    setInstallmentPlans(
      (ip.data ?? []).map((row) => ({
        id: row.id,
        profile_id: row.profile_id,
        account_id: row.account_id,
        description: row.description ?? "",
        total_amount: Number(row.total_amount ?? 0),
        installment_count: Number(row.installment_count ?? 1),
        installment_amount: Number(row.installment_amount ?? 0),
        first_month_key: row.first_month_key,
        paid_installments: Number(row.paid_installments ?? 0),
      })),
    );
    if (ir.data) {
      setIncome({
        mode: (ir.data.mode as "clt" | "pj") ?? "pj",
        monthly_salary: Number(ir.data.monthly_salary ?? 0),
        hourly_rate: Number(ir.data.hourly_rate ?? 0),
        working_days: Number(ir.data.working_days ?? 0),
        worked_hours: ir.data.worked_hours != null ? Number(ir.data.worked_hours) : null,
        extra_income: Number(ir.data.extra_income ?? 0),
        deposit_account_id: (ir.data as any).deposit_account_id ?? null,
        paid_at: (ir.data as any).paid_at ?? null,
      });
    } else if (i.data) {
      setIncome({
        mode: (i.data.mode as "clt" | "pj") ?? "pj",
        monthly_salary: Number(i.data.monthly_salary ?? 0),
        hourly_rate: Number(i.data.hourly_rate ?? 0),
        working_days: Number(i.data.working_days ?? 0),
        worked_hours: null,
        extra_income: Number(i.data.extra_income ?? 0),
        deposit_account_id: null,
        paid_at: null,
      });
    } else {
      setIncome(DEFAULT_INCOME);
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

  const payCreditInvoice = useCallback(async (creditAccountId: string, fromDebitAccountId?: string) => {
    const card = accounts.find((a) => a.id === creditAccountId);
    if (!card) return;
    const amount = Number(card.credit_used ?? 0);
    if (amount <= 0) return;
    // Pick debit account: explicit -> same name -> first debit
    const fromDebit =
      accounts.find((a) => a.id === fromDebitAccountId && a.kind === "debit") ??
      accounts.find((a) => a.kind === "debit" && a.name.toLowerCase() === card.name.toLowerCase()) ??
      accounts.find((a) => a.kind === "debit");
    await supabase.from("accounts").update({ credit_used: 0 }).eq("id", card.id);
    setAccounts((prev) => prev.map((a) => (a.id === card.id ? { ...a, credit_used: 0 } : a)));
    if (fromDebit) {
      const newBalance = Number(fromDebit.balance) - amount;
      await supabase.from("accounts").update({ balance: newBalance }).eq("id", fromDebit.id);
      setAccounts((prev) => prev.map((a) => (a.id === fromDebit.id ? { ...a, balance: newBalance } : a)));
    }
    return { amount, fromDebit };
  }, [accounts]);


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
      kind: "credit",
    } as any).select().single();
    if (data) setAccounts((prev) => [...prev, data as Account]);
  }, [activeProfile, accounts]);

  const addDebitAccount = useCallback(async (name: string, color: string, balance: number, overdraftLimit?: number | null) => {
    if (!activeProfile) return;
    const nextPosition = accounts.length ? Math.max(...accounts.map((a) => Number(a.position))) + 1 : 0;
    const { data } = await supabase.from("accounts").insert({
      profile_id: activeProfile.id,
      name,
      color,
      balance,
      credit_limit: null,
      credit_used: 0,
      position: nextPosition,
      kind: "debit",
      overdraft_limit: overdraftLimit && overdraftLimit > 0 ? overdraftLimit : null,
    } as any).select().single();
    if (data) setAccounts((prev) => [...prev, data as Account]);
  }, [activeProfile, accounts]);

  const updateAccount = useCallback(async (id: string, patch: Partial<Pick<Account, "name" | "color" | "balance" | "credit_limit" | "credit_used" | "overdraft_limit">>) => {
    await supabase.from("accounts").update(patch as any).eq("id", id);
    setAccounts((prev) => prev.map((a) => a.id === id ? { ...a, ...patch } : a));
  }, []);

  const updateExpense = useCallback(async (id: string, patch: Partial<Pick<Expense, "amount" | "description" | "category" | "method" | "account_id" | "occurred_at">>) => {
    const prev = expenses.find((e) => e.id === id);
    if (!prev) return;
    // Reverse old account effect
    const oldAcc = accounts.find((a) => a.id === prev.account_id);
    if (oldAcc) {
      const reverse = prev.method === "credit"
        ? { credit_used: Math.max(0, Number(oldAcc.credit_used) - Number(prev.amount)) }
        : { balance: Number(oldAcc.balance) + Number(prev.amount) };
      await supabase.from("accounts").update(reverse).eq("id", oldAcc.id);
      setAccounts((p) => p.map((a) => a.id === oldAcc.id ? { ...a, ...reverse } : a));
    }
    const next: Expense = { ...prev, ...patch } as Expense;
    await supabase.from("expenses").update(patch as any).eq("id", id);
    setExpenses((p) => p.map((e) => e.id === id ? next : e));
    // Apply new account effect
    const newAcc = (await supabase.from("accounts").select("*").eq("id", next.account_id).maybeSingle()).data as Account | null;
    if (newAcc) {
      const apply = next.method === "credit"
        ? { credit_used: Number(newAcc.credit_used) + Number(next.amount) }
        : { balance: Number(newAcc.balance) - Number(next.amount) };
      await supabase.from("accounts").update(apply).eq("id", newAcc.id);
      setAccounts((p) => p.map((a) => a.id === newAcc.id ? { ...a, ...apply } : a));
    }
  }, [expenses, accounts]);

  const removeAccount = useCallback(async (id: string) => {
    await supabase.from("accounts").delete().eq("id", id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addExpenseManual = useCallback(async (input: { amount: number; description: string; category?: string; method: PaymentMethod; account_id: string }) => {
    if (!activeProfile) return { expense: null, error: "Selecione um perfil." };
    if (!input.amount || input.amount <= 0) return { expense: null, error: "Valor inválido." };
    const { data, error } = await supabase.from("expenses").insert({
      profile_id: activeProfile.id,
      account_id: input.account_id,
      amount: input.amount,
      description: input.description || "Gasto",
      category: input.category || "Outros",
      method: input.method,
      raw: null,
    }).select().single();
    if (error || !data) return { expense: null, error: error?.message ?? "Falha ao salvar." };
    const acc = accounts.find((a) => a.id === input.account_id);
    if (acc) {
      const patch = input.method === "credit"
        ? { credit_used: Number(acc.credit_used) + input.amount }
        : { balance: Number(acc.balance) - input.amount };
      await supabase.from("accounts").update(patch).eq("id", acc.id);
      setAccounts((prev) => prev.map((a) => a.id === acc.id ? { ...a, ...patch } : a));
    }
    setExpenses((prev) => [data as Expense, ...prev]);
    return { expense: data as Expense };
  }, [activeProfile, accounts]);

  const updateIncome = useCallback(async (patch: Partial<Income>, opts?: { applyToFuture?: boolean }) => {
    if (!activeProfile) return;
    const next = { ...income, ...patch };
    setIncome(next);
    const payload = {
      mode: next.mode,
      monthly_salary: next.monthly_salary,
      hourly_rate: next.hourly_rate,
      working_days: next.working_days,
      worked_hours: next.worked_hours ?? null,
      extra_income: next.extra_income,
      deposit_account_id: next.deposit_account_id ?? null,
    };
    await supabase.from("income_settings").upsert({ profile_id: activeProfile.id, ...payload } as any);
    const months: string[] = [selectedMonth];
    if (opts?.applyToFuture) {
      const [y, m] = selectedMonth.split("-").map(Number);
      const baseDate = new Date(y, m - 1, 1);
      const today = new Date();
      const startMonth = baseDate >= new Date(today.getFullYear(), today.getMonth(), 1) ? baseDate : new Date(today.getFullYear(), today.getMonth(), 1);
      const startYear = startMonth.getFullYear();
      const startMonthIdx = startMonth.getMonth();
      months.length = 0;
      for (let mi = startMonthIdx; mi < 12; mi += 1) {
        months.push(`${startYear}-${String(mi + 1).padStart(2, "0")}`);
      }
    }
    const rows = months.map((mk) => ({
      profile_id: activeProfile.id,
      month_key: mk,
      ...payload,
      updated_at: new Date().toISOString(),
    }));
    await supabase.from("income_records").upsert(rows as any, { onConflict: "profile_id,month_key" });
  }, [income, activeProfile, selectedMonth]);

  useEffect(() => {
    if (!activeProfile || !recurringRules.length) return;
    const now = new Date();
    const key = monthKey(now);
    const due = recurringRules.filter((r) => r.auto_apply && r.day_of_month <= now.getDate() && !r.applied_months.includes(key));
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
        const nextApplied = [...rule.applied_months, key];
        const nextPaid = rule.paid_months.includes(key) ? rule.paid_months : [...rule.paid_months, key];
        await supabase.from("recurring_rules").update({ applied_months: nextApplied, paid_months: nextPaid }).eq("id", rule.id);
        setRecurringRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, applied_months: nextApplied, paid_months: nextPaid } : r));
      }
    })();
  }, [activeProfile, recurringRules, accounts]);

  const addRecurringRule = useCallback(async (rule: Omit<RecurringRule, "id" | "profile_id" | "applied_months" | "paid_months">) => {
    if (!activeProfile) return;
    const { data } = await supabase.from("recurring_rules").insert({
      profile_id: activeProfile.id,
      ...rule,
      applied_months: [],
      paid_months: [],
    }).select().single();
    if (data) setRecurringRules((prev) => [data as RecurringRule, ...prev]);
  }, [activeProfile]);

  const removeRecurringRule = useCallback(async (id: string) => {
    await supabase.from("recurring_rules").delete().eq("id", id);
    setRecurringRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const markRecurringPaid = useCallback(async (ruleId: string, mKey: string, overrides?: { account_id?: string; method?: PaymentMethod }) => {
    if (!activeProfile) return;
    const rule = recurringRules.find((r) => r.id === ruleId);
    if (!rule) return;
    if (rule.paid_months.includes(mKey)) return;

    const payAccountId = overrides?.account_id ?? rule.account_id;
    const payMethod: PaymentMethod = overrides?.method ?? rule.method;

    // Create the expense, dated within the target month at the rule's payment day
    const [yy, mm] = mKey.split("-").map(Number);
    const lastDay = new Date(yy, mm, 0).getDate();
    const day = Math.min(rule.day_of_month, lastDay);
    const occurredAt = new Date(yy, mm - 1, day, 12, 0, 0).toISOString();

    const { data } = await supabase.from("expenses").insert({
      profile_id: activeProfile.id,
      account_id: payAccountId,
      amount: rule.amount,
      description: `[Recorrente] ${rule.description}`,
      category: rule.category,
      method: payMethod,
      raw: `recorrente:${rule.id}:${mKey}`,
      occurred_at: occurredAt,
    }).select().single();
    if (!data) return;

    const acc = accounts.find((a) => a.id === payAccountId);
    if (acc) {
      const patch = payMethod === "credit"
        ? { credit_used: Number(acc.credit_used) + Number(rule.amount) }
        : { balance: Number(acc.balance) - Number(rule.amount) };
      await supabase.from("accounts").update(patch).eq("id", acc.id);
      setAccounts((prev) => prev.map((a) => a.id === acc.id ? { ...a, ...patch } : a));
    }
    setExpenses((prev) => [data as Expense, ...prev]);

    const nextPaid = [...rule.paid_months, mKey];
    const nextApplied = rule.applied_months.includes(mKey) ? rule.applied_months : [...rule.applied_months, mKey];
    await supabase.from("recurring_rules").update({ paid_months: nextPaid, applied_months: nextApplied }).eq("id", ruleId);
    setRecurringRules((prev) => prev.map((r) => r.id === ruleId ? { ...r, paid_months: nextPaid, applied_months: nextApplied } : r));
  }, [activeProfile, recurringRules, accounts]);

  const unmarkRecurringPaid = useCallback(async (ruleId: string, mKey: string) => {
    const rule = recurringRules.find((r) => r.id === ruleId);
    if (!rule) return;
    // Remove the expense tagged for this rule + month
    const tag = `recorrente:${ruleId}:${mKey}`;
    const { data: exps } = await supabase.from("expenses").select("*").eq("raw", tag);
    for (const e of (exps ?? []) as Expense[]) {
      await supabase.from("expenses").delete().eq("id", e.id);
      const acc = accounts.find((a) => a.id === e.account_id);
      if (acc) {
        const patch = e.method === "credit"
          ? { credit_used: Math.max(0, Number(acc.credit_used) - Number(e.amount)) }
          : { balance: Number(acc.balance) + Number(e.amount) };
        await supabase.from("accounts").update(patch).eq("id", acc.id);
        setAccounts((prev) => prev.map((a) => a.id === acc.id ? { ...a, ...patch } : a));
      }
      setExpenses((prev) => prev.filter((x) => x.id !== e.id));
    }
    const nextPaid = rule.paid_months.filter((m) => m !== mKey);
    const nextApplied = rule.applied_months.filter((m) => m !== mKey);
    await supabase.from("recurring_rules").update({ paid_months: nextPaid, applied_months: nextApplied }).eq("id", ruleId);
    setRecurringRules((prev) => prev.map((r) => r.id === ruleId ? { ...r, paid_months: nextPaid, applied_months: nextApplied } : r));
  }, [recurringRules, accounts]);

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

  const addLoan = useCallback(async (loan: Omit<Loan, "id" | "profile_id">) => {
    if (!activeProfile) return;
    const { data } = await supabase.from("loans").insert({
      profile_id: activeProfile.id,
      ...loan,
    }).select().single();
    if (data) setLoans((prev) => [data as Loan, ...prev]);
  }, [activeProfile]);

  const updateLoan = useCallback(async (id: string, patch: Partial<Omit<Loan, "id" | "profile_id">>) => {
    const { data } = await supabase.from("loans").update(patch).eq("id", id).select().single();
    if (data) setLoans((prev) => prev.map((l) => l.id === id ? (data as Loan) : l));
  }, []);

  const removeLoan = useCallback(async (id: string) => {
    await supabase.from("loans").delete().eq("id", id);
    setLoans((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const addInstallmentPlan = useCallback(async (input: Omit<InstallmentPlan, "id" | "profile_id">) => {
    if (!activeProfile) return;
    const { data } = await supabase.from("installment_plans").insert({
      profile_id: activeProfile.id,
      account_id: input.account_id,
      description: input.description,
      total_amount: input.total_amount,
      installment_count: input.installment_count,
      installment_amount: input.installment_amount,
      first_month_key: input.first_month_key,
      paid_installments: input.paid_installments,
    }).select().single();
    if (data) {
      const row = data as Record<string, unknown>;
      setInstallmentPlans((prev) => [
        {
          id: String(row.id),
          profile_id: String(row.profile_id),
          account_id: String(row.account_id),
          description: String(row.description ?? ""),
          total_amount: Number(row.total_amount ?? 0),
          installment_count: Number(row.installment_count ?? 1),
          installment_amount: Number(row.installment_amount ?? 0),
          first_month_key: String(row.first_month_key),
          paid_installments: Number(row.paid_installments ?? 0),
        },
        ...prev,
      ]);
    }
  }, [activeProfile]);

  const updateInstallmentPlan = useCallback(async (id: string, patch: Partial<Omit<InstallmentPlan, "id" | "profile_id">>) => {
    const { data } = await supabase.from("installment_plans").update(patch).eq("id", id).select().single();
    if (data) {
      const row = data as Record<string, unknown>;
      const next: InstallmentPlan = {
        id: String(row.id),
        profile_id: String(row.profile_id),
        account_id: String(row.account_id),
        description: String(row.description ?? ""),
        total_amount: Number(row.total_amount ?? 0),
        installment_count: Number(row.installment_count ?? 1),
        installment_amount: Number(row.installment_amount ?? 0),
        first_month_key: String(row.first_month_key),
        paid_installments: Number(row.paid_installments ?? 0),
      };
      setInstallmentPlans((prev) => prev.map((p) => (p.id === id ? next : p)));
    }
  }, []);

  const removeInstallmentPlan = useCallback(async (id: string) => {
    await supabase.from("installment_plans").delete().eq("id", id);
    setInstallmentPlans((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const effectiveIncome = useMemo<Income>(() => {
    if (income.mode !== "pj") return income;
    const days = businessDaysInMonthKey(selectedMonth);
    return {
      ...income,
      working_days: days,
      worked_hours: income.worked_hours && income.worked_hours > 0 ? income.worked_hours : days * 8,
    };
  }, [income, selectedMonth]);

  const value = useMemo<Ctx>(() => ({
    loading, profiles, activeProfile, selectedMonth, setActiveProfile, setSelectedMonth,
    createProfile, deleteProfile,
    accounts, expenses, income: effectiveIncome, recurringRules, reminders, patterns, loans, installmentPlans,
    addExpenseFromText, addExpenseManual, removeExpense, updateExpense, updateAccount,
    updateAccountCreditLimit, updateAccountCreditUsed, payCreditInvoice, addCreditAccount, addDebitAccount, removeAccount,
    updateIncome,
    addRecurringRule, removeRecurringRule, markRecurringPaid, unmarkRecurringPaid, addReminder, removeReminder,
    addLoan, updateLoan, removeLoan,
    addInstallmentPlan, updateInstallmentPlan, removeInstallmentPlan,
    refresh,
  }), [loading, profiles, activeProfile, selectedMonth, setActiveProfile, createProfile, deleteProfile, accounts, expenses, effectiveIncome, recurringRules, reminders, patterns, loans, installmentPlans, addExpenseFromText, addExpenseManual, removeExpense, updateExpense, updateAccount, updateAccountCreditLimit, updateAccountCreditUsed, payCreditInvoice, addCreditAccount, addDebitAccount, removeAccount, updateIncome, addRecurringRule, removeRecurringRule, markRecurringPaid, unmarkRecurringPaid, addReminder, removeReminder, addLoan, updateLoan, removeLoan, addInstallmentPlan, updateInstallmentPlan, removeInstallmentPlan, refresh]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const c = useContext(StoreContext);
  if (!c) throw new Error("useStore must be used within StoreProvider");
  return c;
}
