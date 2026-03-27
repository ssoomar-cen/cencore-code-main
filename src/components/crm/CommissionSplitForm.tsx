import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CommissionSplit } from "@/hooks/useCommissionSplits";

type CommissionSplitFormData = {
  name: string;
  commission_recipient_name: string;
  commission_type: string;
  commissions_approved: boolean;
  based_on_tcv_or_ncv: string;
  commission_percent: string;
  commission_percent_2: string;
  total_commission_for_contract_term: string;
  first_payment_amount: string;
  number_of_payments: string;
  customer_sign_date: string;
  first_payment_due_date: string;
  description: string;
};

const commissionTypes = [
  "Standard",
  "Traditional Monthly",
  "Traditional with Pop",
  "Variable",
  "Association",
  "EC Finder1",
  "EC Finder2",
  "EC Other",
  "EC1",
  "EC2",
  "Regional President",
  "Salesperson",
  "Salesperson Other",
];

const tcvNcvOptions = ["TCV", "NCV"];

interface CommissionSplitFormProps {
  commissionSplit?: CommissionSplit;
  onSubmit: (data: Partial<CommissionSplit>) => void;
  onCancel: () => void;
}

export const CommissionSplitForm = ({
  commissionSplit,
  onSubmit,
  onCancel,
}: CommissionSplitFormProps) => {
  const { register, handleSubmit, setValue, watch, reset } =
    useForm<CommissionSplitFormData>({
      defaultValues: commissionSplit
        ? {
            name: commissionSplit.name || "",
            commission_recipient_name: commissionSplit.commission_recipient_name || "",
            commission_type: commissionSplit.commission_type || "",
            commissions_approved: commissionSplit.commissions_approved || false,
            based_on_tcv_or_ncv: commissionSplit.based_on_tcv_or_ncv || "",
            commission_percent: commissionSplit.commission_percent?.toString() || "",
            commission_percent_2: commissionSplit.commission_percent_2?.toString() || "",
            total_commission_for_contract_term:
              commissionSplit.total_commission_for_contract_term?.toString() || "",
            first_payment_amount: commissionSplit.first_payment_amount?.toString() || "",
            number_of_payments: commissionSplit.number_of_payments?.toString() || "",
            customer_sign_date: commissionSplit.customer_sign_date || "",
            first_payment_due_date: commissionSplit.first_payment_due_date || "",
            description: commissionSplit.description || "",
          }
        : {
            name: "",
            commission_recipient_name: "",
            commission_type: "",
            commissions_approved: false,
            based_on_tcv_or_ncv: "",
            commission_percent: "",
            commission_percent_2: "",
            total_commission_for_contract_term: "",
            first_payment_amount: "",
            number_of_payments: "",
            customer_sign_date: "",
            first_payment_due_date: "",
            description: "",
          },
    });

  useEffect(() => {
    if (commissionSplit) {
      reset({
        name: commissionSplit.name || "",
        commission_recipient_name: commissionSplit.commission_recipient_name || "",
        commission_type: commissionSplit.commission_type || "",
        commissions_approved: commissionSplit.commissions_approved || false,
        based_on_tcv_or_ncv: commissionSplit.based_on_tcv_or_ncv || "",
        commission_percent: commissionSplit.commission_percent?.toString() || "",
        commission_percent_2: commissionSplit.commission_percent_2?.toString() || "",
        total_commission_for_contract_term:
          commissionSplit.total_commission_for_contract_term?.toString() || "",
        first_payment_amount: commissionSplit.first_payment_amount?.toString() || "",
        number_of_payments: commissionSplit.number_of_payments?.toString() || "",
        customer_sign_date: commissionSplit.customer_sign_date || "",
        first_payment_due_date: commissionSplit.first_payment_due_date || "",
        description: commissionSplit.description || "",
      });
    } else {
      reset({
        name: "",
        commission_recipient_name: "",
        commission_type: "",
        commissions_approved: false,
        based_on_tcv_or_ncv: "",
        commission_percent: "",
        commission_percent_2: "",
        total_commission_for_contract_term: "",
        first_payment_amount: "",
        number_of_payments: "",
        customer_sign_date: "",
        first_payment_due_date: "",
        description: "",
      });
    }
  }, [commissionSplit, reset]);

  const commissionTypeValue = watch("commission_type");
  const tcvNcvValue = watch("based_on_tcv_or_ncv");
  const commissionsApproved = watch("commissions_approved");

  const handleFormSubmit = (data: CommissionSplitFormData) => {
    const formattedData: Partial<CommissionSplit> = {
      name: data.name || null,
      commission_recipient_name: data.commission_recipient_name || null,
      commission_type: data.commission_type || null,
      commissions_approved: data.commissions_approved,
      based_on_tcv_or_ncv: data.based_on_tcv_or_ncv || null,
      commission_percent: data.commission_percent
        ? parseFloat(data.commission_percent)
        : null,
      commission_percent_2: data.commission_percent_2
        ? parseFloat(data.commission_percent_2)
        : null,
      total_commission_for_contract_term: data.total_commission_for_contract_term
        ? parseFloat(data.total_commission_for_contract_term)
        : null,
      first_payment_amount: data.first_payment_amount
        ? parseFloat(data.first_payment_amount)
        : null,
      number_of_payments: data.number_of_payments
        ? parseInt(data.number_of_payments)
        : null,
      customer_sign_date: data.customer_sign_date || null,
      first_payment_due_date: data.first_payment_due_date || null,
      description: data.description || null,
    };
    onSubmit(
      commissionSplit
        ? { commission_split_id: commissionSplit.commission_split_id, ...formattedData }
        : formattedData
    );
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Split Info */}
      <div>
        <h3 className="text-base font-semibold mb-4">Split Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} placeholder="Split name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commission_recipient_name">Recipient Name</Label>
            <Input
              id="commission_recipient_name"
              {...register("commission_recipient_name")}
              placeholder="Commission recipient"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commission_type">Commission Type</Label>
            <Select
              value={commissionTypeValue || undefined}
              onValueChange={(v) => setValue("commission_type", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {commissionTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="based_on_tcv_or_ncv">Based On</Label>
            <Select
              value={tcvNcvValue || undefined}
              onValueChange={(v) => setValue("based_on_tcv_or_ncv", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select TCV or NCV" />
              </SelectTrigger>
              <SelectContent>
                {tcvNcvOptions.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <Checkbox
              id="commissions_approved"
              checked={commissionsApproved}
              onCheckedChange={(checked) =>
                setValue("commissions_approved", !!checked)
              }
            />
            <Label htmlFor="commissions_approved">Commissions Approved</Label>
          </div>
        </div>
      </div>

      {/* Financials */}
      <div>
        <h3 className="text-base font-semibold mb-4">Financials</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="commission_percent">Commission % (Primary)</Label>
            <Input
              id="commission_percent"
              type="number"
              step="0.01"
              {...register("commission_percent")}
              placeholder="e.g. 5.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commission_percent_2">Commission % (Secondary)</Label>
            <Input
              id="commission_percent_2"
              type="number"
              step="0.01"
              {...register("commission_percent_2")}
              placeholder="e.g. 2.50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="total_commission_for_contract_term">
              Total Commission for Contract Term
            </Label>
            <Input
              id="total_commission_for_contract_term"
              type="number"
              step="0.01"
              {...register("total_commission_for_contract_term")}
              placeholder="e.g. 50000.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="first_payment_amount">First Payment Amount</Label>
            <Input
              id="first_payment_amount"
              type="number"
              step="0.01"
              {...register("first_payment_amount")}
              placeholder="e.g. 10000.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="number_of_payments">Number of Payments</Label>
            <Input
              id="number_of_payments"
              type="number"
              {...register("number_of_payments")}
              placeholder="e.g. 5"
            />
          </div>
        </div>
      </div>

      {/* Dates */}
      <div>
        <h3 className="text-base font-semibold mb-4">Dates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customer_sign_date">Customer Sign Date</Label>
            <Input
              id="customer_sign_date"
              type="date"
              {...register("customer_sign_date")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="first_payment_due_date">First Payment Due Date</Label>
            <Input
              id="first_payment_due_date"
              type="date"
              {...register("first_payment_due_date")}
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <h3 className="text-base font-semibold mb-4">Notes</h3>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register("description")}
            rows={4}
            placeholder="Additional notes or description..."
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {commissionSplit ? "Update" : "Create"} Commission Split
        </Button>
      </div>
    </form>
  );
};
