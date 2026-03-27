import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Contract } from "@/hooks/useContracts";
import { useAccounts } from "@/hooks/useAccounts";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useFieldAccess } from "@/hooks/useFieldAccess";

const contractSchema = z.object({
  account_id: z.string().min(1, "Account is required"),
  opportunity_id: z.string().optional().or(z.literal("")),
  contract_number: z.string().optional(),
  start_date: z.string().optional().or(z.literal("")),
  end_date: z.string().optional().or(z.literal("")),
  status: z.string().min(1, "Status is required"),
  value: z.string().optional().or(z.literal("")),
  billing_frequency: z.string().optional().or(z.literal("")),
  terms: z.string().optional().or(z.literal("")),
});

type ContractFormData = z.infer<typeof contractSchema>;

const statuses = ["Draft", "Active", "Signed", "Expired", "Cancelled"];
const billingFrequencies = ["Monthly", "Quarterly", "Annually", "One-time"];

interface ContractFormProps {
  contract?: Contract;
  onSubmit: (data: Partial<Contract>) => void;
  onCancel: () => void;
  initialAccountId?: string;
  initialOpportunityId?: string;
}

export const ContractForm = ({ contract, onSubmit, onCancel, initialAccountId, initialOpportunityId }: ContractFormProps) => {
  const { accounts } = useAccounts();
  const { opportunities } = useOpportunities();
  const { isFieldVisible } = useFieldAccess();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: contract ? {
      account_id: contract.account_id,
      opportunity_id: contract.opportunity_id || "",
      contract_number: contract.contract_number,
      start_date: contract.start_date || "",
      end_date: contract.end_date || "",
      status: contract.status || "Draft",
      value: contract.value?.toString() || "",
      billing_frequency: contract.billing_frequency || "",
      terms: contract.terms || "",
    } : {
      status: "Draft",
      account_id: initialAccountId || "",
      opportunity_id: initialOpportunityId || "",
    },
  });

  // Reset form when contract changes
  useEffect(() => {
    if (contract) {
      reset({
        account_id: contract.account_id,
        opportunity_id: contract.opportunity_id || "",
        contract_number: contract.contract_number,
        start_date: contract.start_date || "",
        end_date: contract.end_date || "",
        status: contract.status || "Draft",
        value: contract.value?.toString() || "",
        billing_frequency: contract.billing_frequency || "",
        terms: contract.terms || "",
      });
    } else {
      reset({
        account_id: initialAccountId || "",
        opportunity_id: initialOpportunityId || "",
        contract_number: "",
        start_date: "",
        end_date: "",
        status: "Draft",
        value: "",
        billing_frequency: "",
        terms: "",
      });
    }
  }, [contract, reset, initialAccountId, initialOpportunityId]);

  const accountId = watch("account_id");
  const opportunityId = watch("opportunity_id");
  const status = watch("status");
  const billingFrequency = watch("billing_frequency");

  const accountOpportunities = opportunities?.filter(o => o.account_id === accountId);

  const handleFormSubmit = (data: ContractFormData) => {
    const formattedData = {
      ...data,
      value: data.value ? parseFloat(data.value) : null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      opportunity_id: data.opportunity_id || null,
      billing_frequency: data.billing_frequency || null,
      terms: data.terms || null,
    };
    onSubmit(contract ? { contract_id: contract.contract_id, ...formattedData } as any : formattedData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="account_id">Account *</Label>
          <Select
            value={accountId || undefined}
            onValueChange={(value) => setValue("account_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts?.map((account) => (
                <SelectItem key={account.account_id} value={account.account_id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.account_id && (
            <p className="text-sm text-destructive">{errors.account_id.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="opportunity_id">Related Opportunity</Label>
          <Select
            value={opportunityId || undefined}
            onValueChange={(value) => setValue("opportunity_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select opportunity" />
            </SelectTrigger>
            <SelectContent>
              {accountOpportunities?.map((opp) => (
                <SelectItem key={opp.opportunity_id} value={opp.opportunity_id}>
                  {opp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contract_number">Contract Number</Label>
          <Input 
            id="contract_number" 
            {...register("contract_number")}
            placeholder={contract ? undefined : "Will be auto-generated"}
            readOnly 
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status *</Label>
          <Select
            value={status || undefined}
            onValueChange={(value) => setValue("status", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((st) => (
                <SelectItem key={st} value={st}>
                  {st}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.status && (
            <p className="text-sm text-destructive">{errors.status.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="start_date">Start Date</Label>
          <Input id="start_date" type="date" {...register("start_date")} />
          {errors.start_date && (
            <p className="text-sm text-destructive">{errors.start_date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">End Date</Label>
          <Input id="end_date" type="date" {...register("end_date")} />
          {errors.end_date && (
            <p className="text-sm text-destructive">{errors.end_date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="value">Contract Value</Label>
          <Input id="value" type="number" step="0.01" {...register("value")} />
          {errors.value && (
            <p className="text-sm text-destructive">{errors.value.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="billing_frequency">Billing Frequency</Label>
          <Select
            value={billingFrequency || undefined}
            onValueChange={(value) => setValue("billing_frequency", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              {billingFrequencies.map((freq) => (
                <SelectItem key={freq} value={freq}>
                  {freq}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="terms">Terms & Conditions</Label>
          <Textarea id="terms" {...register("terms")} rows={4} />
          {errors.terms && (
            <p className="text-sm text-destructive">{errors.terms.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {contract ? "Update" : "Create"} Contract
        </Button>
      </div>
    </form>
  );
};
