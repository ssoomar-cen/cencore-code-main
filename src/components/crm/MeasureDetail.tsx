import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Measure } from "@/hooks/useMeasures";

const formatDate = (date: string | null | undefined) => {
  if (!date) return "-";
  return format(new Date(date), "M/d/yyyy");
};

const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex justify-between items-center border-b border-border/50 pb-2 min-h-[36px]">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium">{value ?? "-"}</span>
  </div>
);

export const MeasureDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: measure, isLoading } = useQuery({
    queryKey: ["measure-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("measure")
        .select(
          `
          *,
          account:account_id(name)
        `
        )
        .eq("measure_id", id)
        .single();
      if (error) throw error;
      return data as Measure;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!measure) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Measure not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/crm/measures")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Measures
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/crm/measures")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Measures
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{measure.name || "Unnamed Measure"}</h1>
          {measure.account?.name && (
            <p className="text-muted-foreground text-sm">{measure.account.name}</p>
          )}
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Measure Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <InfoRow label="Name" value={measure.name} />
              <InfoRow label="Account" value={measure.account?.name} />
              <InfoRow label="C360 Account ID" value={measure.c360_account_id} />
              <InfoRow label="C360 Measure ID" value={measure.c360_measure_id} />
              <InfoRow label="Measure Program ID" value={measure.measure_program_id} />
              <InfoRow label="Conversion Bill Period" value={measure.conversion_bill_period} />
              <InfoRow
                label="Conversion Date"
                value={formatDate(measure.conversion_date)}
              />
              <InfoRow label="Salesforce ID" value={measure.salesforce_id} />
              <InfoRow
                label="Created"
                value={formatDate(measure.created_at)}
              />
              <InfoRow
                label="Updated"
                value={formatDate(measure.updated_at)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
