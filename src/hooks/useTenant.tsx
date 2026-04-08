import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type TenantInfo = {
  id: string;
  name: string;
  domain: string | null;
};

type TenantMembership = {
  tenant_id: string;
  role: string;
  is_active: boolean;
  tenant: TenantInfo;
};

type TenantContextType = {
  activeTenantId: string | null;
  activeTenant: TenantInfo | null;
  tenants: TenantMembership[];
  switchTenant: (tenantId: string) => Promise<void>;
  loading: boolean;
  isTenantAdmin: boolean;
};

const TenantContext = createContext<TenantContextType>({
  activeTenantId: null,
  activeTenant: null,
  tenants: [],
  switchTenant: async () => {},
  loading: true,
  isTenantAdmin: false,
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<TenantMembership[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTenants = useCallback(async (userId: string) => {
    const { data, error } = await (supabase as any)
      .from("tenant_members")
      .select("tenant_id, role, is_active, tenant:tenants(id, name, domain)")
      .eq("user_id", userId);

    if (error || !data) { setLoading(false); return; }

    const memberships: TenantMembership[] = (data as any[]).map((d: any) => ({
      tenant_id: d.tenant_id,
      role: d.role,
      is_active: d.is_active,
      tenant: d.tenant,
    }));

    setTenants(memberships);

    const stored = localStorage.getItem("activeTenantId");
    const active = memberships.find(m => m.is_active);
    const storedMatch = stored ? memberships.find(m => m.tenant_id === stored) : null;

    const selected = storedMatch || active || memberships[0] || null;
    if (selected) {
      setActiveTenantId(selected.tenant_id);
      localStorage.setItem("activeTenantId", selected.tenant_id);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setTenants([]);
      setActiveTenantId(null);
      localStorage.removeItem("activeTenantId");
      setLoading(false);
      return;
    }
    loadTenants(user.id);
  }, [user, authLoading, loadTenants]);

  const switchTenant = async (tenantId: string) => {
    setActiveTenantId(tenantId);
    localStorage.setItem("activeTenantId", tenantId);

    if (!user) return;

    await (supabase as any)
      .from("tenant_members")
      .update({ is_active: false } as any)
      .eq("user_id", user.id);

    await (supabase as any)
      .from("tenant_members")
      .update({ is_active: true } as any)
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId);
  };

  const activeTenant = tenants.find(t => t.tenant_id === activeTenantId)?.tenant || null;
  const isTenantAdmin = tenants.find(t => t.tenant_id === activeTenantId)?.role === "admin";

  return (
    <TenantContext.Provider value={{ activeTenantId, activeTenant, tenants, switchTenant, loading, isTenantAdmin }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
