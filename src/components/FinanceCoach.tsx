import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useMonthPlan } from "@/lib/monthPlan";
import { supabase } from "@/integrations/supabase/client";
import {
  expectedMonthlyIncome,
  monthSpent,
  totalCreditUsed,
  totalLoanInstallmentsDueInMonth,
  totalInstallmentsDueInMonth,
  remainingAfterObligations,
  fmtBRL,
  monthLabel,
} from "@/lib/finance";
import { Sparkles, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

type Advice = {
  diagnosis: string;
  actions: string[];
  savings_goal: number;
  category_goals: { category: string; monthly_cap: number }[];
};

export function FinanceCoach() {
  const { income, expenses, accounts, loans, installmentPlans, recurringRules, selectedMonth, activeProfile } = useStore();
  const { plan, update } = useMonthPlan(activeProfile?.id, selectedMonth);
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<Advice | null>(null);

  const spentByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of expenses) m[e.category] = (m[e.category] ?? 0) + Number(e.amount);
    return m;
  }, [expenses]);

  async function ask() {
    setLoading(true);
    try {
      const renda = expectedMonthlyIncome(income);
      const sobra = remainingAfterObligations(income, expenses, loans, installmentPlans, selectedMonth, accounts, recurringRules, {
        skippedAccountIds: plan.skippedAccountIds,
        skippedRecurringIds: plan.skippedRecurringIds,
        savingsGoal: 0,
      });
      const snapshot = {
        mes: monthLabel(selectedMonth),
        renda_mensal: renda,
        gastos_no_mes: monthSpent(expenses),
        faturas_abertas: totalCreditUsed(accounts),
        emprestimos_mes: totalLoanInstallmentsDueInMonth(loans),
        parcelas_cartao_mes: totalInstallmentsDueInMonth(installmentPlans, selectedMonth),
        sobra_disponivel: sobra,
        gastos_por_categoria: spentByCategory,
        recorrentes: recurringRules.map(r => ({ desc: r.description, valor: Number(r.amount), categoria: r.category, paga: r.paid_months.includes(selectedMonth) })),
      };

      const { data, error } = await supabase.functions.invoke("finance-coach", { body: snapshot });
      if (error) throw error;
      if ((data as any)?.error) { toast.error((data as any).error); return; }
      setAdvice(data as Advice);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao consultar coach");
    } finally {
      setLoading(false);
    }
  }

  function applyAll() {
    if (!advice) return;
    const categoryGoals: Record<string, number> = {};
    for (const g of advice.category_goals) categoryGoals[g.category] = Number(g.monthly_cap);
    update({ savingsGoal: Math.max(0, advice.savings_goal), categoryGoals });
    toast.success("Metas aplicadas ao seu mes");
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="font-display text-sm font-semibold">Coach financeiro IA</p>
        </div>
        <button
          onClick={ask}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {advice ? "Pedir de novo" : "Analisar meu mes"}
        </button>
      </div>

      {!advice && !loading && (
        <p className="mt-2 text-xs text-muted-foreground">
          A IA analisa renda, faturas, recorrentes e gastos por categoria, sugere onde cortar, quanto guardar e teto de gasto por categoria.
        </p>
      )}

      {advice && (
        <div className="mt-3 space-y-3 text-sm">
          <p className="rounded-lg bg-card/80 p-3 text-foreground">{advice.diagnosis}</p>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acoes sugeridas</p>
            <ul className="list-disc space-y-1 pl-5 text-foreground">
              {advice.actions.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-card/80 p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Meta de poupanca sugerida</p>
            <p className="font-display text-lg font-bold tabular-nums">{fmtBRL(advice.savings_goal)}</p>
          </div>

          {advice.category_goals.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tetos por categoria</p>
              <ul className="space-y-1 text-xs">
                {advice.category_goals.map((g) => {
                  const spent = spentByCategory[g.category] ?? 0;
                  const pct = g.monthly_cap > 0 ? Math.min(100, (spent / g.monthly_cap) * 100) : 100;
                  const over = spent > g.monthly_cap;
                  const applied = plan.categoryGoals?.[g.category] === g.monthly_cap;
                  return (
                    <li key={g.category} className="rounded-lg border border-border bg-card/60 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{g.category} {applied && <Check className="inline h-3 w-3 text-status-safe" />}</span>
                        <span className={`tabular-nums ${over ? "text-status-danger" : "text-foreground"}`}>
                          {fmtBRL(spent)} / {fmtBRL(g.monthly_cap)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: over ? "hsl(var(--status-danger))" : pct > 75 ? "hsl(var(--status-warn))" : "hsl(var(--status-safe))",
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <button
            onClick={applyAll}
            className="w-full rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90"
          >
            Aplicar meta de poupanca + tetos no meu mes
          </button>
        </div>
      )}
    </div>
  );
}
