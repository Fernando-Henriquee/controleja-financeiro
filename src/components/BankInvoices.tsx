import { useState } from "react";
import { useStore } from "@/lib/store";
import { fmtBRL, invoiceWindowFor } from "@/lib/finance";
import { CreditCard, Check, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";

export function BankInvoices() {
  const { accounts, cardInvoices, selectedMonth, activeProfile, payInvoice, payCreditInvoice } = useStore();
  const [paying, setPaying] = useState<string | null>(null);
  const [pickFor, setPickFor] = useState<string | null>(null);

  const debitAccounts = accounts.filter((a) => a.kind === "debit");
  const cycleStart = activeProfile?.cycle_start_day ?? 1;

  const cards = accounts.filter((a) => a.kind === "credit" || (a.credit_limit && Number(a.credit_limit) > 0));

  if (!cards.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
        Nenhum cartão cadastrado.
      </div>
    );
  }

  const items = cards
    .map((card) => {
      const inv = cardInvoices.find((i) => i.account_id === card.id && i.cycle_key === selectedMonth) ?? null;
      const win = inv ?? invoiceWindowFor(selectedMonth, cycleStart, card);
      const total = inv ? Number(inv.total) : Number(card.credit_used ?? 0);
      const limit = Number(card.credit_limit ?? 0);
      const pct = limit > 0 ? Math.min(100, (total / limit) * 100) : 0;
      return { card, inv, win, total, limit, pct };
    })
    .sort((a, b) => b.total - a.total);

  async function handlePay(itemIdx: number, fromDebitId?: string) {
    const item = items[itemIdx];
    const tag = item.inv?.id ?? item.card.id;
    setPaying(tag);
    try {
      const result = item.inv
        ? await payInvoice(item.inv.id, fromDebitId)
        : await payCreditInvoice(item.card.id, fromDebitId);
      if (result && result.amount > 0) {
        toast.success(
          `Fatura paga: ${fmtBRL(result.amount)}` +
            (result.fromDebit ? ` debitado de ${result.fromDebit.name}` : ""),
        );
      } else {
        toast.message("Não havia valor em aberto.");
      }
    } catch (e) {
      toast.error("Falha ao marcar como paga.");
    } finally {
      setPaying(null);
      setPickFor(null);
    }
  }

  const fmtDate = (s: string) => {
    const [y, m, d] = s.split("-");
    return `${d}/${m}`;
  };

  return (
    <div className="space-y-2">
      {items.map((item, idx) => {
        const tag = item.inv?.id ?? item.card.id;
        const critical = item.pct >= 85;
        const isPaid = item.inv?.status === "paid";
        return (
          <div
            key={tag}
            className={`rounded-2xl border bg-card p-4 shadow-sm transition ${
              isPaid ? "border-status-safe/40 opacity-80" : critical ? "border-status-danger/40" : "border-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: item.card.color }}>
                  <CreditCard className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.card.name}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {fmtDate(item.win.period_start)} → {fmtDate(item.win.period_end)} · vence {fmtDate(item.win.due_date)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">{fmtBRL(item.total)}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {isPaid ? "Paga" : item.inv ? item.inv.status === "closed" ? "Fechada" : "Aberta" : "Aberta"}
                </p>
              </div>
            </div>
            {item.limit > 0 ? (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${item.pct}%`,
                    background:
                      item.pct >= 85
                        ? "hsl(var(--status-danger))"
                        : item.pct >= 60
                          ? "hsl(var(--status-warn))"
                          : "hsl(var(--status-safe))",
                  }}
                />
              </div>
            ) : null}
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {item.limit > 0 ? (
                  <>
                    {fmtBRL(item.total)} / {fmtBRL(item.limit)} ({Math.round(item.pct)}%)
                  </>
                ) : (
                  fmtBRL(item.total)
                )}
                {!isPaid && item.pct >= 85 && (
                  <span className="ml-2 inline-block rounded-full bg-status-danger-bg px-1.5 py-0.5 text-[10px] font-semibold text-status-danger">
                    Próximo do limite
                  </span>
                )}
              </p>
              {!isPaid && item.total > 0 ? (
                <button
                  onClick={() => {
                    if (debitAccounts.length > 1) setPickFor(pickFor === tag ? null : tag);
                    else handlePay(idx);
                  }}
                  disabled={paying === tag}
                  className="flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-medium text-foreground hover:border-primary hover:text-primary transition disabled:opacity-50"
                >
                  {paying === tag ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Marcar como paga
                </button>
              ) : null}
            </div>
            {pickFor === tag && debitAccounts.length > 1 ? (
              <div className="mt-2 space-y-1 rounded-xl border border-border bg-surface p-2">
                <p className="px-1 text-[10px] uppercase tracking-wider text-muted-foreground">Debitar de qual conta?</p>
                {debitAccounts.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handlePay(idx, d.id)}
                    disabled={paying === tag}
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
