import { useState } from "react";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import {
  expectedMonthlyIncome,
  monthSpent,
  totalCreditUsed,
  totalLoanInstallmentsDueInMonth,
  totalInstallmentsDueInMonth,
  totalUnpaidRecurringInMonth,
  remainingAfterObligations,
  fmtBRL,
  monthLabel,
} from "@/lib/finance";
import { Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export function FinanceCoach() {
  const { income, expenses, accounts, loans, installmentPlans, recurringRules, selectedMonth } = useStore();
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);

  async function ask() {
    setLoading(true);
    try {
      const renda = expectedMonthlyIncome(income);
      const gastos = monthSpent(expenses);
      const faturas = totalCreditUsed(accounts);
      const emprestimos = totalLoanInstallmentsDueInMonth(loans);
      const parcelas = totalInstallmentsDueInMonth(installmentPlans, selectedMonth);
      const recorrentes = totalUnpaidRecurringInMonth(recurringRules, selectedMonth);
      const sobra = remainingAfterObligations(income, expenses, loans, installmentPlans, selectedMonth, accounts, recurringRules);

      const porCategoria: Record<string, number> = {};
      for (const e of expenses) porCategoria[e.category] = (porCategoria[e.category] ?? 0) + Number(e.amount);

      const snapshot = {
        mes: monthLabel(selectedMonth),
        renda_mensal: renda,
        gastos_no_mes: gastos,
        faturas_abertas: faturas,
        emprestimos_mes: emprestimos,
        parcelas_cartao_mes: parcelas,
        recorrentes_pendentes: recorrentes,
        sobra_apos_compromissos: sobra,
        gastos_por_categoria: porCategoria,
        recorrentes: recurringRules.map(r => ({ desc: r.description, valor: Number(r.amount), categoria: r.category, paga: r.paid_months.includes(selectedMonth) })),
      };

      const { data, error } = await supabase.functions.invoke("finance-coach", { body: snapshot });
      if (error) throw error;
      if ((data as any)?.error) {
        toast.error((data as any).error);
        return;
      }
      setAdvice((data as any).text);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao consultar coach");
    } finally {
      setLoading(false);
    }
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
          {advice ? "Pedir de novo" : "Analisar meu mês"}
        </button>
      </div>
      {!advice && !loading && (
        <p className="mt-2 text-xs text-muted-foreground">
          A IA analisa sua renda, faturas, recorrentes e gastos por categoria e sugere onde cortar e quanto guardar.
        </p>
      )}
      {advice && (
        <div className="prose prose-sm mt-3 max-w-none text-sm text-foreground prose-headings:font-display prose-headings:text-foreground prose-strong:text-foreground prose-li:my-0.5">
          <ReactMarkdown>{advice}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
