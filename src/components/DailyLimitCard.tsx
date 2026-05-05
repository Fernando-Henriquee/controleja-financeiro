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
  remainingAfterObligations,
  todaySpent,
} from "@/lib/finance";
import { cn } from "@/lib/utils";

export function DailyLimitCard() {
  const { income, expenses, selectedMonth, loans, installmentPlans } = useStore();
  const isCurrentMonth = selectedMonth === monthKey();

  const classicLimit = dailyLimit(income, expenses);
  const realisticLimit = dailyLimitRealistic(income, expenses, loans, installmentPlans, selectedMonth);
  const limit = isCurrentMonth ? realisticLimit : classicLimit;

  const spent = todaySpent(expenses);

  const status = isCurrentMonth
    ? dailyStatusRealistic(income, expenses, loans, installmentPlans, selectedMonth)
    : dailyStatus(income, expenses);

  const remaining = Math.max(0, limit - spent);
  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 100;
  const ideal = idealDailyAverage(income);
  const deviation = dailyDeviationFromIdeal(income, expenses);
  const direction = deviation > 0 ? "+" : "-";

  const sobraMes = remainingAfterObligations(income, expenses, loans, installmentPlans, selectedMonth);

  const grad = status === "safe" ? "bg-gradient-safe" : status === "warn" ? "bg-gradient-warn" : "bg-gradient-danger";
  const message = !isCurrentMonth
    ? "Visualizacao historica do mes selecionado."
    : sobraMes <= 0
    ? "Compromissos (faturas, emprestimos e parcelas) ja consumiram a sobra do mes. Cuidado com qualquer gasto extra."
    : status === "danger"
    ? "Hoje nao e um bom dia para gastar."
    : status === "warn"
    ? pct > 70
      ? "Se continuar assim, vai estourar o mes."
      : "Voce ja usou 40% do limite do dia."
    : "Voce esta dentro do limite diario.";

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
        <p className="mt-1 text-xs text-white/80">
          de {fmtBRL(limit)} • gasto hoje {fmtBRL(spent)}
        </p>
        {isCurrentMonth && sobraMes <= 0 ? (
          <p className="mt-1 text-xs font-medium text-white">Sobra apos compromissos: {fmtBRL(sobraMes)}</p>
        ) : null}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-sm font-medium">{message}</p>
        <div className="mt-3 rounded-xl bg-white/15 p-3 text-xs text-white">
          <p>Voce pode gastar ate {fmtBRL(remaining)} hoje</p>
          <p className="mt-1">Media ideal: {fmtBRL(ideal)}/dia</p>
          <p className="mt-1">Voce esta {direction}{fmtBRL(Math.abs(deviation))} do ideal</p>
        </div>
      </div>
    </div>
  );
}
