import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import {
  totalBalance,
  totalCreditUsed,
  monthSpent,
  monthProgress,
  forecastEndOfMonth,
  expectedMonthlyIncome,
  fmtBRL,
  endOfMonthBalanceIfCurrentPace,
  endOfMonthBalanceIfDisciplined,
  monthLabel,
  totalInstallmentsDueInMonth,
  totalLoanInstallmentsDueInMonth,
} from "@/lib/finance";
import { TrendingDown, TrendingUp, Target, ArrowRight } from "lucide-react";

export function StatsGrid() {
  const { accounts, expenses, income, selectedMonth, loans, installmentPlans } = useStore();
  const debits = accounts.filter((a) => a.kind === "debit");
  const balance = totalBalance(accounts);
  const credit = totalCreditUsed(accounts);
  const spent = monthSpent(expenses);
  const incomeTotal = expectedMonthlyIncome(income);
  const forecast = forecastEndOfMonth(expenses);
  const progress = monthProgress(income, expenses) * 100;
  const overForecast = forecast > incomeTotal;
  const currentPaceBalance = endOfMonthBalanceIfCurrentPace(income, expenses);
  const disciplinedBalance = endOfMonthBalanceIfDisciplined(income, expenses);

  const parcelasMes = totalInstallmentsDueInMonth(installmentPlans, selectedMonth);
  const emprestimosMes = totalLoanInstallmentsDueInMonth(loans);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider">Saldo total</span>
          </div>
          <p className="mt-2 font-display text-xl font-bold tabular-nums">{fmtBRL(balance)}</p>
          {debits.length > 0 ? (
            <ul className="mt-3 max-h-36 space-y-1.5 overflow-y-auto text-xs">
              {debits.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5 last:border-0 last:pb-0">
                  <span className="truncate font-medium">{a.name}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{fmtBRL(Number(a.balance))}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">Nenhuma conta de débito.</p>
          )}
        </div>
        <Stat label="Faturas abertas" value={fmtBRL(credit)} icon={<TrendingDown className="h-3.5 w-3.5" />} accent />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Compromissos do mês</p>
        <div className="mt-2 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Faturas (crédito usado)</span>
            <span className="font-semibold tabular-nums text-status-warn">{fmtBRL(credit)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Parcelas de compras (cartão)</span>
            <span className="font-semibold tabular-nums">{fmtBRL(parcelasMes)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Empréstimos (parcelas)</span>
            <span className="font-semibold tabular-nums">{fmtBRL(emprestimosMes)}</span>
          </div>
        </div>
        <Link
          to="/cards"
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
        >
          Ver detalhes em bancos e cartões
          <ArrowRight className="h-3 w-3" />
        </Link>
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
