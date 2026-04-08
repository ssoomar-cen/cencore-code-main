import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { BrandingProvider } from "@/components/BrandingProvider";
import { TenantProvider } from "@/hooks/useTenant";
import { AuthProvider } from "@/hooks/useAuth";
import { PortalLayout } from "@/components/portal/PortalLayout";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// CRM Pages
import AccountsPage from "./pages/crm/AccountsPage";
import ContactsPage from "./pages/crm/ContactsPage";
import LeadsPage from "./pages/crm/LeadsPage";
import OpportunitiesPage from "./pages/crm/OpportunitiesPage";
import QuotesPage from "./pages/crm/QuotesPage";
import ContractsPage from "./pages/crm/ContractsPage";
import InvoicesPage from "./pages/crm/InvoicesPage";


import CommissionSplitsPage from "./pages/crm/CommissionSplitsPage";
import ActivitiesPage from "./pages/crm/ActivitiesPage";
import BuildingsPage from "./pages/crm/BuildingsPage";
import ConnectionsPage from "./pages/crm/ConnectionsPage";

// Project Management
import ProjectsPage from "./pages/projects/ProjectsPage";
import ProjectDetailPage from "./pages/projects/ProjectDetailPage";

// Energy Audits
import EnergyAuditsPage from "./pages/audits/EnergyAuditsPage";

// Marketing
import CampaignsPage from "./pages/marketing/CampaignsPage";

// Finance
import BudgetTrackingPage from "./pages/finance/BudgetTrackingPage";

// Admin & Operations Pages
import ImportExportPage from "./pages/admin/ImportExportPage";
import AuditLogPage from "./pages/admin/AuditLogPage";
import WorkflowAutomationPage from "./pages/admin/WorkflowAutomationPage";
import SupportPage from "./pages/admin/SupportPage";
import SetupPage from "./pages/admin/SetupPage";
import SettingsPage from "./pages/admin/SettingsPage";
import CalendarPage from "./pages/CalendarPage";
import ReportingPage from "./pages/ReportingPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ViewBuilderPage from "./pages/ViewBuilderPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light">
      <BrandingProvider>
      <AuthProvider>
      <TenantProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route element={<PortalLayout />}>
              <Route path="/" element={<Index />} />

              {/* CRM - Sales */}
              <Route path="/crm/leads" element={<LeadsPage />} />
              <Route path="/crm/accounts" element={<AccountsPage />} />
              <Route path="/crm/contacts" element={<ContactsPage />} />
              <Route path="/crm/connections" element={<ConnectionsPage />} />
              <Route path="/crm/opportunities" element={<OpportunitiesPage />} />
              <Route path="/crm/quotes" element={<QuotesPage />} />
              <Route path="/crm/commission-splits" element={<CommissionSplitsPage />} />

              {/* Operations */}
              <Route path="/crm/activities" element={<ActivitiesPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              
              <Route path="/crm/contracts" element={<ContractsPage />} />
              <Route path="/crm/invoices" element={<InvoicesPage />} />
              
              <Route path="/crm/buildings" element={<BuildingsPage />} />
              <Route path="/reporting" element={<ReportingPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />

              {/* Project Management */}
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />

              {/* Energy Audits */}
              <Route path="/energy-audits" element={<EnergyAuditsPage />} />

              {/* Marketing */}
              <Route path="/campaigns" element={<CampaignsPage />} />

              {/* Finance */}
              <Route path="/budget" element={<BudgetTrackingPage />} />

              {/* View Builder */}
              <Route path="/views/:entity" element={<ViewBuilderPage />} />
              <Route path="/views" element={<ViewBuilderPage />} />

              {/* Administration */}
              <Route path="/import-export" element={<ImportExportPage />} />
              <Route path="/audit-log" element={<AuditLogPage />} />
              <Route path="/workflow-automation" element={<WorkflowAutomationPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </TenantProvider>
      </AuthProvider>
      </BrandingProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
