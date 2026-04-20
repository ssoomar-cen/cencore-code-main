import { useNavigate, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard, LogOut, ScrollText,
  ChevronDown, Settings, Calendar,
  FileText, CalendarDays, Building2, UserSquare2, TrendingUp,
  FolderKanban, Link, Zap, Receipt, UserPlus,
  SplitSquareHorizontal, UserCheck, DollarSign, Sun, Moon,
  ClipboardList, Megaphone, Wallet, Search as SearchIcon,
  Briefcase,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/components/theme-provider";
import { useBranding } from "@/components/BrandingProvider";
import { cn } from "@/lib/utils";

function hexToHsl(hex?: string | null): string | null {
  if (!hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

type NavLeafItem = {
  title: string;
  url: string;
  icon: React.ElementType;
  featureKey?: string;
};

type NavGroupItem = {
  title: string;
  icon: React.ElementType;
  children: NavLeafItem[];
};

type NavSectionItem = NavLeafItem | NavGroupItem;

function isGroupItem(item: NavSectionItem): item is NavGroupItem {
  return "children" in item;
}

// Map URLs to feature_keys for filtering
const URL_FEATURE_KEY: Record<string, string> = {
  "/crm/leads": "leads",
  "/crm/accounts": "accounts",
  "/crm/contacts": "contacts",
  "/crm/connections": "connections",
  "/crm/opportunities": "opportunities",
  "/crm/quotes": "quotes",
  "/crm/commission-splits": "commission_splits",
  "/crm/activities": "activities",
  "/calendar": "calendar",
  
  "/crm/contracts": "contracts",
  "/crm/invoices": "invoices",
  
  "/crm/buildings": "buildings",
  "/projects": "energy_programs",
  "/energy-audits": "energy_audits",
  "/campaigns": "campaigns",
  "/budget": "budget_tracking",
  "/reporting": "reporting",
  "/analytics": "analytics",
  
  "/audit-log": "audit_log",
  "/workflow-automation": "workflow_automation",
  "/support": "support",
};

// ── Dashboard (always visible, no section) ──
const dashboardItem: NavLeafItem = { title: "Dashboard", url: "/", icon: LayoutDashboard };

// ── CRM & Sales ──
const crmSalesSection: NavSectionItem[] = [
  {
    title: "Customers",
    icon: UserCheck,
    children: [
      { title: "Leads", url: "/crm/leads", icon: UserPlus },
      { title: "Organizations", url: "/crm/accounts", icon: Building2 },
      { title: "Contacts", url: "/crm/contacts", icon: UserSquare2 },
      { title: "Connections", url: "/crm/connections", icon: Link },
    ],
  },
  {
    title: "Sales Pipeline",
    icon: TrendingUp,
    children: [
      { title: "Opportunities", url: "/crm/opportunities", icon: DollarSign },
      { title: "Quotes", url: "/crm/quotes", icon: FileText },
      { title: "Contracts", url: "/crm/contracts", icon: ScrollText },
    ],
  },
];

// ── Operations ──
const operationsSection: NavSectionItem[] = [
  {
    title: "Energy Programs",
    icon: Zap,
    children: [
      { title: "Programs", url: "/projects", icon: ClipboardList },
      { title: "Buildings", url: "/crm/buildings", icon: FolderKanban },
      { title: "Energy Audits", url: "/energy-audits", icon: SearchIcon },
    ],
  },
  {
    title: "Schedule",
    icon: CalendarDays,
    children: [
      { title: "Activities", url: "/crm/activities", icon: CalendarDays },
      { title: "Calendar", url: "/calendar", icon: Calendar },
    ],
  },
];

// ── Marketing ──
const marketingSection: NavSectionItem[] = [
  { title: "Campaigns", url: "/campaigns", icon: Megaphone },
];

// ── Finance ──
const financeSection: NavSectionItem[] = [
  { title: "Invoices", url: "/crm/invoices", icon: Receipt },
  { title: "Commission Splits", url: "/crm/commission-splits", icon: SplitSquareHorizontal },
  { title: "Budget Tracking", url: "/budget", icon: Wallet },
];


function getLeafUrls(items: NavSectionItem[]): string[] {
  return items.flatMap(item =>
    isGroupItem(item) ? item.children.map(c => c.url) : [item.url]
  );
}

export function PortalSidebar() {
  const { open, openMobile, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { theme, setTheme } = useTheme();
  const branding = useBranding();
  const [user, setUser] = useState<any>(null);
  const [disabledFeatures, setDisabledFeatures] = useState<Set<string>>(new Set());

  const [crmSalesOpen, setCrmSalesOpen] = useState(true);
  const [operationsOpen, setOperationsOpen] = useState(true);
  const [marketingOpen, setMarketingOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [customersOpen, setCustomersOpen] = useState(true);
  const [pipelineOpen, setPipelineOpen] = useState(true);
  const [programsOpen, setProgramsOpen] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    supabase.from("feature_flags").select("feature_key, is_enabled").then(({ data }) => {
      if (data) {
        const disabled = new Set(data.filter(f => !f.is_enabled).map(f => f.feature_key));
        setDisabledFeatures(disabled);
      }
    });
  }, []);

  const filterItems = (items: NavSectionItem[]): NavSectionItem[] => {
    return items
      .map(item => {
        if (isGroupItem(item)) {
          const filteredChildren = item.children.filter(child => {
            const key = URL_FEATURE_KEY[child.url];
            return !key || !disabledFeatures.has(key);
          });
          if (filteredChildren.length === 0) return null;
          return { ...item, children: filteredChildren };
        }
        const key = URL_FEATURE_KEY[item.url];
        if (key && disabledFeatures.has(key)) return null;
        return item;
      })
      .filter(Boolean) as NavSectionItem[];
  };

  const filteredCrmSales = filterItems(crmSalesSection);
  const filteredOperations = filterItems(operationsSection);
  const filteredMarketing = filterItems(marketingSection);
  const filteredFinance = filterItems(financeSection);

  const sidebarStyle = useMemo(() => {
    const primaryHsl = hexToHsl(branding.primary_color);
    if (!primaryHsl) return undefined;

    return {
      "--sidebar-background": primaryHsl,
      "--sidebar-foreground": "0 0% 100%",
      "--sidebar-primary": "0 0% 100%",
      "--sidebar-accent-foreground": "0 0% 100%",
      "--sidebar-ring": "0 0% 100%",
    } as React.CSSProperties;
  }, [branding.primary_color]);

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/" || currentPath === "/crm" || currentPath === "/crm/";
    return currentPath === path || currentPath.startsWith(`${path}/`);
  };

  useEffect(() => {
    // Auto-expand sections based on current route
    const crmSalesUrls = getLeafUrls(crmSalesSection);
    const opsUrls = getLeafUrls(operationsSection);
    const marketingUrls = getLeafUrls(marketingSection);
    const financeUrls = getLeafUrls(financeSection);

    if (crmSalesUrls.some(isActive)) setCrmSalesOpen(true);
    if (opsUrls.some(isActive)) setOperationsOpen(true);
    if (marketingUrls.some(isActive)) setMarketingOpen(true);
    if (financeUrls.some(isActive)) setFinanceOpen(true);

    // Auto-expand sub-groups
    const customerUrls = ["/crm/leads", "/crm/accounts", "/crm/contacts", "/crm/connections"];
    if (customerUrls.some(isActive)) { setCrmSalesOpen(true); setCustomersOpen(true); }

    const pipelineUrls = ["/crm/opportunities", "/crm/quotes", "/crm/contracts"];
    if (pipelineUrls.some(isActive)) { setCrmSalesOpen(true); setPipelineOpen(true); }

    const scheduleUrls = ["/crm/activities", "/calendar"];
    if (scheduleUrls.some(isActive)) { setOperationsOpen(true); setScheduleOpen(true); }

    const programUrls = ["/projects", "/crm/buildings", "/energy-audits"];
    if (programUrls.some(isActive)) { setOperationsOpen(true); setProgramsOpen(true); }
  }, [currentPath]);

  useEffect(() => {
    if (isMobile && openMobile) setOpenMobile(false);
  }, [currentPath]);

  const getUserInitials = () => {
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth");
    }
  };

  const renderLeafItem = (item: NavLeafItem) => {
    const active = isActive(item.url);
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          isActive={active}
          className={cn(
            "h-8 rounded-md transition-all duration-200 relative group",
            active
              ? "bg-sidebar-accent text-sidebar-foreground font-medium shadow-sm"
              : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
          )}
        >
          <NavLink to={item.url} className="flex items-center gap-3 px-3">
            <item.icon className={cn("h-4 w-4 transition-all duration-200", active ? "text-sidebar-foreground" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground")} />
            {(open || isMobile) && (
              <>
                <span className="text-sm flex-1 text-left">{item.title}</span>
                {active && <div className="h-1.5 w-1.5 rounded-full bg-sidebar-foreground ml-auto animate-pulse" />}
              </>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderSubLeafItem = (item: NavLeafItem) => {
    const active = isActive(item.url);
    return (
      <SidebarMenuSubItem key={item.title}>
        <SidebarMenuSubButton
          asChild
          isActive={active}
          className={cn(
            "transition-all duration-200",
            active ? "text-sidebar-foreground font-medium" : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
          )}
        >
          <NavLink to={item.url} className="flex items-center gap-2">
            <item.icon className={cn("h-4 w-4", active ? "text-sidebar-foreground" : "text-sidebar-foreground/60")} />
            <span className="text-sm">{item.title}</span>
            {active && <div className="h-1.5 w-1.5 rounded-full bg-sidebar-foreground ml-auto animate-pulse" />}
          </NavLink>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  };

  const subGroupState: Record<string, [boolean, (v: boolean) => void]> = {
    Customers: [customersOpen, setCustomersOpen],
    "Sales Pipeline": [pipelineOpen, setPipelineOpen],
    "Energy Programs": [programsOpen, setProgramsOpen],
    Schedule: [scheduleOpen, setScheduleOpen],
  };

  const renderSubGroup = (item: NavGroupItem, isOpen: boolean, onOpenChange: (v: boolean) => void) => {
    const hasActive = item.children.some(c => isActive(c.url));
    return (
      <SidebarMenuItem key={item.title}>
        <Collapsible open={isOpen} onOpenChange={onOpenChange}>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              className={cn(
                "h-8 rounded-md transition-all duration-200 group w-full",
                hasActive ? "text-sidebar-foreground font-medium" : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
              )}
            >
              <div className="flex items-center gap-3 px-1 w-full">
                <item.icon className={cn("h-4 w-4 flex-shrink-0", hasActive ? "text-sidebar-foreground" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground")} />
                {(open || isMobile) && (
                  <>
                    <span className="text-sm flex-1 text-left">{item.title}</span>
                    <ChevronDown className={cn("h-4 w-4 flex-shrink-0 transition-transform duration-200 text-sidebar-foreground/50", isOpen && "rotate-180 text-sidebar-foreground/80")} />
                  </>
                )}
              </div>
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent className="transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <SidebarMenuSub>
              {item.children.map(renderSubLeafItem)}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>
    );
  };

  const renderSectionItems = (items: NavSectionItem[]) =>
    items.map(item => {
      if (isGroupItem(item)) {
        const [isOpen, setIsOpen] = subGroupState[item.title] ?? [false, () => {}];
        return renderSubGroup(item, isOpen, setIsOpen);
      }
      return renderLeafItem(item);
    });

  const CollapsibleSection = ({
    title, icon: Icon, items, isOpen, onOpenChange,
  }: {
    title: string; icon: React.ElementType; items: NavSectionItem[];
    isOpen: boolean; onOpenChange: (open: boolean) => void;
  }) => (
    <SidebarGroup className="py-0.5">
      <Collapsible open={isOpen} onOpenChange={onOpenChange}>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent rounded-md transition-all duration-200 px-2 py-1 w-full group">
            <div className="flex items-center justify-between w-full">
              <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/70 group-hover:text-sidebar-foreground transition-colors duration-200">
                <Icon className="h-3.5 w-3.5 group-hover:scale-110 transition-transform duration-200" />
                {(open || isMobile) && title}
              </span>
              {(open || isMobile) && (
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80 transition-all duration-300",
                  isOpen && "rotate-180"
                )} />
              )}
            </div>
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent className="transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <SidebarGroupContent>
            <SidebarMenu className="mt-0.5 space-y-0">
              {renderSectionItems(items)}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );

  return (
    <Sidebar style={sidebarStyle}>
      <SidebarHeader className="h-16 flex items-center px-2 py-2 border-b border-sidebar-border/40">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full">
            <div className="flex items-center gap-3 rounded-lg hover:bg-sidebar-accent/70 transition-all duration-200 p-2 cursor-pointer group">
              <Avatar className="h-10 w-10 border-2 border-primary/40 shadow-sm group-hover:border-primary/60 transition-all duration-200">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              {(open || isMobile) && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold truncate text-sidebar-foreground">
                    {user?.email?.split("@")[0] || "User"}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">
                    {user?.email}
                  </p>
                </div>
              )}
              {(open || isMobile) && <ChevronDown className="h-4 w-4 text-sidebar-foreground/50 group-hover:text-primary transition-colors duration-200 flex-shrink-0" />}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-sm font-semibold">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Dashboard - always visible at top */}
        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {renderLeafItem(dashboardItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <CollapsibleSection title="CRM & Sales" icon={Briefcase} items={filteredCrmSales} isOpen={crmSalesOpen} onOpenChange={setCrmSalesOpen} />
        <CollapsibleSection title="Operations" icon={Zap} items={filteredOperations} isOpen={operationsOpen} onOpenChange={setOperationsOpen} />
        {filteredMarketing.length > 0 && (
          <CollapsibleSection title="Marketing" icon={Megaphone} items={filteredMarketing} isOpen={marketingOpen} onOpenChange={setMarketingOpen} />
        )}
        {filteredFinance.length > 0 && (
          <CollapsibleSection title="Finance" icon={Wallet} items={filteredFinance} isOpen={financeOpen} onOpenChange={setFinanceOpen} />
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/40 p-2">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {(open || isMobile) && (theme === "dark" ? "Light Mode" : "Dark Mode")}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
