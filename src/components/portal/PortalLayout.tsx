import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PortalSidebar } from "./PortalSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/components/BrandingProvider";
import { useAuth } from "@/hooks/useAuth";
import { Bell, LogOut, TableProperties, ArrowUpDown, Search, BarChart2, PieChart, Settings, Workflow, HeadphonesIcon, ScrollText, Wrench } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import GlobalSearch from "@/components/GlobalSearch";
import TenantSwitcher from "@/components/TenantSwitcher";
import { useIsMobile } from "@/hooks/use-mobile";

export function PortalLayout() {
  const navigate = useNavigate();
  const { user, session, loading } = useAuth();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const branding = useBranding();
  const isMobile = useIsMobile();
  const { isAdmin } = useUserRole();

  useEffect(() => {
    if (!loading && !session) {
      navigate("/auth");
    }
  }, [loading, session, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  const userEmail = user?.email ?? null;
  const hasBranding = !!branding.secondary_color;
  const headerTextColor = hasBranding ? '#ffffff' : undefined;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PortalSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header
            className="sticky top-0 z-50 h-14 flex items-center px-2 sm:px-4 gap-2 sm:gap-4 border-b border-border/40 backdrop-blur-md"
            style={{
              backgroundColor: hasBranding
                ? branding.secondary_color!
                : 'hsl(var(--background) / 0.85)',
            }}
          >
            <div className="flex items-center flex-shrink-0 gap-2">
              <SidebarTrigger className="flex-shrink-0" style={{ color: headerTextColor }} />
              <div className="flex items-center gap-2">
                {branding.logo_url && (
                  <img
                    src={branding.logo_url}
                    alt={branding.company_name}
                    className="h-6 sm:h-7 w-auto object-contain"
                  />
                )}
                <span
                  className="hidden md:inline text-sm font-bold leading-tight"
                  style={{ color: headerTextColor }}
                >
                  CenCore
                </span>
              </div>
            </div>

            <div className="hidden sm:block flex-shrink-0">
              <TenantSwitcher brandingColor={branding.secondary_color} />
            </div>

            {isMobile ? (
              <div className="flex-1" />
            ) : (
              <GlobalSearch brandingColor={branding.secondary_color} />
            )}

            {!isMobile && <div className="flex-1" />}

            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                  style={{ color: headerTextColor }}
                >
                  <Search className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex h-8 w-8"
                onClick={() => navigate("/views")}
                title="List Builder"
                style={{ color: headerTextColor }}
              >
                <TableProperties className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden sm:flex h-8 w-8"
                    title="Insights"
                    style={{ color: headerTextColor }}
                  >
                    <BarChart2 className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="text-xs font-semibold">Insights</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/reporting")}>
                    <BarChart2 className="mr-2 h-4 w-4" />
                    Reporting
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/analytics")}>
                    <PieChart className="mr-2 h-4 w-4" />
                    Analytics
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex h-8 w-8"
                onClick={() => navigate("/import-export")}
                title="Import / Export"
                style={{ color: headerTextColor }}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-8 w-8"
                    style={{ color: headerTextColor }}
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 sm:w-80">
                  <div className="flex flex-col gap-2">
                    <h4 className="font-semibold text-sm">Notifications</h4>
                    <p className="text-sm text-muted-foreground">No new notifications</p>
                  </div>
                </PopoverContent>
              </Popover>

              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hidden sm:flex h-8 w-8"
                      title="Administration"
                      style={{ color: headerTextColor }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel className="text-xs font-semibold">Administration</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/audit-log")}>
                      <ScrollText className="mr-2 h-4 w-4" />
                      Audit Log
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/workflow-automation")}>
                      <Workflow className="mr-2 h-4 w-4" />
                      Workflow Automation
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/support")}>
                      <HeadphonesIcon className="mr-2 h-4 w-4" />
                      Support
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/setup")}>
                      <Wrench className="mr-2 h-4 w-4" />
                      Setup & Integration
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1.5 px-1.5 sm:px-2 h-8"
                    style={{ color: headerTextColor }}
                  >
                    <Avatar className="h-6 w-6 sm:h-7 sm:w-7">
                      <AvatarFallback
                        className="text-xs bg-primary/20 text-primary-foreground"
                        style={{
                          backgroundColor: hasBranding ? 'rgba(255,255,255,0.2)' : undefined,
                          color: headerTextColor,
                        }}
                      >
                        {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm hidden lg:inline max-w-[120px] truncate">
                      {userEmail ?? "User"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium truncate">{userEmail}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isMobile && (
                    <>
                      <DropdownMenuItem onClick={() => navigate("/views")}>
                        <TableProperties className="mr-2 h-4 w-4" />
                        List Builder
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/reporting")}>
                        <BarChart2 className="mr-2 h-4 w-4" />
                        Reporting
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/analytics")}>
                        <PieChart className="mr-2 h-4 w-4" />
                        Analytics
                      </DropdownMenuItem>
                      {isAdmin && (
                        <>
                          <DropdownMenuItem onClick={() => navigate("/audit-log")}>
                            <ScrollText className="mr-2 h-4 w-4" />
                            Audit Log
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate("/setup")}>
                            <Wrench className="mr-2 h-4 w-4" />
                            Setup & Integration
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem onClick={() => navigate("/import-export")}>
                        <ArrowUpDown className="mr-2 h-4 w-4" />
                        Import / Export
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {isMobile && mobileSearchOpen && (
            <div className="px-2 py-2 border-b border-border bg-background animate-in slide-in-from-top-2 duration-200">
              <GlobalSearch brandingColor={null} />
            </div>
          )}

          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
