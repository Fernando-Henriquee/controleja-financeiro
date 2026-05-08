import { ReactNode, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { businessDaysInMonthKey, expectedMonthlyIncome, fmtBRL, monthKey, monthLabel } from "@/lib/finance";
import { MoneyInput } from "@/components/MoneyInput";
import { Settings2, X } from "lucide-react";
import { toast } from "sonner";

export function IncomeSheet() {
  const { income, updateIncome, selectedMonth, accounts } = useStore();
  const [open, setOpen] = useState(false);
  const autoDays = businessDaysInMonthKey(selectedMonth);
  const debitAccounts = accounts.filter((a) => a.kind === "debit");

  // Local draft so user can edit without auto-save on every keystroke
  const [draft, setDraft] = useState(income);
  const [applyToFuture, setApplyToFuture] = useState(true);

  useEffect(() => {
    if (open) {
      setDraft(income);
      const isCurrentOrFuture = selectedMonth >= monthKey(new Date());
      setApplyToFuture(isCurrentOrFuture);
    }
  }, [open, income, selectedMonth]);

  const effectiveDraft = draft.mode === "pj"
    ? { ...draft, working_days: autoDays, worked_hours: draft.worked_hours && draft.worked_hours > 0 ? draft.worked_hours : autoDays * 8 }
    : draft;
  const previewExpected = expectedMonthlyIncome(effectiveDraft);
  const previewExpectedCurrent = expectedMonthlyIncome(income);

  async function save() {
    await updateIncome(draft, { applyToFuture });
    toast.success(applyToFuture ? "Renda salva neste mês e nos próximos." : "Renda salva apenas neste mês.");
    setOpen(false);
  }

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
            <p className="font-display text-base font-semibold tabular-nums">{fmtBRL(previewExpectedCurrent)}</p>
          </div>
        </div>
        <span className="text-xs text-primary">Ajustar</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md max-h-[92vh] overflow-y-auto animate-slide-up rounded-t-3xl bg-card p-6 safe-bottom" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">Renda — {monthLabel(selectedMonth)}</h3>
                <p className="text-[11px] text-muted-foreground">Cada mês tem seu próprio registro.</p>
              </div>
              <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface p-1">
                <ModeButton active={draft.mode === "clt"} onClick={() => setDraft({ ...draft, mode: "clt" })}>CLT</ModeButton>
                <ModeButton active={draft.mode === "pj"} onClick={() => setDraft({ ...draft, mode: "pj" })}>PJ</ModeButton>
              </div>

              {draft.mode === "clt" ? (
                <label className="block">
                  <span className="text-xs text-muted-foreground">Salário mensal (R$)</span>
                  <MoneyInput
                    value={draft.monthly_salary}
                    onChange={(v) => setDraft({ ...draft, monthly_salary: v })}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-xs text-muted-foreground">Valor hora (R$)</span>
                      <MoneyInput
                        value={draft.hourly_rate}
                        onChange={(v) => setDraft({ ...draft, hourly_rate: v })}
                        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground">Horas trabalhadas no mês</span>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={draft.worked_hours ?? ""}
                        placeholder={`${autoDays * 8}`}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDraft({ ...draft, worked_hours: v === "" ? null : Math.max(0, Number(v)) });
                        }}
                        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </label>
                  </div>

                  <div className="rounded-xl border border-border bg-background px-3 py-2">
                    <p className="text-xs text-muted-foreground">Cálculo PJ</p>
                    <p className="text-sm font-medium">
                      {fmtBRL(draft.hourly_rate)} × <strong>{effectiveDraft.worked_hours}h</strong> = {fmtBRL((draft.hourly_rate || 0) * (effectiveDraft.worked_hours || 0))}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Padrão: {autoDays} dias úteis × 8h = {autoDays * 8}h. Edite no início do mês com suas horas reais.
                    </p>
                  </div>
                </>
              )}

              <label className="block">
                <span className="text-xs text-muted-foreground">Extras (PIX, avulsos) (R$)</span>
                <MoneyInput
                  value={draft.extra_income}
                  onChange={(v) => setDraft({ ...draft, extra_income: v })}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>

              <label className="block">
                <span className="text-xs text-muted-foreground">Cair em qual conta?</span>
                <select
                  value={draft.deposit_account_id ?? ""}
                  onChange={(e) => setDraft({ ...draft, deposit_account_id: e.target.value || null })}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">— não definido —</option>
                  {debitAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                {!debitAccounts.length && (
                  <span className="mt-1 block text-[11px] text-muted-foreground">Cadastre uma conta de débito para selecionar.</span>
                )}
              </label>

              <label className="flex items-start gap-2 rounded-xl bg-secondary/40 p-3 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToFuture}
                  onChange={(e) => setApplyToFuture(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-semibold">Aplicar nos próximos meses</span>
                  <span className="ml-1 text-muted-foreground">
                    Salva o mesmo valor para {monthLabel(selectedMonth)} até dezembro. Meses passados não são alterados.
                  </span>
                </span>
              </label>
            </div>

            <div className="mt-4 rounded-xl bg-surface p-3">
              <p className="text-xs text-muted-foreground">Renda prevista total</p>
              <p className="font-display text-2xl font-bold tabular-nums">{fmtBRL(previewExpected)}</p>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-border px-3 py-2 text-sm">
                Cancelar
              </button>
              <button onClick={save} className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                Salvar
              </button>
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
