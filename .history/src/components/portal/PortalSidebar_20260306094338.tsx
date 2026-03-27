import { useNavigate, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard, Users, Briefcase, DollarSign, LogOut,
  FolderOpen, HeadphonesIcon,
  Upload, ScrollText, Workflow, Wrench, ChevronDown, UserCog, Settings, Calendar,
  FileText, CalendarDays, Building2, UserSquare2, TrendingUp, FolderKanban, Link, Zap
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

// Sales - Revenue-generating activities
const salesItems = [
  { title: "Overview", url: "/", icon: LayoutDashboard, featureKey: "crm" },
  { title: "Organizations", url: "/crm/accounts", icon: Building2, featureKey: "crm" },
  { title: "Contacts", url: "/crm/contacts", icon: UserSquare2, featureKey: "crm" },
  { title: "Connections", url: "/crm/connections", icon: Link, featureKey: "crm" },
  { title: "Opportunities", url: "/crm/opportunities", icon: TrendingUp, featureKey: "crm" },
  { title: "Quotes", url: "/crm/quotes", icon: FileText, featureKey: "crm" },
  { title: "List Builder", url: "/views/opportunities", icon: Users, featureKey: "crm" },
];

// Operations - Day-to-day execution
const operationsItems = [
  { title: "Energy Programs", url: "/crm/projects", icon: Zap, featureKey: "projects" },
  { title: "Contracts", url: "/crm/contracts", icon: ScrollText, featureKey: "crm" },
  { title: "Buildings", url: "/crm/buildings", icon: FolderKanban, featureKey: "crm" },
  { title: "Activities", url: "/crm/activities", icon: CalendarDays, featureKey: "crm" },
  { title: "Calendar", url: "/calendar", icon: Calendar, featureKey: "crm" },
];

// Administration - System management
const administrationItems = [
  { title: "Import/Export", url: "/crm/import-export", icon: Upload, featureKey: "import_export" },
  { title: "Audit Log", url: "/audit-log", icon: ScrollText, featureKey: "settings" },
  { title: "Workflow Automation", url: "/workflow-automation", icon: Workflow, featureKey: "workflow_automation" },
  { title: "Support", url: "/support", icon: HeadphonesIcon, featureKey: "email_calendar" },
  { title: "Setup & Integration", url: "/setup", icon: Wrench, featureKey: "settings" },
];

export function PortalSidebar() {
  const { open, setOpen } = useSidebar();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { isAdmin, isLoading: isLoadingRole } = useUserRole();
  const { isImpersonating } = useImpersonation();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showImpersonationDialog, setShowImpersonationDialog] = useState(false);
  const { data: branding } = useTenantBranding();
  const { isFeatureAccessible } = useFeatureAccess();
  const { isFeatureHidden } = useHiddenFeatures();

  // Collapsible section states
  const [salesOpen, setSalesOpen] = useState(true);
  const [operationsOpen, setOperationsOpen] = useState(true);
  
  const [administrationOpen, setAdministrationOpen] = useState(false);

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

  // Auto-expand sections based on active route
  useEffect(() => {
    const isInSales = salesItems.some(item => isActive(item.url));
    const isInOps = operationsItems.some(item => isActive(item.url));
    const isInAdmin = administrationItems.some(item => isActive(item.url));
    
    if (isInSales) setSalesOpen(true);
    if (isInOps) setOperationsOpen(true);
    if (isInAdmin) setAdministrationOpen(true);
  }, [currentPath]);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile && open) {
      setOpen(false);
    }
  }, [currentPath, isMobile, open, setOpen]);

  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return user?.email?.split("@")[0] || "User";
  };

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return currentPath === path;
    return currentPath === path || currentPath.startsWith(`${path}/`);
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

  const renderNavItem = (item: typeof salesItems[0]) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton
        asChild
        isActive={isActive(item.url)}
        className={cn(
          "h-10 rounded-md transition-all duration-200 relative group",
          isActive(item.url)
            ? "bg-primary/20 text-primary font-medium shadow-sm"
            : "hover:bg-sidebar-accent/60 text-sidebar-foreground"
        )}
      >
        <NavLink to={item.url} className="flex items-center gap-3 px-3">
          <item.icon
            className={cn(
              "h-5 w-5 transition-all duration-200",
              isActive(item.url) ? "text-primary" : "group-hover:text-primary/80"
            )}
          />
          {(open || isMobile) && (
            <>
              <span className="text-sm flex-1 text-left">{item.title}</span>
              {isActive(item.url) && (
                <div className="h-1.5 w-1.5 rounded-full bg-primary ml-auto animate-pulse" />
              )}
            </>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const CollapsibleSection = ({ 
    title, 
    icon: Icon, 
    items, 
    isOpen, 
    onOpenChange 
  }: { 
    title: string; 
    icon: React.ElementType;
    items: typeof salesItems;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
  }) => {
    const filteredItems = items.filter(item => isFeatureAccessible(item.featureKey) && !isFeatureHidden(item.featureKey));
    if (filteredItems.length === 0) return null;

    return (
      <SidebarGroup className="py-2 space-y-1">
        <Collapsible open={isOpen} onOpenChange={onOpenChange}>
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/70 hover:text-primary/80 rounded-md transition-all duration-200 px-2 py-1.5 w-full group">
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
                {filteredItems.map(renderNavItem)}
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
        {/* Sales */}
        <CollapsibleSection
          title="Sales"
          icon={TrendingUp}
          items={salesItems}
          isOpen={salesOpen}
          onOpenChange={setSalesOpen}
        />

        {/* Operations */}
        <CollapsibleSection
          title="Operations"
          icon={Briefcase}
          items={operationsItems}
          isOpen={operationsOpen}
          onOpenChange={setOperationsOpen}
        />


        {/* Administration - Collapsible, admin only */}
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
