import { useState, useEffect, useRef, Component } from "react";
import { models } from "powerbi-client";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart2,
  Search,
  Star,
  RefreshCw,
  Settings,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Power BI embed — loaded via CDN to avoid SSR/bundler issues
declare global {
  interface Window {
    powerbi: any;
  }
}

interface PinnedReport {
  id: string;
  pbi_report_id: string;
  pbi_workspace_id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  is_featured: boolean;
  display_order: number;
}

interface PbiReport {
  id: string;
  name: string;
  embedUrl: string;
  webUrl?: string;
}

interface EmbedData {
  embedToken: string;
  embedUrl: string;
  reportId: string;
  reportName: string;
}

class EmbedErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err: Error) {
    return { error: err.message };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="font-medium">Failed to load report</p>
          <p className="text-sm text-muted-foreground">{this.state.error}</p>
          <Button variant="outline" onClick={() => this.setState({ error: null })}>Try again</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Dynamically load the Power BI JavaScript SDK */
function usePowerBiScript() {
  const [ready, setReady] = useState(!!window.powerbi);

  useEffect(() => {
    if (window.powerbi) { setReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/powerbi-client@2/dist/powerbi.min.js";
    script.onload = () => setReady(true);
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  return ready;
}

function ReportEmbed({
  embedData,
  onClose,
  fullscreen,
  onToggleFullscreen,
}: {
  embedData: EmbedData;
  onClose: () => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<any>(null);
  const sdkReady = usePowerBiScript();

  useEffect(() => {
    if (!sdkReady || !containerRef.current || !embedData) return;

    const config = {
      type: "report",
      tokenType: models.TokenType.Embed,
      accessToken: embedData.embedToken,
      embedUrl: embedData.embedUrl,
      id: embedData.reportId,
      permissions: models.Permissions.Read,
      settings: {
        panes: {
          filters: { visible: true, expanded: false },
          pageNavigation: { visible: true },
        },
        background: models.BackgroundType.Transparent,
      },
    };

    // Reset any existing embed
    window.powerbi.reset(containerRef.current);
    reportRef.current = window.powerbi.embed(containerRef.current, config);

    reportRef.current.on("error", (event: any) => {
      console.error("Power BI embed error:", event.detail);
      toast.error("Failed to load report");
    });

    return () => {
      if (containerRef.current) window.powerbi.reset(containerRef.current);
    };
  }, [sdkReady, embedData]);

  return (
    <div className="flex flex-col h-full">
      {/* Embed toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-background">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <span className="font-medium text-sm flex-1 truncate">{embedData.reportName}</span>
        <Button variant="ghost" size="icon" onClick={onToggleFullscreen} title="Toggle fullscreen">
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Power BI iframe container */}
      {!sdkReady ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 w-full" />
      )}
    </div>
  );
}

export default function Reporting() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeWorkspace, setActiveWorkspace] = useState<string>("all");
  const [browseWorkspaceId, setBrowseWorkspaceId] = useState<string>("");
  const [embedData, setEmbedData] = useState<EmbedData | null>(null);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);

  // Check if Power BI is configured
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["powerbi-config"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("powerbi-config", {
        body: { action: "get" },
      });
      if (error) throw error;
      return data as { isConfigured: boolean; clientId?: string | null };
    },
  });

  // Load pinned reports from our DB
  const { data: pinnedReports, isLoading: pinnedLoading, refetch: refetchPinned } = useQuery({
    queryKey: ["powerbi-pinned-reports"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("powerbi-reports", {
        body: { action: "getPinnedReports" },
      });
      if (error) throw error;
      return (data?.reports ?? []) as PinnedReport[];
    },
    enabled: !!config?.isConfigured,
  });

  // Load reports from a workspace (for browse sheet)
  const { data: browseReports, isLoading: browseLoading } = useQuery({
    queryKey: ["powerbi-browse-reports", browseWorkspaceId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("powerbi-reports", {
        body: { action: "listReports", workspaceId: browseWorkspaceId },
      });
      if (error) throw error;
      return (data?.reports ?? []) as PbiReport[];
    },
    enabled: !!browseWorkspaceId && showBrowse,
  });

  // Load workspaces from Power BI
  const { data: workspaces, isLoading: wsLoading } = useQuery({
    queryKey: ["powerbi-workspaces"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("powerbi-reports", {
        body: { action: "listWorkspaces" },
      });
      if (error) throw error;
      return (data?.workspaces ?? []) as { id: string; name: string }[];
    },
    enabled: !!config?.isConfigured,
  });

  const openReport = async (workspaceId: string, reportId: string, reportName: string) => {
    setEmbedLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("powerbi-embed", {
        body: { workspaceId, reportId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      console.log("[PBI] embed data received:", data);
      setEmbedData({ ...data, reportName });
    } catch (err: any) {
      toast.error(err.message || "Failed to load report");
    } finally {
      setEmbedLoading(false);
    }
  };

  const pinReport = async (report: PbiReport, workspaceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("powerbi-reports", {
        body: {
          action: "pinReport",
          pbiReportId: report.id,
          pbiWorkspaceId: workspaceId,
          name: report.name,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`"${report.name}" pinned to your report library`);
      refetchPinned();
    } catch (err: any) {
      toast.error(err.message || "Failed to pin report");
    }
  };

  const unpinReport = async (pbiReportId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("powerbi-reports", {
        body: { action: "unpinReport", pbiReportId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      refetchPinned();
    } catch (err: any) {
      toast.error(err.message || "Failed to unpin report");
    }
  };

  // ── Fullscreen embed ────────────────────────────────────────────────────────
  if (embedData && fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <EmbedErrorBoundary>
          <ReportEmbed
            embedData={embedData}
            onClose={() => { setEmbedData(null); setFullscreen(false); }}
            fullscreen
            onToggleFullscreen={() => setFullscreen(false)}
          />
        </EmbedErrorBoundary>
      </div>
    );
  }

  // ── Embedded report view ────────────────────────────────────────────────────
  if (embedData) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <EmbedErrorBoundary>
          <ReportEmbed
            embedData={embedData}
            onClose={() => setEmbedData(null)}
            fullscreen={false}
            onToggleFullscreen={() => setFullscreen(true)}
          />
        </EmbedErrorBoundary>
      </div>
    );
  }

  // ── Not configured ──────────────────────────────────────────────────────────
  if (!configLoading && !config?.isConfigured) {
    return (
      <div className="p-8 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <BarChart2 className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Reporting</h1>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Power BI is not configured yet. Connect your service principal in{" "}
            <button
              type="button"
              className="underline"
              onClick={() => navigate("/setup")}
            >
              Setup &amp; Integration
            </button>{" "}
            to start embedding reports.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ── Filter pinned reports ───────────────────────────────────────────────────
  const categories = Array.from(
    new Set((pinnedReports ?? []).map((r) => r.category).filter(Boolean) as string[])
  );

  const filtered = (pinnedReports ?? []).filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || r.category === categoryFilter;
    const matchWs = activeWorkspace === "all" || r.pbi_workspace_id === activeWorkspace;
    return matchSearch && matchCat && matchWs;
  });

  const featured = filtered.filter((r) => r.is_featured);
  const rest = filtered.filter((r) => !r.is_featured);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart2 className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Reporting</h1>
          <p className="text-sm text-muted-foreground">Power BI reports embedded directly in your workspace</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowBrowse(true)}>
            Browse All Reports
          </Button>
          <Button variant="ghost" size="icon" onClick={() => refetchPinned()} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate("/setup")} title="Power BI Settings">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            className="pl-9 w-[220px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {(workspaces ?? []).length > 1 && (
          <Select value={activeWorkspace} onValueChange={setActiveWorkspace}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All workspaces" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workspaces</SelectItem>
              {(workspaces ?? []).map((ws) => (
                <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Loading state */}
      {(pinnedLoading || configLoading) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Featured reports */}
      {featured.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5" /> Featured
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onOpen={() => openReport(report.pbi_workspace_id, report.pbi_report_id, report.name)}
                onUnpin={() => unpinReport(report.pbi_report_id)}
                loading={embedLoading}
              />
            ))}
          </div>
        </div>
      )}

      {/* All pinned reports */}
      {rest.length > 0 && (
        <div className="space-y-3">
          {featured.length > 0 && (
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">All Reports</h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rest.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onOpen={() => openReport(report.pbi_workspace_id, report.pbi_report_id, report.name)}
                onUnpin={() => unpinReport(report.pbi_report_id)}
                loading={embedLoading}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!pinnedLoading && !configLoading && filtered.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <BarChart2 className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground">
            {(pinnedReports ?? []).length === 0
              ? "No reports pinned yet. Click \"Browse All Reports\" to find and pin reports from your Power BI workspaces."
              : "No reports match your search."}
          </p>
          {(pinnedReports ?? []).length === 0 && (
            <Button onClick={() => setShowBrowse(true)}>Browse All Reports</Button>
          )}
        </div>
      )}

      {/* Browse All Reports sheet */}
      <Sheet open={showBrowse} onOpenChange={setShowBrowse}>
        <SheetContent side="right" className="w-[480px] sm:w-[540px] flex flex-col">
          <SheetHeader>
            <SheetTitle>Browse Power BI Reports</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-3 flex-1 overflow-y-auto">
            {/* Workspace selector */}
            <Select value={browseWorkspaceId} onValueChange={setBrowseWorkspaceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a workspace..." />
              </SelectTrigger>
              <SelectContent>
                {wsLoading ? (
                  <SelectItem value="loading" disabled>Loading…</SelectItem>
                ) : (
                  (workspaces ?? []).map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {browseLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!browseLoading && browseWorkspaceId && (browseReports ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No reports found in this workspace.</p>
            )}

            {(browseReports ?? []).map((report) => {
              const isPinned = (pinnedReports ?? []).some((p) => p.pbi_report_id === report.id);
              return (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <BarChart2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{report.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        openReport(browseWorkspaceId, report.id, report.name);
                        setShowBrowse(false);
                      }}
                    >
                      Open
                    </Button>
                    {isPinned ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unpinReport(report.id)}
                      >
                        Unpin
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => pinReport(report, browseWorkspaceId)}
                      >
                        <Star className="h-3.5 w-3.5 mr-1" />
                        Pin
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ReportCard({
  report,
  onOpen,
  onUnpin,
  loading,
}: {
  report: PinnedReport;
  onOpen: () => void;
  onUnpin: () => void;
  loading: boolean;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <BarChart2 className="h-5 w-5 text-primary flex-shrink-0" />
            <CardTitle className="text-base truncate">{report.name}</CardTitle>
          </div>
          {report.is_featured && (
            <Badge variant="secondary" className="flex-shrink-0 gap-1">
              <Star className="h-3 w-3" />
              Featured
            </Badge>
          )}
        </div>
        {report.description && (
          <CardDescription className="line-clamp-2">{report.description}</CardDescription>
        )}
        {report.category && (
          <Badge variant="outline" className="w-fit text-xs">{report.category}</Badge>
        )}
      </CardHeader>
      <CardContent className="pt-0 flex gap-2">
        <Button className="flex-1" onClick={onOpen} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Open Report
        </Button>
        <Button variant="ghost" size="icon" onClick={onUnpin} title="Unpin report">
          <Star className="h-4 w-4 fill-current text-amber-500" />
        </Button>
      </CardContent>
    </Card>
  );
}
