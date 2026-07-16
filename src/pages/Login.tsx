import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Package, Truck, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { auth, NewPasswordRequiredError } from "@/lib/auth";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newPasswordRequired, setNewPasswordRequired] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  if (auth.get()) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha email e senha");
      return;
    }
    setLoading(true);
    try {
      await auth.login(email.trim(), password);
      toast.success("Bem-vindo ao AAL Peças 🚀");
      navigate("/", { replace: true });
    } catch (err: any) {
      if (err instanceof NewPasswordRequiredError) {
        setNewPasswordRequired(true);
        toast.info("Defina uma nova senha para concluir o acesso.");
        setLoading(false);
        return;
      }
      const code = err?.name || "";
      const msg =
        code === "NotAuthorizedException"
          ? "Email ou senha inválidos."
          : code === "UserNotConfirmedException"
          ? "Conta ainda não confirmada. Verifique seu email."
          : code === "PasswordResetRequiredException"
          ? "É necessário redefinir sua senha."
          : code === "UserNotFoundException"
          ? "Usuário não encontrado."
          : err?.message || "Não foi possível entrar. Tente novamente.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("As senhas não conferem.");
      return;
    }
    setLoading(true);
    try {
      await auth.completeNewPassword(newPassword, email.trim());
      toast.success("Senha atualizada! Bem-vindo 🚀");
      navigate("/", { replace: true });
    } catch (err: any) {
      const code = err?.name || "";
      const msg =
        code === "InvalidPasswordException"
          ? "Senha não atende aos requisitos de segurança."
          : err?.message || "Não foi possível atualizar a senha.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: brand */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-hero p-10 text-white">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage:
            "radial-gradient(800px 400px at 10% 0%, hsl(var(--primary)/0.4), transparent 60%), radial-gradient(600px 300px at 90% 100%, hsl(var(--primary-glow)/0.3), transparent 60%)",
        }} />
        <div className="relative">
          <Logo />
        </div>
        <div className="relative space-y-8">
          <div>
            <h1 className="font-display text-4xl font-bold leading-tight">
              A <span className="text-primary-glow">força</span> que move o seu caminhão — e o seu negócio.
            </h1>
            <p className="mt-4 max-w-md text-white/70">
              Gestão completa para sua loja de peças de linha pesada: estoque, vendas em marketplaces e atendimento em um só lugar.
            </p>
          </div>
          <div className="grid gap-3">
            {[
              { icon: Package, t: "Controle de estoque em tempo real" },
              { icon: Truck, t: "Vendas integradas: Mercado Livre, Magalu e loja própria" },
              { icon: BarChart3, t: "Dashboards de vendas e desempenho" },
            ].map(({ icon: Icon, t }) => (
              <div key={t} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
                  <Icon className="h-4 w-4 text-primary-glow" />
                </span>
                {t}
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-white/50">
          © {new Date().getFullYear()} AAL Peças. Todos os direitos reservados.
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 md:p-10 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8"><Logo /></div>
          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold">
              {newPasswordRequired ? "Definir nova senha" : "Entrar na sua conta"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {newPasswordRequired
                ? "Sua senha é temporária. Crie uma nova senha para concluir o acesso."
                : "Acesse com sua conta corporativa."}
            </p>
          </div>
          {!newPasswordRequired ? (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@empresa.com"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Esqueceu?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Mostrar senha"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-primary hover:opacity-95 shadow-glow h-11 text-sm font-semibold">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar no AAL Peças"}
              </Button>
            </form>
          ) : (
            <form onSubmit={submitNewPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={show ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Mostrar senha"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Confirmar nova senha</Label>
                <Input
                  id="confirmNewPassword"
                  type={show ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-primary hover:opacity-95 shadow-glow h-11 text-sm font-semibold">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar nova senha"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setNewPasswordRequired(false);
                  setNewPassword("");
                  setConfirmNewPassword("");
                  setPassword("");
                }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Voltar para o login
              </button>
            </form>
          )}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Ao continuar, você concorda com os <a className="underline hover:text-foreground">Termos</a> e a <a className="underline hover:text-foreground">Política de Privacidade</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
