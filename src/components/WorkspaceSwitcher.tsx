import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Building2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WORKSPACES, getStoredWorkspaceId, setStoredWorkspaceId } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const [currentId, setCurrentId] = useState<string>(getStoredWorkspaceId());

  useEffect(() => {
    const onStorage = () => setCurrentId(getStoredWorkspaceId());
    window.addEventListener("workspace:changed", onStorage as EventListener);
    return () => window.removeEventListener("workspace:changed", onStorage as EventListener);
  }, []);

  const current = WORKSPACES.find((w) => w.id === currentId) ?? WORKSPACES[0];

  const handleSelect = (id: string) => {
    if (id === currentId) return setOpen(false);
    setStoredWorkspaceId(id);
    setCurrentId(id);
    setOpen(false);
    const ws = WORKSPACES.find((w) => w.id === id);
    toast.success(`Cliente alterado`, { description: ws?.name });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-2 border-border/70 bg-muted/40 px-2.5 hover:bg-muted/70 max-w-[280px]"
        >
          <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-primary-foreground shadow-soft", current.avatarColor)}>
            <Building2 className="h-3.5 w-3.5" />
          </div>
          <div className="hidden sm:flex min-w-0 flex-col items-start leading-tight">
            <span className="truncate text-xs font-semibold max-w-[140px]">{current.name}</span>
            <span className="truncate text-[10px] text-muted-foreground max-w-[140px]">{current.phone}</span>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[300px] p-1">
        <div className="px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Clientes disponíveis
          </p>
        </div>
        <div className="space-y-0.5">
          {WORKSPACES.map((w) => {
            const active = w.id === currentId;
            return (
              <button
                key={w.id}
                onClick={() => handleSelect(w.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors",
                  active ? "bg-accent" : "hover:bg-muted"
                )}
              >
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-primary-foreground", w.avatarColor)}>
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{w.name}</div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Phone className="h-2.5 w-2.5" />
                    <span className="truncate">{w.phone}</span>
                  </div>
                </div>
                {active && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
        <div className="mt-1 border-t border-border px-3 py-2">
          <p className="text-[10px] text-muted-foreground">
            Você tem acesso a {WORKSPACES.length} clientes
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
