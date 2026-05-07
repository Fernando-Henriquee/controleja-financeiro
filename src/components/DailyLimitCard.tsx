import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  dailyLimit,
  dailyLimitRealistic,
  dailyStatus,
  dailyStatusRealistic,
  fmtBRL,
  daysRemaining,
  idealDailyAverage,
  dailyDeviationFromIdeal,
  monthKey,
  obligationBreakdown,
  todaySpent,
} from "@/lib/finance";
import { useMonthPlan } from "@/lib/monthPlan";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";

export function DailyLimitCard() {
  const { income, expenses, selectedMonth, loans, installmentPlans, accounts, recurringRules, activeProfile } = useStore();
  const { plan, update, toggleAccount, toggleRecurring } = useMonthPlan(activeProfile?.id, selectedMonth);
  const [open, setOpen] = useState(false);
  const [simOpen, setSimOpen] = useState(false);

  const isCurrentMonth = selectedMonth === monthKey();
  const opts = {
    skippedAccountIds: plan.skippedAccountIds,
    skippedRecurringIds: plan.skippedRecurringIds,
    savingsGoal: plan.savingsGoal,
  };

  const classicLimit = dailyLimit(income, expenses);
  const realisticLimit = dailyLimitRealistic(income, expenses, loans, installmentPlans, selectedMonth, accounts, recurringRules, opts);
  const limit = isCurrentMonth ? realisticLimit : classicLimit;

  const spent = todaySpent(expenses);
  const status = isCurrentMonth
    ? dailyStatusRealistic(income, expenses, loans, installmentPlans, selectedMonth, accounts, recurringRules, opts)
    : dailyStatus(income, expenses);

  const remaining = Math.max(0, limit - spent);
  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 100;
  const ideal = idealDailyAverage(income);
  const deviation = dailyDeviationFromIdeal(income, expenses);
  const direction = deviation > 0 ? "+" : "-";

  const bd = obligationBreakdown(income, expenses, loans, installmentPlans, selectedMonth, accounts, recurringRules, opts);
  const sobraMes = bd.sobra;

  const grad = status === "safe" ? "bg-gradient-safe" : status === "warn" ? "bg-gradient-warn" : "bg-gradient-danger";
  const message = !isCurrentMonth
    ? "Visualizacao historica do mes selecionado."
    : sobraMes <= 0
    ? "Compromissos ja consumiram a sobra do mes. Cuidado com qualquer gasto extra."
    : status === "danger"
    ? "Hoje nao e um bom dia para gastar."
    : status === "warn"
    ? pct > 70 ? "Se continuar assim, vai estourar o mes." : "Voce ja usou 40% do limite do dia."
    : "Voce esta dentro do limite diario.";

  const creditAccounts = accounts.filter(a => Number(a.credit_used) > 0);
  const pendingRecurring = recurringRules.filter(r => !r.paid_months.includes(selectedMonth));

  return (
    <div className={cn("relative overflow-hidden rounded-2xl p-6 text-white shadow-elegant", grad)}>
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-white/80">Limite de hoje</p>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
            {daysRemaining()} dias restantes
          </span>
        </div>
        <p className="mt-2 font-display text-4xl font-bold">{fmtBRL(remaining)}</p>
        <p className="mt-1 text-xs text-white/80">de {fmtBRL(limit)} • gasto hoje {fmtBRL(spent)}</p>
        {isCurrentMonth && sobraMes <= 0 && (
          <p className="mt-1 text-xs font-medium text-white">Sobra apos compromissos: {fmtBRL(sobraMes)}</p>
        )}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-sm font-medium">{message}</p>

        <div className="mt-3 rounded-xl bg-white/15 p-3 text-xs text-white">
          <p>Voce pode gastar ate {fmtBRL(remaining)} hoje</p>
          <p className="mt-1">Media ideal: {fmtBRL(ideal)}/dia</p>
          <p className="mt-1">Voce esta {direction}{fmtBRL(Math.abs(deviation))} do ideal</p>
        </div>

        <button
          onClick={() => setOpen(v => !v)}
          className="mt-3 flex w-full items-center justify-between rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold text-white"
        >
          <span>Como o limite e calculado</span>
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {open && (
          <div className="mt-2 space-y-1 rounded-xl bg-white/10 p-3 text-xs text-white">
            <Row label="Renda esperada" value={`+ ${fmtBRL(bd.renda)}`} />
            <Row label="Gastos do mes" value={`- ${fmtBRL(bd.gasto)}`} />
            <Row label="Faturas abertas" value={`- ${fmtBRL(bd.faturas)}`} />
            <Row label="Recorrentes pendentes" value={`- ${fmtBRL(bd.recorrentes)}`} />
            <Row label="Emprestimos" value={`- ${fmtBRL(bd.emprestimos)}`} />
            <Row label="Parcelas de compras" value={`- ${fmtBRL(bd.parcelas)}`} />
            {bd.poupanca > 0 && <Row label="Meta de poupanca" value={`- ${fmtBRL(bd.poupanca)}`} />}
            <div className="mt-1 border-t border-white/20 pt-1">
              <Row label="Sobra do mes" value={fmtBRL(bd.sobra)} bold />
              <Row label={`÷ ${daysRemaining()} dias restantes`} value={fmtBRL(limit) + "/dia"} bold />
            </div>
          </div>
        )}

        {isCurrentMonth && (
          <div className="mt-3 rounded-xl bg-white/15 p-3 text-xs text-white">
            <button onClick={() => setSimOpen(v => !v)} className="flex w-full items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Plano e simulacao</span>
              {simOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {simOpen && (
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wider text-white/80">Meta de poupanca do mes</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={plan.savingsGoal || ""}
                    onChange={(e) => update({ savingsGoal: Math.max(0, Number(e.target.value) || 0) })}
                    placeholder="0"
                    className="mt-1 w-full rounded-lg bg-white/20 px-2 py-1.5 text-white placeholder-white/50 outline-none focus:bg-white/30"
                  />
                </label>

                {creditAccounts.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-white/80">Faturas — desmarque para parcelar/adiar</p>
                    <ul className="mt-1 space-y-1">
                      {creditAccounts.map(a => {
                        const skipped = plan.skippedAccountIds.includes(a.id);
                        return (
                          <li key={a.id} className="flex items-center justify-between gap-2">
                            <label className="flex flex-1 items-center gap-2">
                              <input type="checkbox" checked={!skipped} onChange={() => toggleAccount(a.id)} />
                              <span className={skipped ? "line-through opacity-60" : ""}>{a.name}</span>
                            </label>
                            <span className="tabular-nums">{fmtBRL(Number(a.credit_used))}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {pendingRecurring.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-white/80">Contas recorrentes pendentes</p>
                    <ul className="mt-1 space-y-1">
                      {pendingRecurring.map(r => {
                        const skipped = plan.skippedRecurringIds.includes(r.id);
                        return (
                          <li key={r.id} className="flex items-center justify-between gap-2">
                            <label className="flex flex-1 items-center gap-2">
                              <input type="checkbox" checked={!skipped} onChange={() => toggleRecurring(r.id)} />
                              <span className={skipped ? "line-through opacity-60" : ""}>{r.description}</span>
                            </label>
                            <span className="tabular-nums">{fmtBRL(Number(r.amount))}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <p className="text-[11px] text-white/70">
                  Itens desmarcados saem do calculo deste mes (simule pagar parcelado depois).
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-2", bold && "font-semibold")}>
      <span className="text-white/85">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
