import { useState } from "react";
import { useStore } from "@/lib/store";
import { MoneyInput } from "@/components/MoneyInput";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { fmtBRL } from "@/lib/finance";
import { toast } from "sonner";
import type { PaymentMethod } from "@/lib/types";

const CATEGORIES = ["Alimentação", "Transporte", "Lazer", "Saúde", "Moradia", "Compras", "Outros"];
const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "debit", label: "Débito" },
  { value: "credit", label: "Crédito" },
  { value: "pix", label: "Pix" },
  { value: "cash", label: "Dinheiro" },
];

type Props = {
  defaultDate?: Date;
  onSaved?: () => void;
  compact?: boolean;
};

export function ExpenseForm({ defaultDate, onSaved, compact }: Props) {
  const { accounts, addExpenseManual } = useStore();
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Outros");
  const [method, setMethod] = useState<PaymentMethod>("debit");
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? "");
  const [date, setDate] = useState<Date>(defaultDate ?? new Date());
  const [submitting, setSubmitting] = useState(false);

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const isFuture = date.getTime() > today.getTime();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || amount <= 0) { toast.error("Informe um valor"); return; }
    if (!accountId) { toast.error("Selecione uma conta"); return; }
    setSubmitting(true);
    const occurredAt = new Date(date);
    occurredAt.setHours(12, 0, 0, 0);
    const result = await addExpenseManual({
      amount, description, category, method, account_id: accountId,
      occurred_at: occurredAt.toISOString(),
    });
    setSubmitting(false);
    if (!result.expense) { toast.error(result.error ?? "Falha ao salvar"); return; }
    toast.success(
      isFuture
        ? `${fmtBRL(amount)} agendado para ${format(date, "dd/MM")}. Será descontado automaticamente.`
        : `${fmtBRL(amount)} • ${category}`,
    );
    setAmount(0); setDescription("");
    onSaved?.();
  }

  return (
    <form onSubmit={submit} className={cn("space-y-3", compact && "space-y-2")}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Valor</label>
          <MoneyInput value={amount} onChange={setAmount} placeholder="0,00" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data</label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm",
                  isFuture && "border-primary/50 text-primary",
                )}
              >
                <span>{format(date, "dd/MM/yyyy", { locale: ptBR })}</span>
                <CalendarIcon className="h-4 w-4 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Descrição</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="ex: almoço no centro"
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Categoria</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Forma</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Conta</label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} {a.kind === "credit" ? "(crédito)" : "(débito)"}
            </option>
          ))}
        </select>
      </div>

      {isFuture && (
        <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-[11px] text-primary">
          Este lançamento é futuro. Será agendado e descontado automaticamente em {format(date, "dd/MM/yyyy")}.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Salvando..." : isFuture ? "Agendar lançamento" : "Lançar gasto"}
      </button>
    </form>
  );
}
