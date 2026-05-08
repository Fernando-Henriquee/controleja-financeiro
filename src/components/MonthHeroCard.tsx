import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  expectedMonthlyIncome,
  monthSpent,
  totalCreditUsed,
  totalLoanInstallmentsDueInMonth,
  totalInstallmentsDueInMonth,
  remainingAfterObligations,
  dailyLimitRealistic,
  dailyStatusRealistic,
  daysRemaining,
  fmtBRL,
  monthLabel,
  monthKey,
} from "@/lib/finance";
import { useMonthPlan } from "@/lib/monthPlan";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DailyLimitCard } from "./DailyLimitCard";
import { TrendingUp, TrendingDown, ShieldCheck, AlertTriangle, AlertOctagon, ChevronRight } from "lucide-react";

export function MonthHeroCard() {
  const { income, expenses, accounts, loans, installmentPlans, recurringRules, selectedMonth, activeProfile } = useStore();
  const { plan } = useMonthPlan(activeProfile?.id, selectedMonth);
  const [open, setOpen] = useState(false);

  const isCurrentMonth = selectedMonth === monthKey();
  const opts = {
    skippedAccountIds: plan.skippedAccountIds,
    skippedRecurringIds: plan.skippedRecurringIds,
    savingsGoal: plan.savingsGoal,
  };

  const renda = expectedMonthlyIncome(income);
  const gastoAtual = monthSpent(expenses);
  const sobra = remainingAfterObligations(income, expenses, loans, installmentPlans, selectedMonth, accounts, recurringRules, opts);
  const limiteDia = dailyLimitRealistic(income, expenses, loans, installmentPlans, selectedMonth, accounts, recurringRules, opts);
  const status = isCurrentMonth
    ? dailyStatusRealistic(income, expenses, loans, installmentPlans, selectedMonth, accounts, recurringRules, opts)
    : (sobra >= 0 ? "safe" : "danger");

  // Projected monthly outflow = current spent + open invoices + loans + installments + pending recurring
  const faturas = totalCreditUsed(accounts);
  const emprestimos = totalLoanInstallmentsDueInMonth(loans);
  const parcelas = totalInstallmentsDueInMonth(installmentPlans, selectedMonth);
  const recorrentesPendentes = recurringRules
    .filter((r) => !r.paid_months.includes(selectedMonth))
    .reduce((s, r) => s + Number(r.amount), 0);
  const gastosPrevistos = gastoAtual + faturas + emprestimos + parcelas + recorrentesPendentes;
  const saldoProjetado = renda - gastosPrevistos;

  const statusMeta = useMemo(() => {
    if (status === "safe") return { label: "Saudavel", icon: ShieldCheck, color: "text-status-safe", bg: "bg-status-safe-bg", border: "border-status-safe/30" };
    if (status === "warn") return { label: "Atencao", icon: AlertTriangle, color: "text-amber-700", bg: "bg-status-warn-bg", border: "border-status-warn/30" };
    return { label: "Risco", icon: AlertOctagon, color: "text-status-danger", bg: "bg-status-danger-bg", border: "border-status-danger/30" };
  }, [status]);

  const StatusIcon = statusMeta.icon;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-elegant lg:p-8">
      {/* decorative gradient */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Saude de <span className="capitalize">{monthLabel(selectedMonth)}</span>
          </p>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.bg} ${statusMeta.border} ${statusMeta.color}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusMeta.label}
          </span>
        </div>

        <div className="mt-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Saldo projetado do mes</p>
          <p className={`mt-1 font-display text-5xl font-bold tabular-nums leading-none lg:text-6xl ${saldoProjetado < 0 ? "text-status-danger" : "text-foreground"}`}>
            {fmtBRL(saldoProjetado)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Sobra para gastos livres: <span className={`font-semibold tabular-nums ${sobra < 0 ? "text-status-danger" : "text-foreground"}`}>{fmtBRL(sobra)}</span>
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <MiniStat
            icon={<TrendingUp className="h-3.5 w-3.5 text-status-safe" />}
            label="Receita prevista"
            value={fmtBRL(renda)}
          />
          <MiniStat
            icon={<TrendingDown className="h-3.5 w-3.5 text-status-warn" />}
            label="Gastos previstos"
            value={fmtBRL(gastosPrevistos)}
          />
          <MiniStat
            icon={<ShieldCheck className="h-3.5 w-3.5 text-primary" />}
            label="Compromissos abertos"
            value={fmtBRL(faturas + emprestimos + parcelas + recorrentesPendentes)}
            className="col-span-2 lg:col-span-1"
          />
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="mt-5 flex w-full items-center justify-between rounded-2xl border border-border bg-secondary/50 px-4 py-3 text-left transition hover:border-primary/40">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Limite diario seguro</p>
                <p className="font-display text-lg font-bold tabular-nums text-foreground">
                  {fmtBRL(limiteDia)}
                  <span className="ml-2 text-xs font-medium text-muted-foreground">/ dia · {daysRemaining()} dias</span>
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Detalhamento do limite diario</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <DailyLimitCard />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </section>
  );
}

function MiniStat({ icon, label, value, className = "" }: { icon: React.ReactNode; label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-secondary/40 p-3 ${className}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-1 font-display text-base font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
