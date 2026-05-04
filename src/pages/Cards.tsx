import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { fmtBRL } from "@/lib/finance";
import { toast } from "sonner";

export default function CardsPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { activeProfile, accounts, expenses, updateAccountCreditLimit, updateAccountCreditUsed, addCreditAccount } = useStore();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");

  if (!session) return <Navigate to="/auth" replace />;
  if (!activeProfile) return <Navigate to="/" replace />;

  const cards = accounts.filter((a) => a.credit_limit !== null);

  async function handleCreateCard() {
    const parsed = parseFloat(newLimit.replace(",", "."));
    if (!newName.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Informe nome e limite valido para o cartao.");
      return;
    }
    await addCreditAccount(newName.trim(), newColor, parsed);
    setNewName("");
    setNewLimit("");
    toast.success("Cartao adicionado.");
  }

  return (
    <main className="min-h-screen bg-gradient-surface pb-10">
      <div className="mx-auto max-w-4xl space-y-4 px-4 pt-6 lg:px-6">
        <header className="flex items-center justify-between">
          <button onClick={() => navigate("/")} className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-xs hover:border-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </button>
          <h1 className="font-display text-xl font-semibold">Cartões e limites</h1>
          <div />
        </header>

        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Adicionar cartao</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_150px_90px_auto]">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Inter, C6, Santander"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                type="number"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                placeholder="Limite"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background px-1"
                aria-label="Cor do cartão"
              />
              <button
                onClick={handleCreateCard}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
              </button>
            </div>
          </div>

          {!cards.length ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
              Nenhum cartao com limite cadastrado ainda. Adicione acima para comecar.
            </div>
          ) : null}

          {cards.map((card) => {
            const used = Number(card.credit_used);
            const limit = Number(card.credit_limit ?? 0);
            const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

            return (
              <CardLimitRow
                key={card.id}
                name={card.name}
                color={card.color}
                used={used}
                limit={limit}
                pct={pct}
                launchedCredit={expenses
                  .filter((e) => e.account_id === card.id && e.method === "credit")
                  .reduce((sum, e) => sum + Number(e.amount), 0)}
                saving={savingId === card.id}
                onSaveLimit={async (nextLimit) => {
                  setSavingId(card.id);
                  await updateAccountCreditLimit(card.id, nextLimit);
                  setSavingId(null);
                }}
                onSaveTotal={async (nextTotal) => {
                  setSavingId(card.id);
                  await updateAccountCreditUsed(card.id, nextTotal);
                  setSavingId(null);
                }}
              />
            );
          })}
        </div>
      </div>
    </main>
  );
}

function CardLimitRow({
  name,
  color,
  used,
  limit,
  pct,
  launchedCredit,
  saving,
  onSaveLimit,
  onSaveTotal,
}: {
  name: string;
  color: string;
  used: number;
  limit: number;
  pct: number;
  launchedCredit: number;
  saving: boolean;
  onSaveLimit: (nextLimit: number | null) => Promise<void>;
  onSaveTotal: (nextTotal: number) => Promise<void>;
}) {
  const [draftLimit, setDraftLimit] = useState(String(limit));
  const [draftTotal, setDraftTotal] = useState(String(used));
  const difference = used - launchedCredit;
  const diffAbs = Math.abs(difference);
  const diffMessage =
    difference > 0
      ? `Faltando lançar ${fmtBRL(diffAbs)} em gastos picados.`
      : difference < 0
      ? `Lançado ${fmtBRL(diffAbs)} acima da fatura ajustada.`
      : "Fatura ajustada e gastos picados estão alinhados.";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: color }}>
            <CreditCard className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">{name}</p>
            <p className="text-xs text-muted-foreground">Uso atual: {fmtBRL(used)}</p>
          </div>
        </div>
        <p className={`text-sm font-semibold ${pct > 80 ? "text-status-danger" : pct > 50 ? "text-status-warn" : "text-status-safe"}`}>
          {Math.round(pct)}%
        </p>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: pct > 80 ? "hsl(var(--status-danger))" : pct > 50 ? "hsl(var(--status-warn))" : "hsl(var(--status-safe))",
          }}
        />
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <input
          type="number"
          value={draftLimit}
          onFocus={() => draftLimit === "0" && setDraftLimit("")}
          onChange={(e) => setDraftLimit(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="Limite do cartão"
        />
        <button
          onClick={() => onSaveLimit(draftLimit.trim() === "" ? null : Math.max(0, parseFloat(draftLimit.replace(",", ".")) || 0))}
          disabled={saving}
          className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar limite"}
        </button>
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
        <input
          type="number"
          value={draftTotal}
          onFocus={() => draftTotal === "0" && setDraftTotal("")}
          onChange={(e) => setDraftTotal(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="Fatura total atual"
        />
        <button
          onClick={() => onSaveTotal(Math.max(0, parseFloat(draftTotal.replace(",", ".")) || 0))}
          disabled={saving}
          className="rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:border-primary disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar fatura"}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Se esquecer um gasto picado, ajuste a fatura total aqui que o app sincroniza o valor aberto.
      </p>
      <div className={`mt-2 rounded-lg px-2 py-1 text-[11px] ${
        difference > 0
          ? "bg-status-warn-bg text-amber-800"
          : difference < 0
          ? "bg-status-danger-bg text-status-danger"
          : "bg-status-safe-bg text-status-safe"
      }`}>
        {diffMessage}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Limite configurado: {limit > 0 ? fmtBRL(limit) : "Nao definido"}</p>
    </div>
  );
}
