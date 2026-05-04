import { useState } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Plus, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";

const EMOJIS = ["👤","🧑‍💼","🧑‍💻","🧑‍🎨","🧑‍🍳","🧑‍🎓","👨‍👩‍👧","🏢","💼","🏠"];
const COLORS = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#06b6d4","#ef4444","#0ea5e9"];

export default function Profiles() {
  const { profiles, createProfile, setActiveProfile, deleteProfile, loading } = useStore();
  const { signOut, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [color, setColor] = useState(COLORS[0]);

  async function handleCreate() {
    if (!name.trim()) { toast.error("Dê um nome ao perfil"); return; }
    const p = await createProfile(name.trim(), emoji, color);
    if (!p) { toast.error("Erro ao criar perfil"); return; }
    setOpen(false); setName("");
    setActiveProfile(p);
  }

  return (
    <main className="min-h-screen bg-gradient-surface px-4 py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Quem está usando?</p>
          <h1 className="mt-1 font-display text-3xl font-bold">Escolha seu perfil</h1>
          <p className="mt-2 text-xs text-muted-foreground">{user?.email}</p>
        </div>

        {loading ? (
          <p className="text-center text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {profiles.map((p) => (
              <div key={p.id} className="group relative">
                <button
                  onClick={() => setActiveProfile(p)}
                  className="flex w-full flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 shadow-card hover:border-primary hover:shadow-elegant transition"
                >
                  <div className="grid h-16 w-16 place-items-center rounded-2xl text-3xl shadow-glow" style={{ background: p.color }}>
                    {p.emoji}
                  </div>
                  <span className="font-display text-sm font-semibold">{p.name}</span>
                </button>
                <button
                  onClick={() => { if (confirm(`Excluir perfil "${p.name}"? Todos os dados serão perdidos.`)) deleteProfile(p.id); }}
                  className="absolute right-2 top-2 hidden h-7 w-7 place-items-center rounded-lg bg-background/80 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground group-hover:grid"
                  aria-label="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            <button
              onClick={() => setOpen(true)}
              className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/50 p-5 hover:border-primary hover:bg-card transition"
            >
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-muted-foreground">
                <Plus className="h-6 w-6" />
              </div>
              <span className="font-display text-sm font-semibold text-muted-foreground">Novo perfil</span>
            </button>
          </div>
        )}

        <button
          onClick={() => signOut()}
          className="mx-auto mt-10 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary transition"
        >
          <LogOut className="h-3.5 w-3.5" /> Sair
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-card p-6 safe-bottom" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 font-display text-lg font-semibold">Novo perfil</h3>

            <label className="block">
              <span className="text-xs text-muted-foreground">Nome</span>
              <input
                value={name} onChange={(e) => setName(e.target.value)} maxLength={30}
                placeholder="Ex: Pessoal, PJ, Família..."
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>

            <div className="mt-4">
              <p className="text-xs text-muted-foreground">Emoji</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setEmoji(e)}
                    className={`grid h-10 w-10 place-items-center rounded-xl text-xl transition ${emoji === e ? "bg-primary/10 ring-2 ring-primary" : "bg-secondary hover:bg-primary/5"}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs text-muted-foreground">Cor</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} aria-label={c}
                    className={`h-10 w-10 rounded-xl transition ${color === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : ""}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>

            <button
              onClick={handleCreate}
              className="mt-6 w-full rounded-xl bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-90"
            >
              Criar perfil
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
