import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { fmtBRL } from "@/lib/finance";
import { Bell, CalendarPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function AutomationPanel() {
  const {
    accounts,
    recurringRules,
    reminders,
    addRecurringRule,
    removeRecurringRule,
    addReminder,
    removeReminder,
  } = useStore();
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState(0);
  const [day, setDay] = useState(5);
  const [accountId, setAccountId] = useState("");

  const accountOptions = useMemo(() => accounts, [accounts]);

  async function handleAddRule() {
    if (!desc.trim() || amount <= 0 || !accountId) {
      toast.error("Preencha descricao, valor e conta.");
      return;
    }
    await addRecurringRule({
      description: desc.trim(),
      amount,
      day_of_month: day,
      account_id: accountId,
      category: "Outros",
      method: "debit",
    });
    setDesc("");
    setAmount(0);
    toast.success("Recorrencia criada.");
  }

  async function handleAddReminder() {
    await addReminder({ title: "Revisar limites e faturas", day_of_month: day, enabled: true });
    toast.success("Lembrete adicionado.");
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Nova recorrencia</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Ex: Internet"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary sm:col-span-2"
          />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            placeholder="Valor"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            type="number"
            value={day}
            min={1}
            max={31}
            onChange={(e) => setDay(parseInt(e.target.value || "1", 10))}
            placeholder="Dia do mes"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary sm:col-span-2"
          >
            <option value="">Selecione a conta</option>
            {accountOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="mt-2 flex gap-2">
          <button onClick={handleAddRule} className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
            <CalendarPlus className="mr-1 inline h-3.5 w-3.5" /> Salvar recorrencia
          </button>
          <button onClick={handleAddReminder} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold">
            <Bell className="mr-1 inline h-3.5 w-3.5" /> Criar lembrete
          </button>
        </div>
      </div>

      {!!recurringRules.length && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Recorrentes ativas</p>
          <div className="space-y-2">
            {recurringRules.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2 text-sm">
                <span>{r.description} · {fmtBRL(r.amount)} · dia {r.day_of_month}</span>
                <button onClick={() => void removeRecurringRule(r.id)} className="text-muted-foreground hover:text-status-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!!reminders.length && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Lembretes</p>
          <div className="space-y-2">
            {reminders.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2 text-sm">
                <span>{r.title} · dia {r.day_of_month}</span>
                <button onClick={() => void removeReminder(r.id)} className="text-muted-foreground hover:text-status-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
