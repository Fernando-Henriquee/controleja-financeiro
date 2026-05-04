import { useStore } from "@/lib/store";
import {
  totalBalance, totalCreditUsed, monthSpent, monthProgress,
  forecastEndOfMonth, expectedMonthlyIncome, fmtBRL,
  endOfMonthBalanceIfCurrentPace, endOfMonthBalanceIfDisciplined,
  monthLabel,
} from "@/lib/finance";
import { TrendingDown, TrendingUp, Target } from "lucide-react";

export function StatsGrid() {
  const { accounts, expenses, income, selectedMonth } = useStore();
  const balance = totalBalance(accounts);
  const credit = totalCreditUsed(accounts);
  const spent = monthSpent(expenses);
  const incomeTotal = expectedMonthlyIncome(income);
  const forecast = forecastEndOfMonth(expenses);
  const progress = monthProgress(income, expenses) * 100;
  const overForecast = forecast > incomeTotal;
  const currentPaceBalance = endOfMonthBalanceIfCurrentPace(income, expenses);
  const disciplinedBalance = endOfMonthBalanceIfDisciplined(income, expenses);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Saldo total" value={fmtBRL(balance)} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <Stat label="Faturas abertas" value={fmtBRL(credit)} icon={<TrendingDown className="h-3.5 w-3.5" />} accent />
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Mês de referência</p>
          <span className="text-xs text-muted-foreground tabular-nums">
            {monthLabel(selectedMonth)} ·{" "}
            {fmtBRL(spent)} / {fmtBRL(incomeTotal)}
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, progress)}%`,
              background: progress > 100 ? "hsl(var(--status-danger))" : progress > 75 ? "hsl(var(--status-warn))" : "hsl(var(--status-safe))",
            }}
          />
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs">
          <Target className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">Previsão fim do mês:</span>
          <span className={`font-semibold tabular-nums ${overForecast ? "text-status-danger" : "text-status-safe"}`}>
            {fmtBRL(forecast)}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-lg bg-secondary/60 p-2">
            <p className="text-muted-foreground">Se continuar assim</p>
            <p className={`font-semibold ${currentPaceBalance < 0 ? "text-status-danger" : "text-status-safe"}`}>
              termina com {fmtBRL(currentPaceBalance)}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/60 p-2">
            <p className="text-muted-foreground">Se seguir limite</p>
            <p className={`font-semibold ${disciplinedBalance < 0 ? "text-status-danger" : "text-status-safe"}`}>
              sobra {fmtBRL(disciplinedBalance)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span className="uppercase tracking-wider">{label}</span>
      </div>
      <p className={`mt-2 font-display text-xl font-bold tabular-nums ${accent ? "text-status-warn" : ""}`}>{value}</p>
    </div>
  );
}
