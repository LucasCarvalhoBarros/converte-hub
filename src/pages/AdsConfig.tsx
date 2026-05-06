import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Megaphone, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAds, saveAds, Ad } from "@/lib/ads";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PLATFORMS = ["Instagram Ads", "Facebook Ads", "Google Ads", "TikTok Ads", "YouTube Ads", "LinkedIn Ads", "Outro"];

export default function AdsConfig() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [campaign, setCampaign] = useState("");
  const [url, setUrl] = useState("");
  const [filter, setFilter] = useState<"todos" | "ativos" | "inativos">("todos");

  useEffect(() => {
    setAds(getAds());
  }, []);

  const persist = (next: Ad[]) => {
    setAds(next);
    saveAds(next);
  };

  const handleAdd = () => {
    const n = name.trim();
    if (!n) {
      toast.error("Informe o nome do anúncio");
      return;
    }
    const id = "ad_" + n.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") + "_" + Date.now().toString(36);
    const next: Ad = {
      id,
      name: n,
      platform,
      campaign: campaign.trim() || undefined,
      url: url.trim() || undefined,
      active: true,
      createdAt: new Date().toISOString(),
    };
    persist([next, ...ads]);
    setName("");
    setCampaign("");
    setUrl("");
    toast.success("Anúncio cadastrado");
  };

  const handleRemove = (id: string) => {
    persist(ads.filter((a) => a.id !== id));
    toast.success("Anúncio removido");
  };

  const handleField = (id: string, patch: Partial<Ad>) => {
    persist(ads.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const visible = ads.filter((a) =>
    filter === "todos" ? true : filter === "ativos" ? a.active : !a.active
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl p-4 lg:p-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" /> Anúncios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre e gerencie os anúncios que originam seus leads. O anúncio pode ser vinculado a cada lead na tela de Leads.
          </p>
        </div>

        <Card className="p-5 space-y-3">
          <h2 className="font-display text-sm font-semibold">Cadastrar novo anúncio</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do anúncio (ex: Promo Verão)"
              maxLength={60}
            />
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder="Campanha (opcional)"
              maxLength={60}
            />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="URL de destino (opcional)"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAdd} className="gap-2 bg-gradient-primary hover:opacity-95 shadow-glow">
              <Plus className="h-4 w-4" /> Adicionar anúncio
            </Button>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display text-sm font-semibold">
              Anúncios ({visible.length}/{ads.length})
            </h2>
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
              {(["todos", "ativos", "inativos"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                    filter === f ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nenhum anúncio encontrado.
            </div>
          )}

          <div className="space-y-2">
            {visible.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "rounded-lg border bg-card p-3 transition-colors",
                  a.active ? "border-border" : "border-border/50 opacity-70"
                )}
              >
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] items-center gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-3.5 w-3.5 text-primary shrink-0" />
                      <Input
                        value={a.name}
                        onChange={(e) => handleField(a.id, { name: e.target.value })}
                        className="h-8 font-semibold"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded-full border border-border px-2 py-0.5 font-medium">{a.platform}</span>
                      {a.campaign && <span>• {a.campaign}</span>}
                      {a.url && (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> link
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Ativo</span>
                    <Switch
                      checked={a.active}
                      onCheckedChange={(v) => handleField(a.id, { active: v })}
                    />
                  </div>
                  <button
                    onClick={() => handleRemove(a.id)}
                    className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 justify-self-end"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
