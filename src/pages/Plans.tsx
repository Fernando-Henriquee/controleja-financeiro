import { useState, useEffect } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/hooks/useSubscription";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { Check, Sparkles, ArrowLeft, X, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

type PlanCard = {
  id: "free" | "pro" | "pro_ai";
  name: string;
  price: string;
  priceId?: string;
  tagline: string;
  highlighted?: boolean;
  features: string[];
};

const PLANS: PlanCard[] = [
  {
    id: "free",
    name: "Free",
    price: "R$ 0",
    tagline: "Comece a organizar seu mês",
    features: [
      "Até 2 contas",
      "Até 2 cartões",
      "Lançamentos manuais",
      "Calendário e lembretes básicos",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 14,90",
    priceId: "pro_monthly",
    tagline: "Para quem quer controle total",
    features: [
      "Contas e cartões ilimitados",
      "Faturas, parcelamentos e empréstimos",
      "Recorrentes com aplicação automática",
      "Projeções e relatórios anuais",
      "Cheque especial e fluxo de caixa",
    ],
  },
  {
    id: "pro_ai",
    name: "Pro + IA",
    price: "R$ 24,90",
    priceId: "pro_ai_monthly",
    tagline: "Seu copiloto financeiro pessoal",
    highlighted: true,
    features: [
      "Tudo do Pro",
      "Coach Financeiro IA com chat ilimitado",
      "Análise mensal automática",
      "Fila inteligente de pagamentos",
      "Recomendações personalizadas",
    ],
  },
];

export default function Plans() {
  const { session, loading } = useAuth();
  const { plan: currentPlan, isActive } = useSubscription();
  const [checkoutPrice, setCheckoutPrice] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      toast.success("Pagamento confirmado! Seu plano será ativado em instantes.");
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  if (loading) return <main className="grid min-h-screen place-items-center text-sm text-muted-foreground">Carregando...</main>;
  if (!session) return <Navigate to="/auth" replace />;

  const openPortal = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/planos`,
        },
      });
      if (error || !data?.url) throw new Error(error?.message || "Falha ao abrir portal");
      window.open(data.url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir portal");
    } finally {
      setOpeningPortal(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-surface pb-16">
      <div className="mx-auto max-w-6xl space-y-10 px-4 pt-8 lg:px-6">
        <header className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
          {isActive && (
            <button
              onClick={openPortal}
              disabled={openingPortal}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-primary disabled:opacity-50"
            >
              {openingPortal ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
              Gerenciar assinatura
            </button>
          )}
        </header>

        <div className="space-y-3 text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> Planos
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
            Seu copiloto financeiro,<br className="hidden md:block" /> sem complicação.
          </h1>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            Sem permanência. Cancele quando quiser direto pelo portal.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {PLANS.map((p) => {
            const isCurrent = currentPlan === p.id && (p.id === "free" ? !isActive : isActive);
            return (
              <div
                key={p.id}
                className={`relative flex flex-col gap-5 rounded-3xl border bg-card p-6 shadow-sm transition ${
                  p.highlighted
                    ? "border-primary shadow-elegant ring-1 ring-primary/20"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {p.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    Mais popular
                  </span>
                )}
                <div className="space-y-1">
                  <h3 className="font-display text-xl font-bold">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.tagline}</p>
                </div>
                <div className="flex items-end gap-1">
                  <span className="font-display text-3xl font-bold">{p.price}</span>
                  {p.id !== "free" && <span className="pb-1 text-xs text-muted-foreground">/mês</span>}
                </div>
                <ul className="flex-1 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button disabled className="rounded-full border border-border bg-secondary py-2.5 text-xs font-semibold text-muted-foreground">
                    Plano atual
                  </button>
                ) : p.id === "free" ? (
                  <Link to="/" className="rounded-full border border-border py-2.5 text-center text-xs font-semibold hover:border-primary">
                    Continuar grátis
                  </Link>
                ) : (
                  <button
                    onClick={() => setCheckoutPrice(p.priceId!)}
                    className={`rounded-full py-2.5 text-xs font-semibold transition ${
                      p.highlighted
                        ? "bg-primary text-primary-foreground hover:opacity-90"
                        : "border border-primary text-primary hover:bg-primary/5"
                    }`}
                  >
                    Assinar {p.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {checkoutPrice && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-card shadow-elegant">
            <button
              onClick={() => setCheckoutPrice(null)}
              className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-background/80 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="max-h-[90vh] overflow-y-auto">
              <StripeEmbeddedCheckout
                priceId={checkoutPrice}
                customerEmail={session.user.email ?? undefined}
                userId={session.user.id}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
