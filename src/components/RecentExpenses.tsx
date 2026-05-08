import { useState } from "react";
import { useStore } from "@/lib/store";
import { fmtBRL } from "@/lib/finance";
import type { PaymentMethod } from "@/lib/types";
import { Car, ShoppingCart, Soup, Stethoscope, Home, Receipt, Trash2, Pencil } from "lucide-react";
import { MoneyInput } from "@/components/MoneyInput";
import { toast } from "sonner";

const CATEGORIES = ["Alimentação", "Transporte", "Lazer", "Saúde", "Moradia", "Compras", "Outros"];

function groupLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (value === today) return "HOJE";
  if (value === today - dayMs) return "ONTEM";
  if (value >= today - 6 * dayMs) return "ESTA SEMANA";
  return "ANTERIORES";
}

function CategoryIcon({ category }: { category: string }) {
  const key = category.toLowerCase();
  const Icon = key.includes("transporte")
    ? Car
    : key.includes("aliment")
    ? Soup
    : key.includes("sa")
    ? Stethoscope
    : key.includes("moradia")
    ? Home
    : key.includes("compras")
    ? ShoppingCart
    : Receipt;
  return <Icon className="h-3.5 w-3.5" />;
}

export function RecentExpenses() {
  const { expenses, accounts, removeExpense, updateExpense } = useStore();
  const items = expenses.slice(0, 12);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ amount: number; description: string; category: string; method: PaymentMethod; account_id: string }>({
    amount: 0, description: "", category: "Outros", method: "debit", account_id: "",
  });

  function startEdit(e: typeof items[number]) {
    setEditingId(e.id);
    setDraft({
      amount: Number(e.amount),
      description: e.description,
      category: e.category,
      method: e.method as PaymentMethod,
      account_id: e.account_id,
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    if (!(draft.amount > 0)) { toast.error("Valor inválido."); return; }
    await updateExpense(editingId, draft);
    setEditingId(null);
    toast.success("Gasto atualizado.");
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Nenhum gasto ainda. Use a barra acima para começar.</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {items.map((e, i) => {
        const account = accounts.find(a => a.id === e.account_id);
        const currentGroup = groupLabel(new Date(e.occurred_at));
        const prevGroup = i > 0 ? groupLabel(new Date(items[i - 1].occurred_at)) : null;
        const showGroup = i === 0 || prevGroup !== currentGroup;
        const isEditing = editingId === e.id;
        return (
          <div key={e.id}>
            {showGroup ? (
              <div className={`px-3 py-2 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground ${i > 0 ? "border-t border-border" : ""}`}>
                {currentGroup}
              </div>
            ) : null}
            {isEditing ? (
              <div className={`space-y-2 p-3 ${!showGroup ? "border-t border-border" : ""}`}>
                <div className="grid gap-2 sm:grid-cols-[110px_1fr]">
                  <MoneyInput value={draft.amount} onChange={(v) => setDraft({ ...draft, amount: v })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  <input value={draft.description} onChange={(ev) => setDraft({ ...draft, description: ev.target.value })} placeholder="Descrição" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <select value={draft.category} onChange={(ev) => setDraft({ ...draft, category: ev.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={draft.method} onChange={(ev) => setDraft({ ...draft, method: ev.target.value as PaymentMethod })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <option value="debit">Débito</option>
                    <option value="pix">PIX</option>
                    <option value="credit">Crédito</option>
                    <option value="cash">Dinheiro</option>
                  </select>
                  <select value={draft.account_id} onChange={(ev) => setDraft({ ...draft, account_id: ev.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    {accounts
                      .filter((a) => draft.method === "credit" ? a.kind === "credit" : a.kind === "debit")
                      .map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingId(null)} className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
                  <button onClick={saveEdit} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Salvar</button>
                </div>
              </div>
            ) : (
              <div className={`flex items-center gap-3 p-3 ${!showGroup ? "border-t border-border" : ""}`}>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
                  <CategoryIcon category={e.category} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.description}</p>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="rounded-full bg-secondary px-2 py-0.5">{e.category}</span>
                    <span className="rounded-full px-2 py-0.5 text-white" style={{ background: account?.color ?? "#94a3b8" }}>
                      {account?.name ?? "Conta"}
                    </span>
                    <span className="rounded-full border border-border px-2 py-0.5">{e.method}</span>
                    <span>{new Date(e.occurred_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
                <p className="font-display text-sm font-semibold tabular-nums">-{fmtBRL(Number(e.amount))}</p>
                <button
                  onClick={() => startEdit(e)}
                  className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary transition"
                  aria-label="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => removeExpense(e.id)}
                  className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-status-danger transition"
                  aria-label="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
