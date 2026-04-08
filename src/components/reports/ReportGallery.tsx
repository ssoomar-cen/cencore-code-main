import { useCustomReports, useDeleteReport } from "@/hooks/useCustomReports";
import { CustomReportCard } from "./CustomReportCard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export function ReportGallery() {
  const { reports, isLoading } = useCustomReports();
  const deleteReport = useDeleteReport();

  const { data: user } = useQuery({
    queryKey: ["current_user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const handleDelete = (id: string) => {
    deleteReport.mutate(id, {
      onSuccess: () => toast.success("Report deleted"),
      onError: () => toast.error("Failed to delete report"),
    });
  };

  if (isLoading) return <div className="text-muted-foreground text-center py-12">Loading reports…</div>;
  if (!reports.length) return <div className="text-muted-foreground text-center py-12">No custom reports yet. Click "+ New Report" to create one.</div>;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {reports.map((r) => (
        <CustomReportCard key={r.id} report={r} onDelete={handleDelete} isOwner={user?.id === r.user_id} />
      ))}
    </div>
  );
}
