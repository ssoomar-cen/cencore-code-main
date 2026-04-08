import { PowerBIReportsList } from "@/components/powerbi/PowerBIReportsList";
import { usePowerBIReports } from "@/hooks/usePowerBIReports";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  const { data: reports } = usePowerBIReports("analytics");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Analytics</h2>
        <p className="text-muted-foreground">Interactive Power BI dashboards and reports</p>
      </div>

      {reports?.length ? (
        <PowerBIReportsList placement="analytics" />
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium text-foreground">No analytics reports configured</p>
          <p className="text-sm mt-1">Power BI reports assigned to this page will appear here seamlessly.</p>
          <p className="text-xs mt-3">Go to Setup → Power BI to add reports.</p>
        </div>
      )}
    </div>
  );
}
