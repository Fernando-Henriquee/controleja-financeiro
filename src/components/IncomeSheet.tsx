import { ReactNode, useState } from "react";
import { useStore } from "@/lib/store";
import { businessDaysInMonthKey, expectedMonthlyIncome, fmtBRL, monthLabel } from "@/lib/finance";
import { MoneyInput } from "@/components/MoneyInput";
import { Settings2, X } from "lucide-react";

export function IncomeSheet() {
  const { income, updateIncome, selectedMonth } = useStore();
  const [open, setOpen] = useState(false);
  const autoDays = businessDaysInMonthKey(selectedMonth);
  const effectiveIncome = income.mode === "pj" ? { ...income, working_days: autoDays } : income;
  const expected = expectedMonthlyIncome(effectiveIncome);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm hover:border-primary transition"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Settings2 className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Renda prevista ({monthLabel(selectedMonth)})</p>
            <p className="font-display text-base font-semibold tabular-nums">{fmtBRL(expected)}</p>
          </div>
        </div>
        <span className="text-xs text-primary">Ajustar</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-card p-6 safe-bottom" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Renda variável</h3>
              <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface p-1">
                <ModeButton active={income.mode === "clt"} onClick={() => updateIncome({ mode: "clt" })}>CLT</ModeButton>
                <ModeButton active={income.mode === "pj"} onClick={() => updateIncome({ mode: "pj" })}>PJ</ModeButton>
              </div>

              {income.mode === "clt" ? (
                <label className="block">
                  <span className="text-xs text-muted-foreground">Salário mensal (R$)</span>
                  <MoneyInput
                    value={income.monthly_salary}
                    onChange={(v) => updateIncome({ monthly_salary: v })}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>
              ) : (
                <>
                  <label className="block">
                    <span className="text-xs text-muted-foreground">Valor hora (R$)</span>
                    <MoneyInput
                      value={income.hourly_rate}
                      onChange={(v) => updateIncome({ hourly_rate: v })}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>
                  <div className="rounded-xl border border-border bg-background px-3 py-2">
                    <p className="text-xs text-muted-foreground">Cálculo PJ ({monthLabel(selectedMonth)})</p>
                    <p className="text-sm font-medium">
                      {fmtBRL(income.hourly_rate)} × 8h × <strong>{autoDays}</strong> dias úteis = {fmtBRL(income.hourly_rate * 8 * autoDays)}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Dias úteis calculados automaticamente para o mês de referência.</p>
                  </div>
                </>
              )}

              <label className="block">
                <span className="text-xs text-muted-foreground">Extras (PIX e entradas avulsas) (R$)</span>
                <MoneyInput
                  value={income.extra_income}
                  onChange={(v) => updateIncome({ extra_income: v })}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
            </div>
            <div className="mt-4 rounded-xl bg-surface p-3">
              <p className="text-xs text-muted-foreground">Renda prevista total</p>
              <p className="font-display text-2xl font-bold tabular-nums">{fmtBRL(expected)}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}
