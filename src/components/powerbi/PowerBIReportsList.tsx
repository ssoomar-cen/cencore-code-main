import { usePowerBIReports } from "@/hooks/usePowerBIReports";
import { PowerBIEmbed } from "./PowerBIEmbed";
import { cn } from "@/lib/utils";

interface PowerBIReportsListProps {
  placement: string;
  className?: string;
  showHeaders?: boolean;
  columns?: 1 | 2;
}

export function PowerBIReportsList({
  placement,
  className,
  showHeaders = true,
  columns = 1,
}: PowerBIReportsListProps) {
  const { data: reports } = usePowerBIReports(placement);

  if (!reports?.length) return null;

  return (
    <div
      className={cn(
        columns === 2 ? "grid gap-4 md:grid-cols-2" : "space-y-4",
        className
      )}
    >
      {reports.map((report) => (
        <PowerBIEmbed
          key={report.id}
          reportName={report.name}
          workspaceId={report.workspace_id}
          reportId={report.report_id}
          datasetId={report.dataset_id || undefined}
          embedUrl={report.embed_url || undefined}
          height={report.height}
          showHeader={showHeaders}
          description={report.description || undefined}
        />
      ))}
    </div>
  );
}
