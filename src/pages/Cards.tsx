import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Landmark, Plus, Trash2, Wallet, Receipt } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { fmtBRL } from "@/lib/finance";
import { toast } from "sonner";
import type { Account, Loan } from "@/lib/types";
import { ConfirmButton } from "@/components/ConfirmButton";

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
  const [limit, setLimit] = useState("");
  const [balance, setBalance] = useState("");
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
      const l = parseFloat(limit.replace(",", "."));
      if (!Number.isFinite(l) || l <= 0) {
        toast.error("Informe o limite do cartão.");
        return;
      }
      await addCreditAccount(name.trim(), color, l);
    } else {
      const b = parseFloat((balance || "0").replace(",", "."));
      await addDebitAccount(name.trim(), color, Number.isFinite(b) ? b : 0);
    }
    setName(""); setLimit(""); setBalance("");
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
          <input
            type="number"
            inputMode="decimal"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="Limite"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        ) : (
          <input
            type="number"
            inputMode="decimal"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
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
    </div>
  );
}

function DebitRow({ account }: { account: Account }) {
  const { removeAccount } = useStore();
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
          <p className="font-display text-base font-semibold tabular-nums">{fmtBRL(Number(account.balance))}</p>
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
    </div>
  );
}

function CreditRow({ account }: { account: Account }) {
  const { updateAccountCreditLimit, updateAccountCreditUsed, addExpenseManual, removeAccount, expenses } = useStore();
  const [draftLimit, setDraftLimit] = useState(String(account.credit_limit ?? 0));
  const [draftTotal, setDraftTotal] = useState(String(account.credit_used));
  const [exp, setExp] = useState({ amount: "", description: "", category: "" });
  const [showExpense, setShowExpense] = useState(false);
  const [savingLimit, setSavingLimit] = useState(false);
  const [savingTotal, setSavingTotal] = useState(false);

  const used = Number(account.credit_used);
  const limit = Number(account.credit_limit ?? 0);
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const launched = expenses
    .filter((e) => e.account_id === account.id && e.method === "credit")
    .reduce((s, e) => s + Number(e.amount), 0);
  const diff = used - launched;

  async function saveLimit() {
    setSavingLimit(true);
    const v = draftLimit.trim() === "" ? null : Math.max(0, parseFloat(draftLimit.replace(",", ".")) || 0);
    await updateAccountCreditLimit(account.id, v);
    setSavingLimit(false);
    toast.success("Limite atualizado.");
  }

  async function saveTotal() {
    setSavingTotal(true);
    await updateAccountCreditUsed(account.id, Math.max(0, parseFloat(draftTotal.replace(",", ".")) || 0));
    setSavingTotal(false);
    toast.success("Fatura ajustada.");
  }

  async function submitExpense() {
    const amt = parseFloat(exp.amount.replace(",", "."));
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
      setExp({ amount: "", description: "", category: "" });
      setShowExpense(false);
      setDraftTotal(String(Number(account.credit_used) + amt));
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
            <input
              type="number"
              inputMode="decimal"
              value={draftLimit}
              onChange={(e) => setDraftLimit(e.target.value)}
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
            <input
              type="number"
              inputMode="decimal"
              value={draftTotal}
              onChange={(e) => setDraftTotal(e.target.value)}
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
              <input
                type="number"
                inputMode="decimal"
                value={exp.amount}
                onChange={(e) => setExp({ ...exp, amount: e.target.value })}
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
    </div>
  );
}

function AddLoanForm() {
  const { addLoan } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    bank: "", total_amount: "", installment_amount: "",
    total_installments: "", paid_installments: "0", payment_day: "5", notes: "",
  });

  async function submit() {
    if (!form.bank.trim()) { toast.error("Informe o banco."); return; }
    const total = parseFloat(form.total_amount.replace(",", ".")) || 0;
    const inst = parseFloat(form.installment_amount.replace(",", ".")) || 0;
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
    setForm({ bank: "", total_amount: "", installment_amount: "", total_installments: "", paid_installments: "0", payment_day: "5", notes: "" });
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
          <input type="number" inputMode="decimal" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} placeholder="0,00" className="loan-input" />
        </Field>
        <Field label="Valor da parcela">
          <input type="number" inputMode="decimal" value={form.installment_amount} onChange={(e) => setForm({ ...form, installment_amount: e.target.value })} placeholder="0,00" className="loan-input" />
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
