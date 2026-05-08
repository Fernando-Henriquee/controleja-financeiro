import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { FastInput } from "@/components/FastInput";
import { ExpenseForm } from "@/components/ExpenseForm";
import { RecentExpenses } from "@/components/RecentExpenses";
import { Sparkles, Pencil } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import Profiles from "./Profiles";

export default function LancarPage() {
  const { session, loading } = useAuth();
  const { activeProfile } = useStore();
  const [tab, setTab] = useState<"texto" | "campos">("texto");

  if (loading) return <main className="grid min-h-screen place-items-center text-sm text-muted-foreground">Carregando...</main>;
  if (!session) return <Navigate to="/auth" replace />;
  if (!activeProfile) return <Profiles />;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 lg:px-6">
        <header>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Anotação</p>
          <h1 className="font-display text-2xl font-bold tracking-tight">Lançar gasto</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Escreva como se fala, ou preencha campo a campo. Datas futuras ficam agendadas e descontam sozinhas no dia.
          </p>
        </header>

        <div className="flex gap-1 rounded-2xl border border-border bg-card p-1">
          <button
            onClick={() => setTab("texto")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition",
              tab === "texto" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Sparkles className="h-3.5 w-3.5" /> Texto rápido
          </button>
          <button
            onClick={() => setTab("campos")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition",
              tab === "campos" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Pencil className="h-3.5 w-3.5" /> Campos
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          {tab === "texto" ? (
            <FastInput />
          ) : (
            <ExpenseForm />
          )}
        </div>

        <section className="space-y-3">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Últimos lançamentos</h2>
          <RecentExpenses />
        </section>
      </div>
    </AppShell>
  );
}
