import { useTenant } from "@/hooks/useTenant";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export default function TenantSwitcher({ brandingColor }: { brandingColor?: string | null }) {
  const { activeTenant, tenants, switchTenant, loading } = useTenant();

  if (loading || tenants.length === 0) return null;

  // If only one tenant, just show label
  if (tenants.length === 1) {
    return (
      <div className="flex items-center gap-2 px-2">
        <Building2 className="h-4 w-4 flex-shrink-0" style={{ color: brandingColor ? "rgba(255,255,255,0.7)" : undefined }} />
        <span className="text-sm font-medium truncate max-w-[140px]" style={{ color: brandingColor ? "#ffffff" : undefined }}>
          {activeTenant?.name || "No Tenant"}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2" style={{ color: brandingColor ? "#ffffff" : undefined }}>
          <Building2 className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium truncate max-w-[140px]">
            {activeTenant?.name || "Select Tenant"}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map(m => (
          <DropdownMenuItem
            key={m.tenant_id}
            onClick={() => switchTenant(m.tenant_id)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="truncate">{m.tenant.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
              {m.tenant_id === activeTenant?.id && <Check className="h-4 w-4 text-primary" />}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
