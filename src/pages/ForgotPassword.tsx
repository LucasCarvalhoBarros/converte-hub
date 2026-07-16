import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { auth } from "@/lib/auth";
import { toast } from "sonner";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Informe seu email");
      return;
    }
    setLoading(true);
    try {
      await auth.forgotPassword(email.trim());
      toast.success("Enviamos um código para o seu email.");
      navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`);
    } catch (err: any) {
      const code = err?.name || "";
      const msg =
        code === "UserNotFoundException"
          ? "Usuário não encontrado."
          : code === "LimitExceededException"
          ? "Muitas tentativas. Tente novamente mais tarde."
          : err?.message || "Não foi possível solicitar a redefinição.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-hero p-10 text-white">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage:
            "radial-gradient(800px 400px at 10% 0%, hsl(var(--primary)/0.4), transparent 60%), radial-gradient(600px 300px at 90% 100%, hsl(var(--primary-glow)/0.3), transparent 60%)",
        }} />
        <div className="relative"><Logo /></div>
        <div className="relative">
          <h1 className="font-display text-4xl font-bold leading-tight">
            Recupere o acesso à sua <span className="text-primary-glow">conta</span>.
          </h1>
          <p className="mt-4 max-w-md text-white/70">
            Vamos enviar um código de verificação para o seu email cadastrado.
          </p>
        </div>
        <div className="relative text-xs text-white/50">© {new Date().getFullYear()} AAL Peças.</div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-10 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8"><Logo /></div>
          <button onClick={() => navigate("/login")} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar para o login
          </button>
          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold">Esqueceu sua senha?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Informe seu email e enviaremos um código para redefinir.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                autoComplete="email"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary hover:opacity-95 shadow-glow h-11 text-sm font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar código"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
