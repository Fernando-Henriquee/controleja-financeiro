import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Account, AccountKind, CardInvoice, Expense, ExpensePattern, Income, InstallmentPlan, Loan, PaymentMethod, Profile, RecurringRule, Reminder } from "./types";
import { businessDaysInMonth, businessDaysInMonthKey, currentCycleKey, expectedMonthlyIncome, monthDateRange, monthKey, parseExpenseWithHistory, cycleKeyForDate, invoiceWindowFor } from "./finance";
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
  updateProfile: (id: string, patch: Partial<Pick<Profile, "name" | "emoji" | "color" | "cycle_start_day">>) => Promise<void>;

  accounts: Account[];
  expenses: Expense[];
  income: Income;
  recurringRules: RecurringRule[];
  reminders: Reminder[];
  patterns: ExpensePattern[];
  loans: Loan[];
  installmentPlans: InstallmentPlan[];
  cardInvoices: CardInvoice[];

  addExpenseFromText: (text: string) => Promise<{ expense: Expense | null; error?: string }>;
  addExpenseManual: (input: { amount: number; description: string; category?: string; method: PaymentMethod; account_id: string; occurred_at?: string }) => Promise<{ expense: Expense | null; error?: string }>;
  removeExpense: (id: string) => Promise<void>;
  updateExpense: (id: string, patch: Partial<Pick<Expense, "amount" | "description" | "category" | "method" | "account_id" | "occurred_at">>) => Promise<void>;
  updateAccount: (id: string, patch: Partial<Pick<Account, "name" | "color" | "balance" | "credit_limit" | "credit_used" | "overdraft_limit" | "closing_day" | "due_day">>) => Promise<void>;
  updateAccountCreditLimit: (accountId: string, creditLimit: number | null) => Promise<void>;
  updateAccountCreditUsed: (accountId: string, creditUsed: number) => Promise<void>;
  payCreditInvoice: (creditAccountId: string, fromDebitAccountId?: string) => Promise<{ amount: number; fromDebit: Account | undefined } | void>;
  payInvoice: (invoiceId: string, fromDebitAccountId?: string) => Promise<{ amount: number; fromDebit: Account | undefined } | void>;
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
  updateLoan: (id: string, patch: Partial<Omit<Loan, "id" | "profile_id">>, opts?: { paymentAccountId?: string }) => Promise<void>;
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
  const [cardInvoices, setCardInvoices] = useState<CardInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const setActiveProfile = useCallback((p: Profile | null) => {
    setActiveProfileState(p);
    if (p) {
      localStorage.setItem(ACTIVE_KEY, p.id);
      setSelectedMonth(currentCycleKey(p.cycle_start_day ?? 1));
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
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
      if (found) setSelectedMonth(currentCycleKey(found.cycle_start_day ?? 1));
      setLoading(false);
    })();
  }, [user]);

  const refresh = useCallback(async () => {
    if (!activeProfile) {
      setAccounts([]); setExpenses([]); setIncome(DEFAULT_INCOME);
      setRecurringRules([]); setReminders([]); setPatterns([]); setLoans([]); setInstallmentPlans([]);
      return;
    }
    const range = monthDateRange(selectedMonth, activeProfile.cycle_start_day ?? 1);
    const [a, e, i, ir, rr, re, ep, ln, ip, ci] = await Promise.all([
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
      supabase.from("card_invoices").select("*").eq("profile_id", activeProfile.id).eq("cycle_key", selectedMonth),
    ]);
    setAccounts((a.data ?? []) as Account[]);
    setExpenses((e.data ?? []) as Expense[]);
    setCardInvoices((ci.data ?? []) as CardInvoice[]);
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

  const updateProfile = useCallback(async (id: string, patch: Partial<Pick<Profile, "name" | "emoji" | "color" | "cycle_start_day">>) => {
    await supabase.from("profiles").update(patch as any).eq("id", id);
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
    setActiveProfileState(prev => prev && prev.id === id ? { ...prev, ...patch } : prev);
    // If cycle changed, snap selected month to current cycle
    if (patch.cycle_start_day !== undefined) {
      setSelectedMonth(currentCycleKey(patch.cycle_start_day));
    }
  }, []);

  const addExpenseFromText = useCallback(async (text: string) => {
    if (!activeProfile) return { expense: null, error: "Selecione um perfil para lançar gastos." };
    const parsed = parseExpenseWithHistory(text, accounts, expenses);
    if (!parsed) return { expense: null, error: "Não consegui entender este gasto. Ex: 30 almoço débito itaú" };

    // If credit, ensure invoice for current cycle
    let invoiceId: string | null = null;
    if (parsed.method === "credit") {
      const card = accounts.find((a) => a.id === parsed.account_id);
      const cycleStart = activeProfile.cycle_start_day ?? 1;
      const cycleKey = cycleKeyForDate(new Date(), cycleStart);
      const existing = cardInvoices.find((inv) => inv.account_id === parsed.account_id && inv.cycle_key === cycleKey);
      if (existing) {
        invoiceId = existing.id;
      } else if (card) {
        const win = invoiceWindowFor(cycleKey, cycleStart, card);
        const { data: invRow } = await supabase.from("card_invoices").upsert({
          profile_id: activeProfile.id,
          account_id: parsed.account_id,
          cycle_key: cycleKey,
          period_start: win.period_start,
          period_end: win.period_end,
          due_date: win.due_date,
          total: 0,
          status: "open",
        } as any, { onConflict: "account_id,cycle_key" }).select().single();
        if (invRow) {
          invoiceId = (invRow as CardInvoice).id;
          setCardInvoices((prev) => prev.some((i) => i.id === invoiceId) ? prev : [...prev, invRow as CardInvoice]);
        }
      }
    }

    const { data, error } = await supabase.from("expenses").insert({
      profile_id: activeProfile.id,
      account_id: parsed.account_id,
      amount: parsed.amount,
      description: parsed.description,
      category: parsed.category,
      method: parsed.method,
      raw: parsed.raw,
      invoice_id: invoiceId,
    } as any).select().single();
    if (error || !data) {
      return {
        expense: null,
        error: error?.message ?? "Falha ao salvar gasto. Verifique permissões e tente novamente.",
      };
    }

    if (invoiceId) {
      const inv = cardInvoices.find((i) => i.id === invoiceId);
      const next = Math.max(0, Number(inv?.total ?? 0) + parsed.amount);
      await supabase.from("card_invoices").update({ total: next, updated_at: new Date().toISOString() }).eq("id", invoiceId);
      setCardInvoices((prev) => prev.map((i) => i.id === invoiceId ? { ...i, total: next } : i));
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
  }, [activeProfile, accounts, expenses, patterns, cardInvoices]);

  const removeExpense = useCallback(async (id: string) => {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;
    await supabase.from("expenses").delete().eq("id", id);
    if (!exp.is_pending) {
      const acc = accounts.find(a => a.id === exp.account_id);
      if (acc) {
        const patch = exp.method === "credit"
          ? { credit_used: Math.max(0, Number(acc.credit_used) - Number(exp.amount)) }
          : { balance: Number(acc.balance) + Number(exp.amount) };
        await supabase.from("accounts").update(patch).eq("id", acc.id);
        setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, ...patch } : a));
      }
    }
    if (exp.invoice_id) {
      const inv = cardInvoices.find((i) => i.id === exp.invoice_id);
      if (inv && inv.status !== "paid") {
        const next = Math.max(0, Number(inv.total) - Number(exp.amount));
        await supabase.from("card_invoices").update({ total: next, updated_at: new Date().toISOString() }).eq("id", inv.id);
        setCardInvoices((prev) => prev.map((i) => i.id === inv.id ? { ...i, total: next } : i));
      }
    }
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, [expenses, accounts, cardInvoices]);

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
    if (!activeProfile) return;
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
      // Log the invoice payment as an expense so it appears in the unified list.
      const { data: exp } = await supabase.from("expenses").insert({
        profile_id: activeProfile.id,
        account_id: fromDebit.id,
        amount,
        description: `[Fatura] ${card.name}`,
        category: "Moradia",
        method: "debit",
        raw: `fatura:${card.id}`,
      }).select().single();
      if (exp) setExpenses((prev) => [exp as Expense, ...prev]);
    }
    return { amount, fromDebit };
  }, [accounts, activeProfile]);

  const ensureOpenInvoice = useCallback(async (accountId: string, cycleKey: string): Promise<CardInvoice | null> => {
    if (!activeProfile) return null;
    const card = accounts.find((a) => a.id === accountId);
    if (!card || card.kind !== "credit") return null;
    const existing = cardInvoices.find((inv) => inv.account_id === accountId && inv.cycle_key === cycleKey);
    if (existing) return existing;
    const { data: found } = await supabase
      .from("card_invoices")
      .select("*")
      .eq("account_id", accountId)
      .eq("cycle_key", cycleKey)
      .maybeSingle();
    if (found) {
      const row = found as CardInvoice;
      setCardInvoices((prev) => prev.some((i) => i.id === row.id) ? prev : [...prev, row]);
      return row;
    }
    const win = invoiceWindowFor(cycleKey, activeProfile.cycle_start_day ?? 1, card);
    const { data, error } = await supabase.from("card_invoices").insert({
      profile_id: activeProfile.id,
      account_id: accountId,
      cycle_key: cycleKey,
      period_start: win.period_start,
      period_end: win.period_end,
      due_date: win.due_date,
      total: 0,
      status: "open",
    }).select().single();
    if (error || !data) return null;
    const row = data as CardInvoice;
    setCardInvoices((prev) => [...prev, row]);
    return row;
  }, [accounts, activeProfile, cardInvoices]);

  const bumpInvoiceTotal = useCallback(async (invoiceId: string, delta: number) => {
    const inv = cardInvoices.find((i) => i.id === invoiceId);
    const next = Math.max(0, Number(inv?.total ?? 0) + delta);
    await supabase.from("card_invoices").update({ total: next, updated_at: new Date().toISOString() }).eq("id", invoiceId);
    setCardInvoices((prev) => prev.map((i) => i.id === invoiceId ? { ...i, total: next } : i));
  }, [cardInvoices]);

  const payInvoice = useCallback(async (invoiceId: string, fromDebitAccountId?: string) => {
    if (!activeProfile) return;
    const inv = cardInvoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    const card = accounts.find((a) => a.id === inv.account_id);
    if (!card) return;
    const amount = Number(inv.total ?? 0);
    const fromDebit =
      accounts.find((a) => a.id === fromDebitAccountId && a.kind === "debit") ??
      accounts.find((a) => a.kind === "debit" && a.name.toLowerCase() === card.name.toLowerCase()) ??
      accounts.find((a) => a.kind === "debit");
    const newUsed = Math.max(0, Number(card.credit_used ?? 0) - amount);
    await supabase.from("accounts").update({ credit_used: newUsed }).eq("id", card.id);
    setAccounts((prev) => prev.map((a) => a.id === card.id ? { ...a, credit_used: newUsed } : a));
    await supabase.from("card_invoices").update({
      status: "paid",
      paid_at: new Date().toISOString(),
      paid_from_account_id: fromDebit?.id ?? null,
    }).eq("id", inv.id);
    setCardInvoices((prev) => prev.map((i) => i.id === inv.id ? { ...i, status: "paid", paid_at: new Date().toISOString(), paid_from_account_id: fromDebit?.id ?? null } : i));
    if (fromDebit && amount > 0) {
      const newBalance = Number(fromDebit.balance) - amount;
      await supabase.from("accounts").update({ balance: newBalance }).eq("id", fromDebit.id);
      setAccounts((prev) => prev.map((a) => a.id === fromDebit.id ? { ...a, balance: newBalance } : a));
      const { data: exp } = await supabase.from("expenses").insert({
        profile_id: activeProfile.id,
        account_id: fromDebit.id,
        amount,
        description: `[Fatura ${card.name}]`,
        category: "Moradia",
        method: "debit",
        raw: `fatura:${card.id}:${inv.cycle_key}`,
      }).select().single();
      if (exp) setExpenses((prev) => [exp as Expense, ...prev]);
    }
    return { amount, fromDebit };
  }, [activeProfile, accounts, cardInvoices]);

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

  const addExpenseManual = useCallback(async (input: { amount: number; description: string; category?: string; method: PaymentMethod; account_id: string; occurred_at?: string }) => {
    if (!activeProfile) return { expense: null, error: "Selecione um perfil." };
    if (!input.amount || input.amount <= 0) return { expense: null, error: "Valor inválido." };
    // Detect future date → schedule (pending)
    let isPending = false;
    if (input.occurred_at) {
      const d = new Date(input.occurred_at);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (d.getTime() > today.getTime()) isPending = true;
    }
    // If credit, ensure invoice for the cycle that contains the expense date
    let invoiceId: string | null = null;
    if (input.method === "credit") {
      const card = accounts.find((a) => a.id === input.account_id);
      const cycleStart = activeProfile.cycle_start_day ?? 1;
      const expenseDate = input.occurred_at ? new Date(input.occurred_at) : new Date();
      const cycleKey = cycleKeyForDate(expenseDate, cycleStart);
      const existing = cardInvoices.find((inv) => inv.account_id === input.account_id && inv.cycle_key === cycleKey);
      if (existing) {
        invoiceId = existing.id;
      } else if (card) {
        const win = invoiceWindowFor(cycleKey, cycleStart, card);
        const { data: invRow } = await supabase.from("card_invoices").upsert({
          profile_id: activeProfile.id,
          account_id: input.account_id,
          cycle_key: cycleKey,
          period_start: win.period_start,
          period_end: win.period_end,
          due_date: win.due_date,
          total: 0,
          status: "open",
        } as any, { onConflict: "account_id,cycle_key" }).select().single();
        if (invRow) {
          invoiceId = (invRow as CardInvoice).id;
          setCardInvoices((prev) => prev.some((i) => i.id === invoiceId) ? prev : [...prev, invRow as CardInvoice]);
        }
      }
    }

    const insertPayload: any = {
      profile_id: activeProfile.id,
      account_id: input.account_id,
      amount: input.amount,
      description: input.description || "Gasto",
      category: input.category || "Outros",
      method: input.method,
      raw: null,
      is_pending: isPending,
      invoice_id: invoiceId,
    };
    if (input.occurred_at) insertPayload.occurred_at = input.occurred_at;
    const { data, error } = await supabase.from("expenses").insert(insertPayload).select().single();
    if (error || !data) return { expense: null, error: error?.message ?? "Falha ao salvar." };
    if (!isPending) {
      const acc = accounts.find((a) => a.id === input.account_id);
      if (acc) {
        const patch = input.method === "credit"
          ? { credit_used: Number(acc.credit_used) + input.amount }
          : { balance: Number(acc.balance) - input.amount };
        await supabase.from("accounts").update(patch).eq("id", acc.id);
        setAccounts((prev) => prev.map((a) => a.id === acc.id ? { ...a, ...patch } : a));
      }
    }
    if (invoiceId) {
      const inv = cardInvoices.find((i) => i.id === invoiceId);
      const next = Math.max(0, Number(inv?.total ?? 0) + input.amount);
      await supabase.from("card_invoices").update({ total: next, updated_at: new Date().toISOString() }).eq("id", invoiceId);
      setCardInvoices((prev) => prev.map((i) => i.id === invoiceId ? { ...i, total: next } : i));
    }
    setExpenses((prev) => [data as Expense, ...prev]);
    return { expense: data as Expense };
  }, [activeProfile, accounts, cardInvoices]);

  // Auto-apply pending (future-scheduled) expenses whose date has arrived
  useEffect(() => {
    if (!activeProfile) return;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const due = expenses.filter((e) => e.is_pending && new Date(e.occurred_at).getTime() <= today.getTime());
    if (!due.length) return;
    (async () => {
      for (const exp of due) {
        await supabase.from("expenses").update({ is_pending: false }).eq("id", exp.id);
        const acc = accounts.find((a) => a.id === exp.account_id);
        if (acc) {
          const patch = exp.method === "credit"
            ? { credit_used: Number(acc.credit_used) + Number(exp.amount) }
            : { balance: Number(acc.balance) - Number(exp.amount) };
          await supabase.from("accounts").update(patch).eq("id", acc.id);
          setAccounts((prev) => prev.map((a) => a.id === acc.id ? { ...a, ...patch } : a));
        }
        setExpenses((prev) => prev.map((e) => e.id === exp.id ? { ...e, is_pending: false } : e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile, expenses.length]);

  const updateIncome = useCallback(async (patch: Partial<Income>, opts?: { applyToFuture?: boolean }) => {
    if (!activeProfile) return;
    const prev = income;
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
    const rows = months.map((mk) => {
      const base: any = {
        profile_id: activeProfile.id,
        month_key: mk,
        ...payload,
        updated_at: new Date().toISOString(),
      };
      if (mk === selectedMonth) base.paid_at = next.paid_at ?? null;
      return base;
    });
    await supabase.from("income_records").upsert(rows as any, { onConflict: "profile_id,month_key" });

    // One-time deposit on transition: when paid_at goes from null → set,
    // credit the chosen account balance with the month's expected income.
    // When unset, debit it back. Keeps stored balance authoritative.
    const wasPaid = !!prev.paid_at;
    const isPaid = !!next.paid_at;
    const acctId = next.deposit_account_id ?? prev.deposit_account_id;
    if (acctId && wasPaid !== isPaid) {
      const amount = expectedMonthlyIncome(next);
      const acc = accounts.find((a) => a.id === acctId);
      if (acc && amount > 0) {
        const delta = isPaid ? amount : -amount;
        const newBalance = Number(acc.balance) + delta;
        await supabase.from("accounts").update({ balance: newBalance }).eq("id", acc.id);
        setAccounts((p) => p.map((a) => a.id === acc.id ? { ...a, balance: newBalance } : a));
      }
    }
  }, [income, activeProfile, selectedMonth, accounts]);

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

  const updateLoan = useCallback(async (id: string, patch: Partial<Omit<Loan, "id" | "profile_id">>, opts?: { paymentAccountId?: string }) => {
    const prev = loans.find((l) => l.id === id);
    const { data } = await supabase.from("loans").update(patch).eq("id", id).select().single();
    if (data) {
      setLoans((p) => p.map((l) => l.id === id ? (data as Loan) : l));
      const next = data as Loan;
      const delta = Number(next.paid_installments) - Number(prev?.paid_installments ?? 0);
      if (activeProfile && delta > 0) {
        const debit = accounts.find((a) => a.id === opts?.paymentAccountId && a.kind === "debit")
          ?? accounts.find((a) => a.kind === "debit");
        if (debit) {
          for (let k = 0; k < delta; k += 1) {
            const idx = Number(prev?.paid_installments ?? 0) + k + 1;
            const amount = Number(next.installment_amount);
            const { data: exp } = await supabase.from("expenses").insert({
              profile_id: activeProfile.id,
              account_id: debit.id,
              amount,
              description: `[Empréstimo ${idx}/${next.total_installments}] ${next.bank}`,
              category: "Moradia",
              method: "debit",
              raw: `loan:${next.id}:${idx}`,
            }).select().single();
            if (exp) setExpenses((s) => [exp as Expense, ...s]);
            const newBalance = Number(debit.balance) - amount;
            await supabase.from("accounts").update({ balance: newBalance }).eq("id", debit.id);
            setAccounts((s) => s.map((a) => a.id === debit.id ? { ...a, balance: newBalance } : a));
          }
        }
      }
    }
  }, [loans, accounts, activeProfile]);

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
    const prev = installmentPlans.find((p) => p.id === id);
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
      setInstallmentPlans((p) => p.map((pl) => (pl.id === id ? next : pl)));

      // If a new installment was just paid, log it as an expense so it shows in the list.
      const delta = next.paid_installments - (prev?.paid_installments ?? 0);
      if (activeProfile && delta > 0 && next.account_id) {
        for (let k = 0; k < delta; k += 1) {
          const idx = (prev?.paid_installments ?? 0) + k + 1;
          const { data: exp } = await supabase.from("expenses").insert({
            profile_id: activeProfile.id,
            account_id: next.account_id,
            amount: next.installment_amount,
            description: `[Parcela ${idx}/${next.installment_count}] ${next.description || "Compra parcelada"}`,
            category: "Compras",
            method: "credit",
            raw: `parcela:${next.id}:${idx}`,
          }).select().single();
          if (exp) setExpenses((s) => [exp as Expense, ...s]);
        }
      }
    }
  }, [installmentPlans, activeProfile]);

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
    createProfile, deleteProfile, updateProfile,
    accounts, expenses, income: effectiveIncome, recurringRules, reminders, patterns, loans, installmentPlans,
    addExpenseFromText, addExpenseManual, removeExpense, updateExpense, updateAccount,
    updateAccountCreditLimit, updateAccountCreditUsed, payCreditInvoice, addCreditAccount, addDebitAccount, removeAccount,
    updateIncome,
    addRecurringRule, removeRecurringRule, markRecurringPaid, unmarkRecurringPaid, addReminder, removeReminder,
    addLoan, updateLoan, removeLoan,
    addInstallmentPlan, updateInstallmentPlan, removeInstallmentPlan,
    refresh,
  }), [loading, profiles, activeProfile, selectedMonth, setActiveProfile, createProfile, deleteProfile, updateProfile, accounts, expenses, effectiveIncome, recurringRules, reminders, patterns, loans, installmentPlans, addExpenseFromText, addExpenseManual, removeExpense, updateExpense, updateAccount, updateAccountCreditLimit, updateAccountCreditUsed, payCreditInvoice, addCreditAccount, addDebitAccount, removeAccount, updateIncome, addRecurringRule, removeRecurringRule, markRecurringPaid, unmarkRecurringPaid, addReminder, removeReminder, addLoan, updateLoan, removeLoan, addInstallmentPlan, updateInstallmentPlan, removeInstallmentPlan, refresh]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const c = useContext(StoreContext);
  if (!c) throw new Error("useStore must be used within StoreProvider");
  return c;
}
