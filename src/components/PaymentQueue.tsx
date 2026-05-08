import { useState } from "react";
import { useStore } from "@/lib/store";
import { fmtBRL } from "@/lib/finance";
import { Check, Loader2, AlertTriangle, Clock, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type PaymentPlanItem = {
  kind: "invoice" | "loan" | "recurring" | "installment" | "other";
  label: string;
  amount: number;
  priority: number;
  reason: string;
  risk: "alta" | "media" | "baixa";
};

export function PaymentQueue({ items }: { items: PaymentPlanItem[] }) {
  const { accounts, recurringRules, loans, payCreditInvoice, markRecurringPaid, updateLoan, selectedMonth } = useStore();
  const [done, setDone] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<number | null>(null);

  if (!items.length) {
    return (
      <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
        A IA nao gerou um plano de pagamento. Rode "Analisar meu mes" novamente para gerar.
      </p>
    );
  }

  const sorted = [...items].sort((a, b) => a.priority - b.priority);

  function findAccountByLabel(label: string) {
    const n = label.toLowerCase();
    return accounts.find((a) => a.kind === "credit" && n.includes(a.name.toLowerCase()));
  }
  function findRecurringByLabel(label: string) {
    const n = label.toLowerCase();
    return recurringRules.find((r) => n.includes(r.description.toLowerCase()));
  }

  async function handlePay(idx: number, item: PaymentPlanItem) {
    setBusy(idx);
    try {
      if (item.kind === "invoice") {
        const acc = findAccountByLabel(item.label);
        if (!acc) {
          toast.error(`Cartao "${item.label}" nao encontrado.`);
          return;
        }
        const r = await payCreditInvoice(acc.id);
        const amt = (r && typeof r === "object" && "amount" in r) ? r.amount : 0;
        toast.success(`${acc.name}: ${fmtBRL(amt)} debitado.`);
      } else if (item.kind === "recurring") {
        const r = recurringRules.find((x) => !x.paid_months.includes(selectedMonth) && item.label.toLowerCase().includes(x.description.toLowerCase()))
          ?? findRecurringByLabel(item.label);
        if (!r) {
          toast.error(`Conta "${item.label}" nao encontrada.`);
          return;
        }
        await markRecurringPaid(r.id, selectedMonth);
        toast.success(`${r.description} marcada como paga.`);
      } else if (item.kind === "loan") {
        // Increment paid installments on the first loan with remaining
        const ln = loans.find((l) => l.paid_installments < l.total_installments);
        if (!ln) {
          toast.error("Nenhum emprestimo pendente.");
          return;
        }
        await updateLoan(ln.id, { paid_installments: ln.paid_installments + 1 });
        toast.success(`Parcela de ${ln.bank} marcada como paga.`);
      } else {
        toast.message("Marque manualmente em parcelas/contas.");
      }
      setDone((p) => new Set(p).add(idx));
    } catch (e) {
      toast.error("Falha ao marcar como pago.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <ol className="space-y-2">
      {sorted.map((item, idx) => {
        const isDone = done.has(idx);
        const riskColor =
          item.risk === "alta" ? "text-status-danger bg-status-danger-bg" :
          item.risk === "media" ? "text-amber-700 bg-status-warn-bg" :
          "text-status-safe bg-status-safe-bg";
        const Icon = item.kind === "invoice" ? Receipt : item.kind === "loan" ? AlertTriangle : Clock;

        return (
          <li
            key={idx}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 transition",
              isDone ? "border-status-safe/40 bg-status-safe-bg/40 opacity-60" : "border-border bg-card",
            )}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {item.priority}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <p className={cn("text-sm font-semibold truncate", isDone && "line-through")}>{item.label}</p>
                <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider", riskColor)}>
                  {item.risk}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.reason}</p>
              <p className="mt-1 font-display text-base font-bold tabular-nums">{fmtBRL(item.amount)}</p>
            </div>
            {!isDone && (
              <button
                onClick={() => handlePay(idx, item)}
                disabled={busy === idx}
                className="flex shrink-0 items-center gap-1 self-center rounded-full border border-border bg-surface px-2.5 py-1.5 text-[11px] font-semibold hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {busy === idx ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Marcar pago
              </button>
            )}
            {isDone && <Check className="h-4 w-4 self-center text-status-safe" />}
          </li>
        );
      })}
    </ol>
  );
}
