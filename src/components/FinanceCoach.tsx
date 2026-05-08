import { useMemo, useRef, useState, useEffect } from "react";
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
import { Sparkles, Loader2, Check, MessageCircle, Send, BarChart3 } from "lucide-react";
import { toast } from "sonner";

type Advice = {
  diagnosis: string;
  actions: string[];
  savings_goal: number;
  category_goals: { category: string; monthly_cap: number }[];
};

type ChatMsg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "O que pago primeiro este mes?",
  "Posso passar essa compra no credito?",
  "Vale a pena deixar uma fatura atrasar?",
  "Onde estou gastando demais?",
];

export function FinanceCoach() {
  const { income, expenses, accounts, loans, installmentPlans, recurringRules, selectedMonth, activeProfile } = useStore();
  const { plan, update } = useMonthPlan(activeProfile?.id, selectedMonth);
  const [tab, setTab] = useState<"analysis" | "chat">("analysis");
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<Advice | null>(null);

  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const spentByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of expenses) m[e.category] = (m[e.category] ?? 0) + Number(e.amount);
    return m;
  }, [expenses]);

  const snapshot = useMemo(() => {
    const renda = expectedMonthlyIncome(income);
    const sobra = remainingAfterObligations(income, expenses, loans, installmentPlans, selectedMonth, accounts, recurringRules, {
      skippedAccountIds: plan.skippedAccountIds,
      skippedRecurringIds: plan.skippedRecurringIds,
      savingsGoal: 0,
    });
    return {
      mes: monthLabel(selectedMonth),
      renda_mensal: renda,
      gastos_no_mes: monthSpent(expenses),
      faturas_abertas: totalCreditUsed(accounts),
      faturas_por_cartao: accounts.filter(a => a.kind === "credit").map(a => ({ nome: a.name, usado: Number(a.credit_used ?? 0), limite: Number(a.credit_limit ?? 0) })),
      saldos_debito: accounts.filter(a => a.kind === "debit").map(a => ({ nome: a.name, saldo: Number(a.balance) })),
      emprestimos_mes: totalLoanInstallmentsDueInMonth(loans),
      parcelas_cartao_mes: totalInstallmentsDueInMonth(installmentPlans, selectedMonth),
      sobra_disponivel: sobra,
      gastos_por_categoria: spentByCategory,
      recorrentes: recurringRules.map(r => ({ desc: r.description, valor: Number(r.amount), categoria: r.category, paga: r.paid_months.includes(selectedMonth) })),
      meta_poupanca: plan.savingsGoal,
    };
  }, [income, expenses, accounts, loans, installmentPlans, recurringRules, selectedMonth, plan, spentByCategory]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat, streaming]);

  async function ask() {
    setLoading(true);
    try {
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

  async function sendChat(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    const userMsg: ChatMsg = { role: "user", content: trimmed };
    const history = [...chat, userMsg];
    setChat(history);
    setInput("");
    setStreaming(true);
    let assistantSoFar = "";
    setChat((p) => [...p, { role: "assistant", content: "" }]);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/finance-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: history, snapshot }),
      });
      if (resp.status === 429) { toast.error("Muitas requisicoes. Tente em alguns segundos."); throw new Error("429"); }
      if (resp.status === 402) { toast.error("Creditos do Lovable AI esgotados."); throw new Error("402"); }
      if (!resp.ok || !resp.body) throw new Error("Falha no chat");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistantSoFar += delta;
              setChat((p) => p.map((m, i) => (i === p.length - 1 ? { ...m, content: assistantSoFar } : m)));
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      if (!["429", "402"].includes(e?.message)) toast.error("Erro ao conversar com o coach");
      setChat((p) => p.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="font-display text-sm font-semibold">Coach financeiro IA</p>
        </div>
        <div className="flex rounded-full border border-border bg-card p-0.5 text-[11px]">
          <button
            onClick={() => setTab("analysis")}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${tab === "analysis" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            <BarChart3 className="h-3 w-3" /> Analise
          </button>
          <button
            onClick={() => setTab("chat")}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${tab === "chat" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            <MessageCircle className="h-3 w-3" /> Conversar
          </button>
        </div>
      </div>

      {tab === "analysis" && (
        <>
          <div className="mt-3 flex justify-end">
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
        </>
      )}

      {tab === "chat" && (
        <div className="mt-3 space-y-2">
          <div ref={scrollRef} className="max-h-80 min-h-[160px] space-y-2 overflow-y-auto rounded-lg bg-card/60 p-3 text-sm">
            {chat.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Pergunte qualquer coisa sobre o seu mes. O coach ja conhece sua renda, faturas, contas e gastos.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendChat(s)}
                      className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] hover:border-primary/50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chat.map((m, i) => (
              <div
                key={i}
                className={`whitespace-pre-wrap rounded-xl px-3 py-2 ${
                  m.role === "user"
                    ? "ml-auto max-w-[85%] bg-primary text-primary-foreground"
                    : "mr-auto max-w-[90%] bg-background text-foreground"
                }`}
              >
                {m.content || (streaming && i === chat.length - 1 ? <Loader2 className="h-3 w-3 animate-spin" /> : "")}
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); sendChat(input); }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte ao coach..."
              disabled={streaming}
              className="flex-1 rounded-full border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
