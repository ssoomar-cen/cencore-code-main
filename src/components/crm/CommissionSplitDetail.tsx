import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { CommissionSplit } from "@/hooks/useCommissionSplits";
import { useCommissionSplitSchedules } from "@/hooks/useCommissionSplitSchedules";

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

const periodOptions = Array.from({ length: 10 }, (_, i) => `Year ${i + 1}`);
const paymentStatusOptions = ["Pending", "Paid", "Canceled"];

const paymentStatusVariant = (status: string | null) => {
  switch (status) {
    case "Paid":
      return "default";
    case "Pending":
      return "secondary";
    case "Canceled":
      return "destructive";
    default:
      return "outline";
  }
};

export const CommissionSplitDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [addScheduleOpen, setAddScheduleOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    period: "",
    commission_amount: "",
    commission_percent: "",
    scheduled_date: "",
    payment_status: "Pending",
  });

  const { data: split, isLoading } = useQuery({
    queryKey: ["commission-split-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("commission_split")
        .select(
          `*, contract:contract_id(name), contact:contact_id(first_name,last_name)`
        )
        .eq("commission_split_id", id)
        .single();
      if (error) throw error;
      return data as CommissionSplit;
    },
    enabled: !!id,
  });

  const {
    schedules,
    isLoading: schedulesLoading,
    createSchedule,
    isCreating,
  } = useCommissionSplitSchedules({
    commission_split_id: id || "",
    enabled: !!id,
  });

  const handleAddSchedule = () => {
    if (!id) return;
    createSchedule({
      commission_split_id: id,
      period: scheduleForm.period || null,
      commission_amount: scheduleForm.commission_amount
        ? parseFloat(scheduleForm.commission_amount)
        : null,
      commission_percent: scheduleForm.commission_percent
        ? parseFloat(scheduleForm.commission_percent)
        : null,
      scheduled_date: scheduleForm.scheduled_date || null,
      payment_status: scheduleForm.payment_status || null,
    });
    setAddScheduleOpen(false);
    setScheduleForm({
      period: "",
      commission_amount: "",
      commission_percent: "",
      scheduled_date: "",
      payment_status: "Pending",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!split) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Commission split not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/crm/commission-splits")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Commission Splits
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
          onClick={() => navigate("/crm/commission-splits")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Commission Splits
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {split.name || "Unnamed Commission Split"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {split.commission_recipient_name && (
              <span className="text-muted-foreground text-sm">
                {split.commission_recipient_name}
              </span>
            )}
            {split.status && (
              <Badge variant="outline">{split.status}</Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Split Info</TabsTrigger>
          <TabsTrigger value="schedule">Payment Schedule</TabsTrigger>
        </TabsList>

        {/* Split Info Tab */}
        <TabsContent value="info" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Commission Split Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <InfoRow label="Name" value={split.name} />
              <InfoRow
                label="Recipient"
                value={split.commission_recipient_name}
              />
              <InfoRow label="Commission Type" value={split.commission_type} />
              <InfoRow label="Status" value={split.status} />
              <InfoRow
                label="Commissions Approved"
                value={
                  split.commissions_approved !== null
                    ? split.commissions_approved
                      ? "Yes"
                      : "No"
                    : null
                }
              />
              <InfoRow label="Based On" value={split.based_on_tcv_or_ncv} />
              <InfoRow
                label="Commission %"
                value={
                  split.commission_percent != null
                    ? `${split.commission_percent}%`
                    : null
                }
              />
              <InfoRow
                label="Commission % (Secondary)"
                value={
                  split.commission_percent_2 != null
                    ? `${split.commission_percent_2}%`
                    : null
                }
              />
              <InfoRow
                label="Total Commission"
                value={
                  split.total_commission_for_contract_term != null
                    ? `$${split.total_commission_for_contract_term.toLocaleString()}`
                    : null
                }
              />
              <InfoRow
                label="First Payment Amount"
                value={
                  split.first_payment_amount != null
                    ? `$${split.first_payment_amount.toLocaleString()}`
                    : null
                }
              />
              <InfoRow label="Number of Payments" value={split.number_of_payments} />
              <InfoRow
                label="Customer Sign Date"
                value={formatDate(split.customer_sign_date)}
              />
              <InfoRow
                label="First Payment Due Date"
                value={formatDate(split.first_payment_due_date)}
              />
              <InfoRow
                label="Contract"
                value={split.contract?.name}
              />
              <InfoRow
                label="Contact"
                value={
                  split.contact
                    ? `${split.contact.first_name} ${split.contact.last_name}`
                    : null
                }
              />
              <InfoRow label="D365 Commission Split ID" value={split.d365_commission_split_id} />
              <InfoRow label="Salesforce ID" value={split.salesforce_id} />
              {split.description && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm whitespace-pre-wrap">{split.description}</p>
                </div>
              )}
              <InfoRow label="Created" value={formatDate(split.created_at)} />
              <InfoRow label="Updated" value={formatDate(split.updated_at)} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Schedule Tab */}
        <TabsContent value="schedule" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Payment Schedule</CardTitle>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => setAddScheduleOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add Schedule
              </Button>
            </CardHeader>
            <CardContent>
              {schedulesLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : schedules.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No schedule entries added yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>%</TableHead>
                      <TableHead>Scheduled Date</TableHead>
                      <TableHead>Payment Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((schedule) => (
                      <TableRow key={schedule.css_id}>
                        <TableCell>{schedule.name || "-"}</TableCell>
                        <TableCell>{schedule.period || "-"}</TableCell>
                        <TableCell>
                          {schedule.commission_amount != null
                            ? `$${schedule.commission_amount.toLocaleString()}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {schedule.commission_percent != null
                            ? `${schedule.commission_percent}%`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {formatDate(schedule.scheduled_date)}
                        </TableCell>
                        <TableCell>
                          {schedule.payment_status ? (
                            <Badge
                              variant={paymentStatusVariant(
                                schedule.payment_status
                              )}
                            >
                              {schedule.payment_status}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Schedule Dialog */}
      <Dialog open={addScheduleOpen} onOpenChange={setAddScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Schedule Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sched-period">Period</Label>
              <Select
                value={scheduleForm.period || undefined}
                onValueChange={(v) =>
                  setScheduleForm((f) => ({ ...f, period: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sched-amount">Commission Amount</Label>
              <Input
                id="sched-amount"
                type="number"
                step="0.01"
                value={scheduleForm.commission_amount}
                onChange={(e) =>
                  setScheduleForm((f) => ({
                    ...f,
                    commission_amount: e.target.value,
                  }))
                }
                placeholder="e.g. 10000.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sched-percent">Commission %</Label>
              <Input
                id="sched-percent"
                type="number"
                step="0.01"
                value={scheduleForm.commission_percent}
                onChange={(e) =>
                  setScheduleForm((f) => ({
                    ...f,
                    commission_percent: e.target.value,
                  }))
                }
                placeholder="e.g. 5.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sched-date">Scheduled Date</Label>
              <Input
                id="sched-date"
                type="date"
                value={scheduleForm.scheduled_date}
                onChange={(e) =>
                  setScheduleForm((f) => ({
                    ...f,
                    scheduled_date: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sched-status">Payment Status</Label>
              <Select
                value={scheduleForm.payment_status || undefined}
                onValueChange={(v) =>
                  setScheduleForm((f) => ({ ...f, payment_status: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {paymentStatusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAddScheduleOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddSchedule} disabled={isCreating}>
                Add Entry
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
