import { useState } from "react";
import { useStore } from "@/lib/store";
import { fmtBRL } from "@/lib/finance";
import { CreditCard, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function BankInvoices() {
  const { accounts, payCreditInvoice } = useStore();
  const [paying, setPaying] = useState<string | null>(null);
  const [pickFor, setPickFor] = useState<string | null>(null);

  const debitAccounts = accounts.filter((a) => a.kind === "debit");

  const invoices = accounts
    .filter((a) => a.credit_limit && Number(a.credit_limit) > 0)
    .map((a) => {
      const used = Number(a.credit_used);
      const limit = Number(a.credit_limit);
      return { ...a, used, limit, pct: Math.min(100, (used / limit) * 100) };
    })
    .sort((a, b) => b.pct - a.pct);

  if (!invoices.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
        Nenhuma fatura disponivel.
      </div>
    );
  }

  async function handlePay(creditId: string, fromDebitId?: string) {
    setPaying(creditId);
    try {
      const result = await payCreditInvoice(creditId, fromDebitId);
      if (result && result.amount > 0) {
        toast.success(
          `Fatura paga: ${fmtBRL(result.amount)}` +
            (result.fromDebit ? ` debitado de ${result.fromDebit.name}` : ""),
        );
      } else {
        toast.message("Nao havia valor em aberto.");
      }
    } catch (e) {
      toast.error("Falha ao marcar como paga.");
    } finally {
      setPaying(null);
      setPickFor(null);
    }
  }

  return (
    <div className="space-y-2">
      {invoices.map((item) => {
        const critical = item.pct >= 85;
        return (
        <div key={item.id} className={`rounded-2xl border bg-card p-4 shadow-sm transition ${critical ? "border-status-danger/40" : "border-border"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: item.color }}>
                <CreditCard className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-muted-foreground">Fatura aberta</p>
              </div>
            </div>
            <p className="text-sm font-semibold tabular-nums">{fmtBRL(item.used)}</p>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${item.pct}%`,
                background: item.pct >= 85 ? "hsl(var(--status-danger))" : item.pct >= 60 ? "hsl(var(--status-warn))" : "hsl(var(--status-safe))",
              }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {fmtBRL(item.used)} / {fmtBRL(item.limit)} ({Math.round(item.pct)}%)
              {item.pct >= 85 && <span className="ml-2 inline-block rounded-full bg-status-danger-bg px-1.5 py-0.5 text-[10px] font-semibold text-status-danger">Proximo do limite</span>}
            </p>
            {item.used > 0 ? (
              <button
                onClick={() => {
                  if (debitAccounts.length > 1) setPickFor(pickFor === item.id ? null : item.id);
                  else handlePay(item.id);
                }}
                disabled={paying === item.id}
                className="flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-medium text-foreground hover:border-primary hover:text-primary transition disabled:opacity-50"
              >
                {paying === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Marcar como paga
              </button>
            ) : null}
          </div>
          {pickFor === item.id && debitAccounts.length > 1 ? (
            <div className="mt-2 space-y-1 rounded-xl border border-border bg-surface p-2">
              <p className="px-1 text-[10px] uppercase tracking-wider text-muted-foreground">Debitar de qual conta?</p>
              {debitAccounts.map((d) => (
                <button
                  key={d.id}
                  onClick={() => handlePay(item.id, d.id)}
                  disabled={paying === item.id}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-secondary transition"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                    {d.name}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{fmtBRL(Number(d.balance))}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        );
      })}
    </div>
  );
}
