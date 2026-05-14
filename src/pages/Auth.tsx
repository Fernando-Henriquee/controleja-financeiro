import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

export default function Auth() {
  const { signIn, signUp, session } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  if (session) return <Navigate to="/" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error("Senha precisa ter ao menos 6 caracteres"); return; }
    setLoading(true);
    const { error } = mode === "signin" ? await signIn(email, password) : await signUp(email, password);
    setLoading(false);
    if (error) { toast.error(error); return; }
    toast.success(mode === "signin" ? "Bem-vindo de volta" : "Conta criada");
    navigate("/");
  }

  async function onGoogle() {
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setGoogleLoading(false);
      toast.error("Não foi possível entrar com Google. Tente novamente.");
      return;
    }
    if (result.redirected) return;
    navigate("/");
  }

  return (
    <main className="min-h-screen bg-gradient-surface px-4 py-8 lg:px-8 lg:py-12">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:items-center">
        <div className="hidden lg:block">
          <h1 className="font-display text-4xl font-bold">Copilot Financeiro</h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Controle comportamental com limite diario dinamico, alertas ativos e previsao para fechar o mes no verde.
          </p>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-elegant lg:mx-0">
              <Wallet className="h-6 w-6" />
            </div>
            <h1 className="font-display text-3xl font-bold lg:hidden">Copilot Financeiro</h1>
            <p className="mt-2 text-sm text-muted-foreground">Disciplina automática para seus gastos.</p>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-semibold">
              {mode === "signin" ? "Entrar" : "Criar conta"}
            </h2>

            <button
              type="button"
              onClick={onGoogle}
              disabled={googleLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background py-2.5 text-sm font-semibold hover:bg-secondary transition disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden>
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.5c-2 1.4-4.6 2.3-7.5 2.3-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.5 5.5c-.4.4 7-5.1 7-15.2 0-1.3-.1-2.3-.4-3.5z" />
              </svg>
              {googleLoading ? "Aguarde..." : "Continuar com Google"}
            </button>

            <div className="flex items-center gap-2 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">ou</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              <label className="block">
                <span className="text-xs text-muted-foreground">E-mail</span>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                  autoComplete="email"
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Senha</span>
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </label>

              <button
                type="submit" disabled={loading}
                className="w-full rounded-xl bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50"
              >
                {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
              </button>

              <button
                type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="w-full text-center text-xs text-muted-foreground hover:text-primary transition"
              >
                {mode === "signin" ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
