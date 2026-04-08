import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, AlertCircle, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PowerBIEmbedProps {
  reportName: string;
  workspaceId: string;
  reportId: string;
  datasetId?: string;
  embedUrl?: string;
  height?: number;
  className?: string;
  showHeader?: boolean;
  description?: string;
}

export function PowerBIEmbed({
  reportName,
  workspaceId,
  reportId,
  datasetId,
  embedUrl: staticEmbedUrl,
  height = 500,
  className,
  showHeader = true,
  description,
}: PowerBIEmbedProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [embedToken, setEmbedToken] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(staticEmbedUrl || null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    fetchEmbedToken();
  }, [workspaceId, reportId]);

  const fetchEmbedToken = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("powerbi-embed-token", {
        body: { report_id: reportId, workspace_id: workspaceId, dataset_id: datasetId },
      });

      if (fnError) {
        setError(fnError.message || "Failed to get embed token");
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      setEmbedToken(data.token);
      if (data.embedUrl) {
        setEmbedUrl(data.embedUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  // Build the full embed URL with token
  const fullEmbedUrl = embedUrl && embedToken
    ? `${embedUrl}&filter=&$embed_token=${embedToken}`
    : null;

  // Fallback: Use iframe with Power BI embed URL directly
  const iframeSrc = fullEmbedUrl
    ? fullEmbedUrl
    : embedUrl
    ? embedUrl
    : null;

  const content = (
    <>
      {loading && (
        <div
          className="flex flex-col items-center justify-center bg-muted/30 rounded-md"
          style={{ height }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Loading report...</p>
        </div>
      )}

      {error && !loading && (
        <div
          className="flex flex-col items-center justify-center bg-muted/30 rounded-md gap-3"
          style={{ height }}
        >
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <div className="text-center max-w-md">
            <p className="text-sm font-medium text-foreground mb-1">Report Unavailable</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && iframeSrc && (
        <iframe
          ref={iframeRef}
          title={reportName}
          src={iframeSrc}
          style={{ height, width: "100%", border: "none", borderRadius: "var(--radius)" }}
          allowFullScreen
        />
      )}

      {!loading && !error && !iframeSrc && (
        <div
          className="flex flex-col items-center justify-center bg-muted/30 rounded-md gap-3"
          style={{ height }}
        >
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground mb-1">No Embed URL</p>
            <p className="text-xs text-muted-foreground">Configure this report in Setup → Power BI</p>
          </div>
        </div>
      )}
    </>
  );

  if (!showHeader) {
    return <div className={cn("w-full", className)}>{content}</div>;
  }

  return (
    <Card className={cn("w-full overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          {reportName}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-0 pb-0">{content}</CardContent>
    </Card>
  );
}
