import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { auth } from "@/lib/auth";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code || !password) {
      toast.error("Preencha todos os campos.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      await auth.confirmForgotPassword(email.trim(), code.trim(), password);
      toast.success("Senha redefinida com sucesso. Faça login.");
      navigate("/login", { replace: true });
    } catch (err: any) {
      const codeName = err?.name || "";
      const msg =
        codeName === "CodeMismatchException"
          ? "Código inválido."
          : codeName === "ExpiredCodeException"
          ? "Código expirado. Solicite outro."
          : codeName === "InvalidPasswordException"
          ? "Senha não atende aos requisitos."
          : err?.message || "Não foi possível redefinir a senha.";
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
            Defina uma <span className="text-primary-glow">nova senha</span>.
          </h1>
          <p className="mt-4 max-w-md text-white/70">
            Use o código que enviamos para o seu email para concluir a redefinição.
          </p>
        </div>
        <div className="relative text-xs text-white/50">© {new Date().getFullYear()} AAL Peças.</div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-10 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8"><Logo /></div>
          <button onClick={() => navigate("/forgot-password")} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold">Redefinir senha</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Informe o código recebido e a nova senha.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Código de verificação</Label>
              <Input id="code" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Mostrar senha">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar nova senha</Label>
              <Input id="confirm" type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary hover:opacity-95 shadow-glow h-11 text-sm font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redefinir senha"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
