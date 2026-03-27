import { useNavigate, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard, Briefcase, LogOut,
  HeadphonesIcon,
  Upload, ScrollText, Workflow, Wrench, ChevronDown, UserCog, Settings, Calendar,
  FileText, CalendarDays, Building2, UserSquare2, TrendingUp, FolderKanban, Link, Zap, BarChart2,
  Receipt, UserPlus, Gauge, SplitSquareHorizontal, UserCheck, DollarSign
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserImpersonationDialog } from "./UserImpersonationDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useTenantBranding } from "@/hooks/useTenantBranding";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useHiddenFeatures } from "@/hooks/useHiddenFeatures";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type NavLeafItem = {
  title: string;
  url: string;
  icon: React.ElementType;
  featureKey: string;
};

type NavGroupItem = {
  title: string;
  icon: React.ElementType;
  featureKey: string;
  children: NavLeafItem[];
};

type NavSectionItem = NavLeafItem | NavGroupItem;

function isGroupItem(item: NavSectionItem): item is NavGroupItem {
  return "children" in item;
}

// Sales - Revenue-generating activities
const salesSection: NavSectionItem[] = [
  { title: "Overview", url: "/", icon: LayoutDashboard, featureKey: "crm" },
  {
    title: "CRM",
    icon: UserCheck,
    featureKey: "crm",
    children: [
      { title: "Leads", url: "/crm/leads", icon: UserPlus, featureKey: "crm" },
      { title: "Organizations", url: "/crm/accounts", icon: Building2, featureKey: "crm" },
      { title: "Contacts", url: "/crm/contacts", icon: UserSquare2, featureKey: "crm" },
      { title: "Connections", url: "/crm/connections", icon: Link, featureKey: "crm" },
    ],
  },
  {
    title: "Pipeline",
    icon: DollarSign,
    featureKey: "crm",
    children: [
      { title: "Opportunities", url: "/crm/opportunities", icon: TrendingUp, featureKey: "crm" },
      { title: "Quotes", url: "/crm/quotes", icon: FileText, featureKey: "crm" },
      { title: "Commission Splits", url: "/crm/commission-splits", icon: SplitSquareHorizontal, featureKey: "crm" },
    ],
  },
];

// Operations - Day-to-day execution
const operationsSection: NavSectionItem[] = [
  {
    title: "Schedule",
    icon: CalendarDays,
    featureKey: "crm",
    children: [
      { title: "Activities", url: "/crm/activities", icon: CalendarDays, featureKey: "crm" },
      { title: "Calendar", url: "/calendar", icon: Calendar, featureKey: "crm" },
    ],
  },
  {
    title: "Programs & Contracts",
    icon: Zap,
    featureKey: "crm",
    children: [
      { title: "Energy Programs", url: "/crm/energy-programs", icon: Zap, featureKey: "projects" },
      { title: "Contracts", url: "/crm/contracts", icon: ScrollText, featureKey: "crm" },
      { title: "Invoices", url: "/crm/invoices", icon: Receipt, featureKey: "crm" },
      { title: "Measures", url: "/crm/measures", icon: Gauge, featureKey: "crm" },
      { title: "Buildings", url: "/crm/buildings", icon: FolderKanban, featureKey: "crm" },
    ],
  },
  { title: "Reporting", url: "/reporting", icon: BarChart2, featureKey: "crm" },
];

// Administration - System management
const administrationItems: NavLeafItem[] = [
  { title: "Import/Export", url: "/crm/import-export", icon: Upload, featureKey: "import_export" },
  { title: "Audit Log", url: "/audit-log", icon: ScrollText, featureKey: "settings" },
  { title: "Workflow Automation", url: "/workflow-automation", icon: Workflow, featureKey: "workflow_automation" },
  { title: "Support", url: "/support", icon: HeadphonesIcon, featureKey: "email_calendar" },
  { title: "Setup & Integration", url: "/setup", icon: Wrench, featureKey: "settings" },
];

// Collect all leaf URLs for auto-expand logic
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
  const { isAdmin } = useUserRole();
  const { isImpersonating } = useImpersonation();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showImpersonationDialog, setShowImpersonationDialog] = useState(false);
  const { data: branding } = useTenantBranding();
  const { isFeatureAccessible } = useFeatureAccess();
  const { isFeatureHidden } = useHiddenFeatures();

  // Top-level section collapse state
  const [salesOpen, setSalesOpen] = useState(true);
  const [operationsOpen, setOperationsOpen] = useState(true);
  const [administrationOpen, setAdministrationOpen] = useState(false);

  // Sub-group collapse state for Sales
  const [crmOpen, setCrmOpen] = useState(false);
  const [pipelineOpen, setPipelineOpen] = useState(false);

  // Sub-group collapse state for Operations
  const [programsOpen, setProgramsOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: profileData } = await supabase
          .from("profile")
          .select("first_name, last_name")
          .eq("id", user.id)
          .single();
        setProfile(profileData);
      }
    };
    fetchUser();
  }, []);

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/" || currentPath === "/crm" || currentPath === "/crm/";
    return currentPath === path || currentPath.startsWith(`${path}/`);
  };

  // Auto-expand sections and sub-groups based on active route
  useEffect(() => {
    const salesUrls = getLeafUrls(salesSection);
    const opsUrls = getLeafUrls(operationsSection);
    const adminUrls = administrationItems.map(i => i.url);

    if (salesUrls.some(isActive)) setSalesOpen(true);
    if (opsUrls.some(isActive)) setOperationsOpen(true);
    if (adminUrls.some(isActive)) setAdministrationOpen(true);

    // CRM sub-group
    const crmUrls = ["/crm/leads", "/crm/accounts", "/crm/contacts", "/crm/connections"];
    if (crmUrls.some(isActive)) { setSalesOpen(true); setCrmOpen(true); }

    // Pipeline sub-group
    const pipelineUrls = ["/crm/opportunities", "/crm/quotes", "/crm/commission-splits"];
    if (pipelineUrls.some(isActive)) { setSalesOpen(true); setPipelineOpen(true); }

    // Programs & Contracts sub-group
    const programsUrls = ["/crm/energy-programs", "/crm/contracts", "/crm/invoices", "/crm/measures", "/crm/buildings"];
    if (programsUrls.some(isActive)) { setOperationsOpen(true); setProgramsOpen(true); }

    // Schedule sub-group
    const scheduleUrls = ["/crm/activities", "/calendar"];
    if (scheduleUrls.some(isActive)) { setOperationsOpen(true); setScheduleOpen(true); }
  }, [currentPath]);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile && openMobile) {
      setOpenMobile(false);
    }
  }, [currentPath, isMobile, openMobile, setOpenMobile]);

  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  };

  const getUserDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return user?.email?.split("@")[0] || "User";
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
    if (!isFeatureAccessible(item.featureKey) || isFeatureHidden(item.featureKey)) return null;
    const active = isActive(item.url);
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          isActive={active}
          className={cn(
            "h-10 rounded-md transition-all duration-200 relative group",
            active
              ? "bg-primary/20 text-primary font-medium shadow-sm"
              : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground"
          )}
        >
          <NavLink to={item.url} className="flex items-center gap-3 px-3">
            <item.icon
              className={cn(
                "h-5 w-5 transition-all duration-200",
                active ? "text-primary" : "group-hover:text-primary/80"
              )}
            />
            {(open || isMobile) && (
              <>
                <span className="text-sm flex-1 text-left">{item.title}</span>
                {active && (
                  <div className="h-1.5 w-1.5 rounded-full bg-primary ml-auto animate-pulse" />
                )}
              </>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderSubLeafItem = (item: NavLeafItem) => {
    if (!isFeatureAccessible(item.featureKey) || isFeatureHidden(item.featureKey)) return null;
    const active = isActive(item.url);
    return (
      <SidebarMenuSubItem key={item.title}>
        <SidebarMenuSubButton
          asChild
          isActive={active}
          className={cn(
            "transition-all duration-200",
            active ? "text-primary font-medium" : "text-sidebar-foreground/80 hover:text-sidebar-accent-foreground"
          )}
        >
          <NavLink to={item.url} className="flex items-center gap-2">
            <item.icon className={cn("h-4 w-4", active ? "text-primary" : "")} />
            <span className="text-sm">{item.title}</span>
            {active && <div className="h-1.5 w-1.5 rounded-full bg-primary ml-auto animate-pulse" />}
          </NavLink>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  };

  const renderSubGroup = (
    item: NavGroupItem,
    isOpen: boolean,
    onOpenChange: (v: boolean) => void
  ) => {
    const visibleChildren = item.children.filter(
      c => isFeatureAccessible(c.featureKey) && !isFeatureHidden(c.featureKey)
    );
    if (visibleChildren.length === 0) return null;

    const hasActive = visibleChildren.some(c => isActive(c.url));

    return (
      <SidebarMenuItem key={item.title}>
        <Collapsible open={isOpen} onOpenChange={onOpenChange}>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              className={cn(
                "h-10 rounded-md transition-all duration-200 group w-full",
                hasActive
                  ? "text-primary font-medium"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground"
              )}
            >
              <div className="flex items-center gap-3 px-1 w-full">
                <item.icon className={cn("h-5 w-5 flex-shrink-0", hasActive ? "text-primary" : "group-hover:text-primary/80")} />
                {(open || isMobile) && (
                  <>
                    <span className="text-sm flex-1 text-left">{item.title}</span>
                    <ChevronDown className={cn(
                      "h-4 w-4 flex-shrink-0 transition-transform duration-200 text-sidebar-foreground/50",
                      isOpen && "rotate-180"
                    )} />
                  </>
                )}
              </div>
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent className="transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <SidebarMenuSub>
              {visibleChildren.map(renderSubLeafItem)}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>
    );
  };

  // Map sub-group titles to their open/onOpenChange handlers
  const subGroupState: Record<string, [boolean, (v: boolean) => void]> = {
    CRM: [crmOpen, setCrmOpen],
    Pipeline: [pipelineOpen, setPipelineOpen],
    "Programs & Contracts": [programsOpen, setProgramsOpen],
    Schedule: [scheduleOpen, setScheduleOpen],
  };

  const renderSectionItems = (items: NavSectionItem[]) =>
    items.map(item => {
      if (isGroupItem(item)) {
        if (!isFeatureAccessible(item.featureKey) || isFeatureHidden(item.featureKey)) return null;
        const [isOpen, setIsOpen] = subGroupState[item.title] ?? [false, () => {}];
        return renderSubGroup(item, isOpen, setIsOpen);
      }
      return renderLeafItem(item);
    });

  const CollapsibleSection = ({
    title,
    icon: Icon,
    items,
    isOpen,
    onOpenChange,
  }: {
    title: string;
    icon: React.ElementType;
    items: NavSectionItem[];
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
  }) => {
    const hasVisible = items.some(item => {
      if (isGroupItem(item)) {
        return item.children.some(c => isFeatureAccessible(c.featureKey) && !isFeatureHidden(c.featureKey));
      }
      return isFeatureAccessible(item.featureKey) && !isFeatureHidden(item.featureKey);
    });
    if (!hasVisible) return null;

    return (
      <SidebarGroup className="py-2 space-y-1">
        <Collapsible open={isOpen} onOpenChange={onOpenChange}>
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md transition-all duration-200 px-2 py-1.5 w-full group">
              <div className="flex items-center justify-between w-full">
                <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60 group-hover:text-primary/70 transition-colors duration-200">
                  <Icon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                  {(open || isMobile) && title}
                </span>
                {(open || isMobile) && (
                  <ChevronDown className={cn(
                    "h-4 w-4 text-sidebar-foreground/50 group-hover:text-primary/70 transition-all duration-300",
                    isOpen && "rotate-180 text-primary/80"
                  )} />
                )}
              </div>
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent className="transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <SidebarGroupContent>
              <SidebarMenu className="mt-2 space-y-1">
                {renderSectionItems(items)}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar>
      <SidebarHeader className="h-16 flex items-center px-2 py-2 border-b border-sidebar-border/40">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full">
            <div className="flex items-center gap-3 rounded-lg hover:bg-sidebar-accent/70 transition-all duration-200 p-2 cursor-pointer group">
              <Avatar className="h-10 w-10 border-2 border-primary/40 shadow-sm group-hover:border-primary/60 group-hover:shadow-md transition-all duration-200">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              {(open || isMobile) && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold truncate text-sidebar-foreground">
                    {getUserDisplayName()}
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
            {isAdmin && !isImpersonating && (
              <>
                <DropdownMenuItem onClick={() => setShowImpersonationDialog(true)} className="cursor-pointer hover:bg-accent/50 transition-colors duration-150">
                  <UserCog className="mr-2 h-4 w-4" />
                  Impersonate User
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer hover:bg-accent/50 transition-colors duration-150">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-150">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <UserImpersonationDialog
          open={showImpersonationDialog}
          onOpenChange={setShowImpersonationDialog}
        />
      </SidebarHeader>

      <SidebarContent>
        <CollapsibleSection
          title="Sales"
          icon={TrendingUp}
          items={salesSection}
          isOpen={salesOpen}
          onOpenChange={setSalesOpen}
        />

        <CollapsibleSection
          title="Operations"
          icon={Briefcase}
          items={operationsSection}
          isOpen={operationsOpen}
          onOpenChange={setOperationsOpen}
        />

        {isAdmin && (
          <CollapsibleSection
            title="Administration"
            icon={Settings}
            items={administrationItems}
            isOpen={administrationOpen}
            onOpenChange={setAdministrationOpen}
          />
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <p className="text-xs text-sidebar-foreground/50 text-center">
          © {new Date().getFullYear()} Cenergistic
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
