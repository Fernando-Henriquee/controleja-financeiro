import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Landmark, Plus, Trash2, Wallet, Receipt } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { fmtBRL, installmentDueForMonth } from "@/lib/finance";
import { toast } from "sonner";
import type { Account, Loan } from "@/lib/types";
import { ConfirmButton } from "@/components/ConfirmButton";
import { MoneyInput } from "@/components/MoneyInput";

const ACCOUNT_PRESETS = [
  { name: "Itaú", color: "#ec7000" },
  { name: "Nubank", color: "#8a05be" },
  { name: "Inter", color: "#ff7a00" },
  { name: "C6 Bank", color: "#1a1a1a" },
  { name: "Santander", color: "#ec0000" },
  { name: "Bradesco", color: "#cc092f" },
  { name: "Caixa", color: "#0070b9" },
  { name: "Banco do Brasil", color: "#fff100" },
  { name: "PicPay", color: "#11c76f" },
  { name: "Mercado Pago", color: "#00b1ea" },
];

export default function CardsPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { activeProfile, accounts, loans } = useStore();
  if (!session) return <Navigate to="/auth" replace />;
  if (!activeProfile) return <Navigate to="/" replace />;

  const debits = accounts.filter((a) => a.kind === "debit");
  const credits = accounts.filter((a) => a.kind === "credit");

  return (
    <main className="min-h-screen bg-gradient-surface pb-16">
      <div className="mx-auto max-w-4xl space-y-5 px-4 pt-6 lg:px-6">
        <header className="flex items-center justify-between">
          <button onClick={() => navigate("/")} className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-xs hover:border-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </button>
          <h1 className="font-display text-xl font-semibold">Bancos, cartões e empréstimos</h1>
          <div />
        </header>

        <AddAccountForm />

        <Section title="Contas correntes / débito" icon={<Wallet className="h-4 w-4" />} count={debits.length}>
          {debits.length === 0 ? (
            <Empty>Nenhuma conta de débito cadastrada.</Empty>
          ) : (
            debits.map((a) => <DebitRow key={a.id} account={a} />)
          )}
        </Section>

        <Section title="Cartões de crédito" icon={<CreditCard className="h-4 w-4" />} count={credits.length}>
          {credits.length === 0 ? (
            <Empty>Nenhum cartão de crédito cadastrado.</Empty>
          ) : (
            credits.map((a) => <CreditRow key={a.id} account={a} />)
          )}
        </Section>

        <Section title="Empréstimos" icon={<Landmark className="h-4 w-4" />} count={loans.length}>
          <AddLoanForm />
          {loans.length === 0 ? (
            <Empty>Nenhum empréstimo registrado.</Empty>
          ) : (
            loans.map((l) => <LoanRow key={l.id} loan={l} />)
          )}
        </Section>
      </div>
    </main>
  );
}

function Section({ title, icon, count, children }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-secondary text-foreground">{icon}</span>
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
        <span className="ml-auto text-[11px] text-muted-foreground">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">{children}</div>;
}

function AddAccountForm() {
  const { addCreditAccount, addDebitAccount } = useStore();
  const [kind, setKind] = useState<"debit" | "credit">("credit");
  const [name, setName] = useState("");
  const [limit, setLimit] = useState(0);
  const [balance, setBalance] = useState(0);
  const [overdraft, setOverdraft] = useState(0);
  const [color, setColor] = useState("#3b82f6");

  function pickPreset(p: { name: string; color: string }) {
    setName(p.name);
    setColor(p.color);
  }

  async function submit() {
    if (!name.trim()) {
      toast.error("Informe o nome do banco.");
      return;
    }
    if (kind === "credit") {
      if (!Number.isFinite(limit) || limit <= 0) {
        toast.error("Informe o limite do cartão.");
        return;
      }
      await addCreditAccount(name.trim(), color, limit);
    } else {
      await addDebitAccount(
        name.trim(),
        color,
        Number.isFinite(balance) ? balance : 0,
        overdraft > 0 ? overdraft : null,
      );
    }
    setName(""); setLimit(0); setBalance(0); setOverdraft(0);
    toast.success("Conta adicionada.");
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Adicionar nova conta</p>
      <div className="mt-2 inline-flex rounded-xl border border-border bg-background p-0.5">
        {(["credit", "debit"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${kind === k ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {k === "credit" ? "Cartão de crédito" : "Conta corrente / débito"}
          </button>
        ))}
      </div>

      <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto">
        {ACCOUNT_PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => pickPreset(p)}
            className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] hover:border-primary"
            style={{ borderColor: name === p.name ? p.color : undefined, color: name === p.name ? p.color : undefined }}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_60px_auto]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do banco"
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        {kind === "credit" ? (
          <MoneyInput
            value={limit}
            onChange={setLimit}
            placeholder="Limite"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        ) : (
          <MoneyInput
            value={balance}
            onChange={setBalance}
            placeholder="Saldo inicial"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        )}
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-10 w-full rounded-xl border border-border bg-background p-1"
          aria-label="Cor"
        />
        <button
          onClick={submit}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
        </button>
      </div>

      {kind === "debit" && (
        <label className="mt-2 block">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Cheque especial (opcional)</span>
          <MoneyInput
            value={overdraft}
            onChange={setOverdraft}
            placeholder="Limite do cheque especial"
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
      )}
    </div>
  );
}

function DebitRow({ account }: { account: Account }) {
  const { removeAccount, updateAccount } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: account.name,
    color: account.color,
    balance: Number(account.balance),
    overdraft_limit: Number(account.overdraft_limit ?? 0),
  });

  useEffect(() => {
    setDraft({
      name: account.name,
      color: account.color,
      balance: Number(account.balance),
      overdraft_limit: Number(account.overdraft_limit ?? 0),
    });
  }, [account.id, account.name, account.color, account.balance, account.overdraft_limit]);

  const overdraft = Number(account.overdraft_limit ?? 0);
  const balance = Number(account.balance);
  const usingOverdraft = overdraft > 0 && balance < 0;
  const overdraftUsed = usingOverdraft ? Math.min(overdraft, Math.abs(balance)) : 0;
  const overdraftPct = overdraft > 0 ? Math.min(100, (overdraftUsed / overdraft) * 100) : 0;

  async function save() {
    if (!draft.name.trim()) { toast.error("Nome obrigatório."); return; }
    await updateAccount(account.id, {
      name: draft.name.trim(),
      color: draft.color,
      balance: draft.balance,
      overdraft_limit: draft.overdraft_limit > 0 ? draft.overdraft_limit : null,
    });
    setEditing(false);
    toast.success("Conta atualizada.");
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ background: account.color }}>
            <Wallet className="h-4 w-4" />
          </span>
          <div>
            <p className="font-display text-sm font-semibold">{account.name}</p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Débito</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className={`font-display text-base font-semibold tabular-nums ${balance < 0 ? "text-status-danger" : ""}`}>{fmtBRL(balance)}</p>
          <button
            onClick={() => setEditing((v) => !v)}
            className="rounded-lg border border-border px-2 py-1 text-[11px] hover:border-primary"
          >
            {editing ? "Fechar" : "Editar"}
          </button>
          <ConfirmButton
            onConfirm={() => removeAccount(account.id)}
            title={`Remover ${account.name}?`}
            description="Esta ação não pode ser desfeita."
            className="text-muted-foreground hover:text-status-danger"
            ariaLabel="Remover"
          >
            <Trash2 className="h-4 w-4" />
          </ConfirmButton>
        </div>
      </div>

      {overdraft > 0 ? (
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Cheque especial</span>
            <span className="tabular-nums">
              {fmtBRL(overdraftUsed)} <span className="text-muted-foreground">/ {fmtBRL(overdraft)}</span>
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${overdraftPct}%`,
                background: overdraftPct > 85 ? "hsl(var(--status-danger))" : overdraftPct > 50 ? "hsl(var(--status-warn))" : "hsl(var(--status-safe))",
              }}
            />
          </div>
        </div>
      ) : null}

      {editing && (
        <div className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Nome do banco</span>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Cor</span>
            <input
              type="color"
              value={draft.color}
              onChange={(e) => setDraft({ ...draft, color: e.target.value })}
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background p-1"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Saldo atual</span>
            <MoneyInput
              value={draft.balance}
              onChange={(v) => setDraft({ ...draft, balance: v })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Cheque especial</span>
            <MoneyInput
              value={draft.overdraft_limit}
              onChange={(v) => setDraft({ ...draft, overdraft_limit: v })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button onClick={save} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreditRow({ account }: { account: Account }) {
  const {
    updateAccountCreditLimit,
    updateAccountCreditUsed,
    updateAccount,
    addExpenseManual,
    removeAccount,
    expenses,
    selectedMonth,
    installmentPlans,
    addInstallmentPlan,
    updateInstallmentPlan,
    removeInstallmentPlan,
  } = useStore();
  const plansForCard = installmentPlans.filter((p) => p.account_id === account.id);
  const [draftLimit, setDraftLimit] = useState(() => Number(account.credit_limit ?? 0));
  const [draftTotal, setDraftTotal] = useState(() => Number(account.credit_used));
  const [editingMeta, setEditingMeta] = useState(false);
  const [draftName, setDraftName] = useState(account.name);
  const [draftColor, setDraftColor] = useState(account.color);
  const [exp, setExp] = useState({ amount: 0, description: "", category: "" });
  const [showExpense, setShowExpense] = useState(false);
  const [savingLimit, setSavingLimit] = useState(false);
  const [savingTotal, setSavingTotal] = useState(false);
  const [planModal, setPlanModal] = useState(false);
  const [planDesc, setPlanDesc] = useState("");
  const [planTotal, setPlanTotal] = useState(0);
  const [planCount, setPlanCount] = useState(12);
  const [planStartMonth, setPlanStartMonth] = useState(selectedMonth);

  useEffect(() => {
    setPlanStartMonth(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    setDraftLimit(Number(account.credit_limit ?? 0));
    setDraftTotal(Number(account.credit_used));
    setDraftName(account.name);
    setDraftColor(account.color);
  }, [account.id, account.credit_limit, account.credit_used, account.name, account.color]);

  async function saveMeta() {
    if (!draftName.trim()) { toast.error("Nome obrigatório."); return; }
    await updateAccount(account.id, { name: draftName.trim(), color: draftColor });
    setEditingMeta(false);
    toast.success("Cartão atualizado.");
  }

  const used = Number(account.credit_used);
  const limit = Number(account.credit_limit ?? 0);
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const launched = expenses
    .filter((e) => e.account_id === account.id && e.method === "credit")
    .reduce((s, e) => s + Number(e.amount), 0);
  const diff = used - launched;

  async function saveLimit() {
    setSavingLimit(true);
    await updateAccountCreditLimit(account.id, Math.max(0, draftLimit));
    setSavingLimit(false);
    toast.success("Limite atualizado.");
  }

  async function saveTotal() {
    setSavingTotal(true);
    await updateAccountCreditUsed(account.id, Math.max(0, draftTotal));
    setSavingTotal(false);
    toast.success("Fatura ajustada.");
  }

  async function submitExpense() {
    const amt = exp.amount;
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Valor inválido.");
      return;
    }
    const r = await addExpenseManual({
      amount: amt,
      description: exp.description || "Compra cartão",
      category: exp.category || "Outros",
      method: "credit",
      account_id: account.id,
    });
    if (r.expense) {
      toast.success(`${fmtBRL(amt)} lançado em ${account.name}.`);
      setExp({ amount: 0, description: "", category: "" });
      setShowExpense(false);
      setDraftTotal(Number(account.credit_used) + amt);
    } else {
      toast.error(r.error ?? "Falha ao lançar.");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ background: account.color }}>
            <CreditCard className="h-4 w-4" />
          </span>
          <div>
            <p className="font-display text-sm font-semibold">{account.name}</p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Cartão de crédito</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className={`font-display text-sm font-semibold ${pct > 80 ? "text-status-danger" : pct > 50 ? "text-status-warn" : "text-status-safe"}`}>
            {Math.round(pct)}%
          </p>
          <ConfirmButton
            onConfirm={() => removeAccount(account.id)}
            title={`Remover ${account.name}?`}
            description="Esta ação não pode ser desfeita."
            className="text-muted-foreground hover:text-status-danger"
            ariaLabel="Remover"
          >
            <Trash2 className="h-4 w-4" />
          </ConfirmButton>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Fatura aberta</span>
        <span className="tabular-nums font-semibold">
          {fmtBRL(used)} <span className="text-muted-foreground">/ {fmtBRL(limit)}</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: pct > 80 ? "hsl(var(--status-danger))" : pct > 50 ? "hsl(var(--status-warn))" : "hsl(var(--status-safe))",
          }}
        />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Limite</label>
          <div className="mt-1 grid grid-cols-[1fr_auto] gap-1.5">
            <MoneyInput
              value={draftLimit}
              onChange={setDraftLimit}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button onClick={saveLimit} disabled={savingLimit} className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">
              {savingLimit ? "..." : "Salvar"}
            </button>
          </div>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Fatura total atual</label>
          <div className="mt-1 grid grid-cols-[1fr_auto] gap-1.5">
            <MoneyInput
              value={draftTotal}
              onChange={setDraftTotal}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button onClick={saveTotal} disabled={savingTotal} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:border-primary disabled:opacity-60">
              {savingTotal ? "..." : "Salvar"}
            </button>
          </div>
        </div>
      </div>

      {Math.abs(diff) > 0.009 ? (
        <p className={`mt-2 rounded-lg px-2 py-1 text-[11px] ${diff > 0 ? "bg-status-warn-bg text-amber-800" : "bg-status-danger-bg text-status-danger"}`}>
          {diff > 0
            ? `Faltam ${fmtBRL(Math.abs(diff))} em compras detalhadas para bater a fatura.`
            : `Lançado ${fmtBRL(Math.abs(diff))} acima da fatura ajustada.`}
        </p>
      ) : null}

      <div className="mt-3 border-t border-border pt-3">
        {!showExpense ? (
          <button
            onClick={() => setShowExpense(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Receipt className="h-3.5 w-3.5" /> Lançar gasto neste cartão
          </button>
        ) : (
          <div className="space-y-2 rounded-xl bg-secondary/50 p-3">
            <div className="grid gap-2 sm:grid-cols-[110px_1fr_140px]">
              <MoneyInput
                value={exp.amount}
                onChange={(v) => setExp({ ...exp, amount: v })}
                placeholder="Valor"
                autoFocus
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                value={exp.description}
                onChange={(e) => setExp({ ...exp, description: e.target.value })}
                placeholder="Descrição (ex: mercado)"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                value={exp.category}
                onChange={(e) => setExp({ ...exp, category: e.target.value })}
                placeholder="Categoria"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowExpense(false)} className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                Cancelar
              </button>
              <button onClick={submitExpense} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                Lançar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Compras parceladas</p>
          <button
            type="button"
            onClick={() => setPlanModal(true)}
            className="text-[11px] font-semibold text-primary hover:underline"
          >
            + Nova compra parcelada
          </button>
        </div>
        {plansForCard.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {plansForCard.map((plan) => {
              const dueNow = installmentDueForMonth(plan, selectedMonth);
              const active = plan.paid_installments < plan.installment_count;
              return (
                <li
                  key={plan.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-medium">{plan.description || "Compra parcelada"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {fmtBRL(plan.installment_amount)} · {plan.paid_installments}/{plan.installment_count} parcelas
                      {dueNow ? (
                        <span className="ml-1 text-status-warn"> · vence neste mês</span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {active && dueNow ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await updateInstallmentPlan(plan.id, { paid_installments: plan.paid_installments + 1 });
                          toast.success("Parcela registrada como paga.");
                        }}
                        className="rounded-lg bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground"
                      >
                        Marcar paga
                      </button>
                    ) : null}
                    <ConfirmButton
                      onConfirm={() => removeInstallmentPlan(plan.id)}
                      title="Remover compra parcelada?"
                      description="Esta ação não pode ser desfeita."
                      className="text-muted-foreground hover:text-status-danger"
                      ariaLabel="Remover compra"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </ConfirmButton>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-1 text-[11px] text-muted-foreground">Nenhuma compra parcelada neste cartão.</p>
        )}
      </div>

      {planModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center" onClick={() => setPlanModal(false)}>
          <div className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-lg sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-sm font-semibold">Nova compra parcelada — {account.name}</p>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="text-[11px] text-muted-foreground">Descrição</span>
                <input
                  value={planDesc}
                  onChange={(e) => setPlanDesc(e.target.value)}
                  placeholder="Ex: TV loja X"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-muted-foreground">Valor total</span>
                <MoneyInput
                  value={planTotal}
                  onChange={setPlanTotal}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-muted-foreground">Nº de parcelas</span>
                <input
                  type="number"
                  min={1}
                  value={planCount}
                  onChange={(e) => setPlanCount(Math.max(1, parseInt(e.target.value || "1", 10)))}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-muted-foreground">Primeira cobrança (mês)</span>
                <input
                  type="month"
                  value={planStartMonth}
                  onChange={(e) => setPlanStartMonth(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setPlanModal(false)} className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const count = Math.max(1, planCount);
                  const total = planTotal;
                  if (!(total > 0)) {
                    toast.error("Informe o valor total.");
                    return;
                  }
                  const inst = Math.round((total / count) * 100) / 100;
                  await addInstallmentPlan({
                    account_id: account.id,
                    description: planDesc.trim() || "Compra parcelada",
                    total_amount: total,
                    installment_count: count,
                    installment_amount: inst,
                    first_month_key: planStartMonth,
                    paid_installments: 0,
                  });
                  setPlanDesc("");
                  setPlanTotal(0);
                  setPlanCount(12);
                  setPlanModal(false);
                  toast.success("Compra parcelada registrada.");
                }}
                className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AddLoanForm() {
  const { addLoan } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    bank: "", total_amount: 0, installment_amount: 0,
    total_installments: "", paid_installments: "0", payment_day: "5", notes: "",
  });

  async function submit() {
    if (!form.bank.trim()) { toast.error("Informe o banco."); return; }
    const total = form.total_amount;
    const inst = form.installment_amount;
    const totalInst = parseInt(form.total_installments) || 1;
    const paidInst = parseInt(form.paid_installments) || 0;
    const day = Math.min(31, Math.max(1, parseInt(form.payment_day) || 1));
    if (total <= 0 || inst <= 0) { toast.error("Valores inválidos."); return; }
    await addLoan({
      bank: form.bank.trim(),
      total_amount: total,
      installment_amount: inst,
      total_installments: totalInst,
      paid_installments: paidInst,
      payment_day: day,
      notes: form.notes.trim() || null,
    });
    setForm({ bank: "", total_amount: 0, installment_amount: 0, total_installments: "", paid_installments: "0", payment_day: "5", notes: "" });
    setOpen(false);
    toast.success("Empréstimo adicionado.");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-card px-3 py-3 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary"
      >
        <Plus className="h-3.5 w-3.5" /> Registrar novo empréstimo
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Novo empréstimo</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Field label="Banco">
          <input value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} placeholder="Ex: Itaú" className="loan-input" />
        </Field>
        <Field label="Dia de pagamento">
          <input type="number" min="1" max="31" value={form.payment_day} onChange={(e) => setForm({ ...form, payment_day: e.target.value })} className="loan-input" />
        </Field>
        <Field label="Valor total">
          <MoneyInput
            value={form.total_amount}
            onChange={(v) => setForm({ ...form, total_amount: v })}
            placeholder="0,00"
            className="loan-input"
          />
        </Field>
        <Field label="Valor da parcela">
          <MoneyInput
            value={form.installment_amount}
            onChange={(v) => setForm({ ...form, installment_amount: v })}
            placeholder="0,00"
            className="loan-input"
          />
        </Field>
        <Field label="Total de parcelas">
          <input type="number" min="1" value={form.total_installments} onChange={(e) => setForm({ ...form, total_installments: e.target.value })} placeholder="Ex: 24" className="loan-input" />
        </Field>
        <Field label="Parcelas já pagas">
          <input type="number" min="0" value={form.paid_installments} onChange={(e) => setForm({ ...form, paid_installments: e.target.value })} className="loan-input" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Observações">
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Detalhes (opcional)" className="loan-input resize-none" />
          </Field>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
        <button onClick={submit} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Salvar empréstimo</button>
      </div>
      <style>{`.loan-input { width: 100%; border-radius: 0.75rem; border: 1px solid hsl(var(--border)); background: hsl(var(--background)); padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; } .loan-input:focus { border-color: hsl(var(--primary)); }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function LoanRow({ loan }: { loan: Loan }) {
  const { updateLoan, removeLoan } = useStore();
  const remaining = Math.max(0, loan.total_installments - loan.paid_installments);
  const remainingValue = remaining * Number(loan.installment_amount);
  const pct = loan.total_installments > 0 ? Math.min(100, (loan.paid_installments / loan.total_installments) * 100) : 0;

  async function pay() {
    if (loan.paid_installments >= loan.total_installments) return;
    await updateLoan(loan.id, { paid_installments: loan.paid_installments + 1 });
    toast.success("Parcela registrada como paga.");
  }

  async function unpay() {
    if (loan.paid_installments <= 0) return;
    await updateLoan(loan.id, { paid_installments: loan.paid_installments - 1 });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-foreground">
            <Landmark className="h-4 w-4" />
          </span>
          <div>
            <p className="font-display text-sm font-semibold">{loan.bank}</p>
            <p className="text-[11px] text-muted-foreground">Pagamento todo dia {loan.payment_day}</p>
          </div>
        </div>
        <ConfirmButton
          onConfirm={() => removeLoan(loan.id)}
          title={`Remover empréstimo ${loan.bank}?`}
          description="Esta ação não pode ser desfeita."
          className="text-muted-foreground hover:text-status-danger"
          ariaLabel="Remover"
        >
          <Trash2 className="h-4 w-4" />
        </ConfirmButton>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Total" value={fmtBRL(Number(loan.total_amount))} />
        <Stat label="Parcela" value={fmtBRL(Number(loan.installment_amount))} />
        <Stat label="Faltam" value={`${remaining}x`} sub={fmtBRL(remainingValue)} />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{loan.paid_installments} de {loan.total_installments} pagas</span>
        <span className="tabular-nums font-semibold">{Math.round(pct)}%</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-status-safe transition-all" style={{ width: `${pct}%` }} />
      </div>

      {loan.notes ? <p className="mt-2 text-[11px] text-muted-foreground">{loan.notes}</p> : null}

      <div className="mt-3 flex gap-2">
        <button onClick={pay} disabled={loan.paid_installments >= loan.total_installments} className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60">
          Marcar parcela paga
        </button>
        <button onClick={unpay} disabled={loan.paid_installments <= 0} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:border-primary disabled:opacity-60">
          Desfazer
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-secondary/50 px-2 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-sm font-semibold tabular-nums">{value}</p>
      {sub ? <p className="text-[10px] text-muted-foreground tabular-nums">{sub}</p> : null}
    </div>
  );
}
