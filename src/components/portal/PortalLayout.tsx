import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PortalSidebar } from "./PortalSidebar";
import { NotificationsPopover } from "./NotificationsPopover";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { BrandingProvider } from "./BrandingProvider";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Search, LayoutList } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTenantBranding } from "@/hooks/useTenantBranding";
import cenergisticLogoWhite from "@/assets/cenergistic-logo.svg";

const CENERGISTIC_LOGO = cenergisticLogoWhite;

interface PortalLayoutProps {
  children: React.ReactNode;
}

function isAllowedBrandAssetUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("/") || url.startsWith("data:") || url.startsWith("blob:")) return true;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host === window.location.hostname ||
      host.endsWith(".supabase.co") ||
      host === "storage.googleapis.com" ||
      host.endsWith(".googleusercontent.com")
    );
  } catch {
    return false;
  }
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const { data: branding } = useTenantBranding();
  const resolvedLogoSrc = isAllowedBrandAssetUrl(branding?.logo_url)
    ? (branding?.logo_url as string)
    : CENERGISTIC_LOGO;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/auth");
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id")
        .eq("read", false)
        .limit(10);
      
      setUnreadCount(data?.length || 0);
    };

    fetchUnreadNotifications();

    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getListBuilderUrl = () => {
    const path = location.pathname;
    if (path.startsWith("/crm/accounts")) return "/views/accounts";
    if (path.startsWith("/crm/contacts")) return "/views/contacts";
    if (path.startsWith("/crm/leads")) return "/views/leads";
    if (path.startsWith("/crm/quotes")) return "/views/quotes";
    if (path.startsWith("/crm/contracts")) return "/views/contracts";
    if (path.startsWith("/crm/invoices")) return "/views/invoices";
    if (path.startsWith("/crm/measures")) return "/views/measures";
    if (path.startsWith("/crm/buildings")) return "/views/buildings";
    if (path.startsWith("/crm/activities")) return "/views/activities";
    if (path.startsWith("/crm/connections")) return "/views/connections";
    if (path.startsWith("/crm/commission-splits")) return "/views/commission_splits";
    if (path.startsWith("/crm/energy-programs") || path.startsWith("/projects")) return "/views/projects";
    return "/views/opportunities";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/crm/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <BrandingProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full bg-background flex-col">
          <ImpersonationBanner />
          <div className="flex flex-1">
            <PortalSidebar />
            <main className="flex-1 flex flex-col">
              <header className="sticky top-0 z-50 flex h-16 items-center gap-2 sm:gap-4 border-b border-primary/10 bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20 backdrop-blur-lg px-3 sm:px-4 md:px-6">
                <SidebarTrigger className="z-10 shrink-0 text-white hover:bg-white/20 rounded-md transition-all duration-200 hover:shadow-md" />
                
                <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
                  <div className="h-8 w-px bg-white/30" />
                  <img 
                    src={resolvedLogoSrc}
                    alt={branding?.company_name || "Cenergistic"} 
                    className="h-8 w-auto shrink-0 drop-shadow-md"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.src !== CENERGISTIC_LOGO) {
                        img.src = CENERGISTIC_LOGO;
                      }
                    }}
                  />
                  
                  <div className="hidden sm:flex items-center gap-3">
                    <div className="h-5 w-px bg-white/30" />
                    <h1 className="text-base font-semibold text-white tracking-tight">
                      CenCore
                    </h1>
                  </div>
                </div>
            
                <form onSubmit={handleSearch} className="flex-1 min-w-0 max-w-none sm:max-w-lg mx-1 sm:mx-2">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 group-focus-within:text-white/90 transition-colors duration-200" />
                    <Input
                      type="search"
                      placeholder="Search accounts, contacts..."
                      className="w-full pl-9 pr-4 h-8 sm:h-9 text-sm bg-white/15 border-white/30 text-white placeholder:text-white/50 rounded-lg focus:outline-none focus:bg-white/20 focus:border-white/50 focus:ring-2 focus:ring-white/30 transition-all duration-200 backdrop-blur-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </form>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(getListBuilderUrl())}
                        className="shrink-0 text-white hover:bg-white/20 hover:text-white"
                      >
                        <LayoutList className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>List Builder</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <div className="flex items-center gap-3 ml-auto">
                  <NotificationsPopover
                    unreadCount={unreadCount}
                    onUnreadCountChange={setUnreadCount}
                  />
                  <span className="hidden lg:inline text-sm text-white/80 truncate max-w-[180px] font-medium">{user?.email}</span>
                </div>
              </header>
              <div className="flex-1 overflow-auto p-4 md:p-6">
                {children}
              </div>
            </main>
          </div>
          
          {branding?.show_powered_by && (
            <footer className="border-t border-border py-2 px-4 text-center text-xs text-muted-foreground">
              Powered by {branding.company_name || "M&S Dynamics"}
            </footer>
          )}
        </div>
      </SidebarProvider>
    </BrandingProvider>
  );
}
