import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { fmtBRL } from "@/lib/finance";
import type { PaymentMethod } from "@/lib/types";
import { Bell, CalendarPlus, CheckCircle2, Plus, Repeat2, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Moradia", "Transporte", "Lazer", "Saúde", "Educação", "Assinatura", "Financiamento", "Outros"];
const SUGGESTIONS = [
  { label: "Aluguel", category: "Moradia" },
  { label: "Condomínio", category: "Moradia" },
  { label: "Internet", category: "Moradia" },
  { label: "Luz", category: "Moradia" },
  { label: "Água", category: "Moradia" },
  { label: "Netflix", category: "Assinatura" },
  { label: "Spotify", category: "Assinatura" },
  { label: "Academia", category: "Saúde" },
  { label: "Financiamento moto", category: "Financiamento" },
  { label: "Financiamento carro", category: "Financiamento" },
];

export function AutomationPanel() {
  const {
    accounts,
    recurringRules,
    reminders,
    selectedMonth,
    addRecurringRule,
    removeRecurringRule,
    markRecurringPaid,
    unmarkRecurringPaid,
    addReminder,
    removeReminder,
  } = useStore();

  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [day, setDay] = useState(5);
  const [accountId, setAccountId] = useState("");
  const [category, setCategory] = useState("Moradia");
  const [method, setMethod] = useState<PaymentMethod>("debit");
  const [autoApply, setAutoApply] = useState(false);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const isCurrentMonth = selectedMonth === todayKey;

  const sortedRules = useMemo(
    () => [...recurringRules].sort((a, b) => a.day_of_month - b.day_of_month),
    [recurringRules],
  );

  const monthlyTotal = useMemo(
    () => sortedRules.reduce((acc, r) => acc + Number(r.amount), 0),
    [sortedRules],
  );

  function resetForm() {
    setDesc(""); setAmount(0); setDay(5); setAccountId(accounts[0]?.id ?? "");
    setCategory("Moradia"); setMethod("debit"); setAutoApply(false);
  }

  async function handleAddRule() {
    const accId = accountId || accounts[0]?.id;
    if (!desc.trim() || amount <= 0 || !accId) {
      toast.error("Preencha descrição, valor e conta.");
      return;
    }
    await addRecurringRule({
      description: desc.trim(),
      amount,
      day_of_month: day,
      account_id: accId,
      category,
      method,
      auto_apply: autoApply,
    });
    resetForm();
    setShowForm(false);
    toast.success("Conta recorrente criada.");
  }

  async function handleAddReminder() {
    await addReminder({ title: "Revisar limites e faturas", day_of_month: today.getDate(), enabled: true });
    toast.success("Lembrete adicionado.");
  }

  return (
    <div className="space-y-3">
      {/* Resumo */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total recorrente / mês</p>
          <p className="font-display text-xl font-bold">{fmtBRL(monthlyTotal)}</p>
          <p className="text-[11px] text-muted-foreground">{sortedRules.length} contas cadastradas</p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); if (!accountId && accounts[0]) setAccountId(accounts[0].id); }}
          className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Nova conta
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Nova conta recorrente</p>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Cadastre apenas para não esquecer. <span className="font-semibold text-foreground">Na hora de pagar você escolhe</span> se foi débito, PIX, crédito (vai pra fatura) ou dinheiro.
          </p>

          <div className="mb-2 flex flex-wrap gap-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => { setDesc(s.label); setCategory(s.category); }}
                className="rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-[10px] hover:border-primary"
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Ex: Condomínio"
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary sm:col-span-2"
            />
            <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
              <span className="text-xs text-muted-foreground">R$</span>
              <input
                type="number"
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                className="w-full bg-transparent outline-none"
              />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
              <span className="text-xs text-muted-foreground">Vence dia</span>
              <input
                type="number"
                value={day}
                min={1}
                max={31}
                onChange={(e) => setDay(parseInt(e.target.value || "1", 10))}
                className="w-full bg-transparent outline-none"
              />
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">Conta de pagamento</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="debit">Débito</option>
              <option value="pix">PIX</option>
              <option value="credit">Crédito</option>
              <option value="cash">Dinheiro</option>
            </select>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary sm:col-span-2"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <label className="mt-3 flex items-start gap-2 rounded-xl bg-secondary/40 p-2 text-xs">
            <input
              type="checkbox"
              checked={autoApply}
              onChange={(e) => setAutoApply(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold">Lançar automaticamente</span> no dia do vencimento.
              <span className="ml-1 text-muted-foreground">Se desativado, você marca como paga manualmente.</span>
            </span>
          </label>

          <div className="mt-3 flex gap-2">
            <button onClick={handleAddRule} className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
              <CalendarPlus className="mr-1 inline h-3.5 w-3.5" /> Salvar
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="rounded-xl border border-border px-3 py-2 text-xs">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de recorrentes */}
      {!!sortedRules.length && (
        <div className="space-y-2">
          {sortedRules.map((r) => {
            const acc = accounts.find((a) => a.id === r.account_id);
            const paid = r.paid_months.includes(selectedMonth);
            const daysToDue = r.day_of_month - today.getDate();
            const overdue = isCurrentMonth && !paid && daysToDue < 0;
            const dueSoon = isCurrentMonth && !paid && daysToDue >= 0 && daysToDue <= 5;

            return (
              <div
                key={r.id}
                className={cn(
                  "rounded-2xl border bg-card p-3 shadow-sm transition",
                  paid && "border-emerald-500/40 bg-emerald-500/5",
                  overdue && "border-rose-500/50 bg-rose-500/5",
                  dueSoon && !paid && "border-amber-500/50",
                  !paid && !overdue && !dueSoon && "border-border",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Repeat2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="truncate font-display text-sm font-bold">{r.description}</p>
                      {r.auto_apply && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-primary">auto</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {r.category} · {acc?.name ?? "—"} · {methodLabel(r.method)}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[11px]">
                      <span className="font-semibold">{fmtBRL(r.amount)}</span>
                      <span className="text-muted-foreground">vence dia {r.day_of_month}</span>
                      {paid && <Status tone="safe">Pago</Status>}
                      {!paid && overdue && <Status tone="danger">Atrasada {Math.abs(daysToDue)}d</Status>}
                      {!paid && !overdue && dueSoon && <Status tone="warn">Vence em {daysToDue}d</Status>}
                      {!paid && !overdue && !dueSoon && isCurrentMonth && <Status tone="muted">Em dia</Status>}
                      {!isCurrentMonth && !paid && <Status tone="muted">A pagar</Status>}
                    </div>
                  </div>
                  <button
                    onClick={() => void removeRecurringRule(r.id)}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-2 flex gap-2">
                  {paid ? (
                    <button
                      onClick={() => void unmarkRecurringPaid(r.id, selectedMonth)}
                      className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[11px] hover:border-primary"
                    >
                      <Undo2 className="h-3 w-3" /> Desfazer pagamento
                    </button>
                  ) : (
                    <button
                      onClick={() => void markRecurringPaid(r.id, selectedMonth)}
                      className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-500/20"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Marcar como paga
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lembretes */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Lembretes</p>
          <button onClick={handleAddReminder} className="rounded-lg border border-border px-2 py-1 text-[11px] hover:border-primary">
            <Bell className="mr-1 inline h-3 w-3" /> Novo lembrete
          </button>
        </div>
        {reminders.length ? (
          <div className="space-y-2">
            {reminders.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2 text-sm">
                <span>{r.title} · dia {r.day_of_month}</span>
                <button onClick={() => void removeReminder(r.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">Nenhum lembrete ativo.</p>
        )}
      </div>
    </div>
  );
}

function methodLabel(m: PaymentMethod): string {
  return ({ credit: "Crédito", debit: "Débito", pix: "PIX", cash: "Dinheiro" } as const)[m];
}

function Status({ tone, children }: { tone: "safe" | "warn" | "danger" | "muted"; children: React.ReactNode }) {
  const cls = {
    safe: "bg-emerald-500/15 text-emerald-700",
    warn: "bg-amber-500/15 text-amber-700",
    danger: "bg-rose-500/15 text-rose-700",
    muted: "bg-secondary text-muted-foreground",
  }[tone];
  return <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", cls)}>{children}</span>;
}
