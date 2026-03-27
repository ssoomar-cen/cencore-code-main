// M&S Dynamics Business Center
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { PortalLayout } from "./components/portal/PortalLayout";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import CRM from "./pages/CRM";
import Calendar from "./pages/Calendar";

import Support from "./pages/Support";
import NotFound from "./pages/NotFound";
import SetupIntegration from "./pages/SetupIntegration";
import WorkflowAutomation from "./pages/WorkflowAutomation";
import AuditLog from "./pages/AuditLog";
import SqlConsole from "./pages/admin/SqlConsole";

import ImportExport from "./pages/ImportExport";
import Documents from "./pages/Documents";
import GlobalSearch from "./pages/GlobalSearch";
import Demo from "./pages/Demo";
import ViewBuilderPage from "./pages/ViewBuilderPage";

import Preferences from "./pages/Preferences";
import Profile from "./pages/preferences/Profile";
import EmailTemplates from "./pages/preferences/EmailTemplates";
import { MyConnections } from "./components/setup/MyConnections";
import Reporting from "./pages/Reporting";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 15 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light">
      <ImpersonationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/demo/*" element={<Demo />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/crm/*" element={<PortalLayout><CRM /></PortalLayout>} />
              <Route path="/calendar" element={<PortalLayout><Calendar /></PortalLayout>} />
              <Route path="/projects" element={<Navigate to="/crm/projects" replace />} />
              <Route path="/projects/:id" element={<Navigate to="/crm/projects" replace />} />
              <Route path="/tasks/:id" element={<Navigate to="/crm/projects" replace />} />
              <Route path="/support" element={<PortalLayout><Support /></PortalLayout>} />
              <Route path="/setup" element={<PortalLayout><SetupIntegration /></PortalLayout>} />
              <Route path="/workflow-automation" element={<PortalLayout><WorkflowAutomation /></PortalLayout>} />
              <Route path="/audit-log" element={<PortalLayout><AuditLog /></PortalLayout>} />
              <Route path="/admin/sql-console" element={<PortalLayout><SqlConsole /></PortalLayout>} />
              <Route path="/crm/import-export" element={<PortalLayout><ImportExport /></PortalLayout>} />
              <Route path="/crm/documents" element={<PortalLayout><Documents /></PortalLayout>} />
              <Route path="/crm/search" element={<PortalLayout><GlobalSearch /></PortalLayout>} />
              <Route path="/views/:entity" element={<PortalLayout><ViewBuilderPage /></PortalLayout>} />
              <Route path="/crm/views/:entity" element={<PortalLayout><ViewBuilderPage /></PortalLayout>} />
              <Route path="/settings" element={<PortalLayout><Preferences /></PortalLayout>}>
                <Route index element={<Profile />} />
              </Route>
              <Route path="/preferences/email-templates" element={<PortalLayout><Preferences /></PortalLayout>}>
                <Route index element={<EmailTemplates />} />
              </Route>
              <Route path="/preferences/connections" element={<PortalLayout><Preferences /></PortalLayout>}>
                <Route index element={<MyConnections />} />
              </Route>
              <Route path="/reporting" element={<PortalLayout><Reporting /></PortalLayout>} />
              <Route path="/" element={<PortalLayout><CRM /></PortalLayout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ImpersonationProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
