import { useState } from "react";
import { useStore } from "@/lib/store";
import { expectedMonthlyIncome, fmtBRL } from "@/lib/finance";
import { Settings2, X } from "lucide-react";

export function IncomeSheet() {
  const { state, updateIncome } = useStore();
  const [open, setOpen] = useState(false);
  const i = state.income;
  const expected = expectedMonthlyIncome(state);

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
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Renda prevista</p>
            <p className="font-display text-base font-semibold tabular-nums">{fmtBRL(expected)}</p>
          </div>
        </div>
        <span className="text-xs text-primary">Ajustar</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md animate-slide-up rounded-t-3xl bg-card p-6 safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Renda variável</h3>
              <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <Field label="Valor por hora (R$)" value={i.hourlyRate} onChange={(v) => updateIncome({ hourlyRate: v })} />
              <Field label="Horas por dia" value={i.hoursPerDay} onChange={(v) => updateIncome({ hoursPerDay: v })} />
              <Field label="Dias úteis no mês" value={i.workingDays} onChange={(v) => updateIncome({ workingDays: v })} />
              <Field label="Ajuste manual (R$)" value={i.manualAdjustment ?? 0} onChange={(v) => updateIncome({ manualAdjustment: v })} />
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

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
