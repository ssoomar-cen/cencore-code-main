import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Account, useAccounts } from "@/hooks/useAccounts";
import { Link } from "react-router-dom";
import { ExternalLink, ChevronDown } from "lucide-react";
import { useState } from "react";

const accountSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required").max(255),
  legal_name: z.string().max(255).optional(),
  account_number: z.string().max(50).optional(),
  type: z.string().min(1, "Type is required"),
  industry: z.string().max(100).optional(),
  website: z.string().url("Invalid URL").max(255).optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  billing_email: z.string().trim().email("Invalid email address").max(255).optional().or(z.literal("")),
  billing_address: z.string().max(500).optional(),
  physical_address: z.string().max(500).optional(),
  mailing_address: z.string().max(500).optional(),
  status: z.string().min(1, "Status is required"),
  bc_posting_group: z.string().optional(),
  // New organization fields
  association: z.string().max(255).optional(),
  parent_account_id: z.string().uuid().optional().or(z.literal("")),
  client_id: z.string().max(50).optional(),
  org_record_type: z.string().optional(),
  org_type: z.string().max(100).optional(),
  faith_based: z.boolean().optional(),
  contract_status: z.string().optional(),
  sharepoint_path: z.string().max(500).optional(),
  key_reference: z.boolean().optional(),
  // Demographics
  est_annual_expenditures: z.number().optional().or(z.nan()),
  minimum_utility_spend: z.number().optional().or(z.nan()),
  cost_per_student: z.number().optional().or(z.nan()),
  prospect_data_source: z.string().max(255).optional(),
  membership_enrollment: z.number().int().optional().or(z.nan()),
  total_gross_square_feet: z.number().int().optional().or(z.nan()),
  // Status
  sales_status: z.string().optional(),
  // Data Integration
  push_to_d365: z.boolean().optional(),
});

const ORG_RECORD_TYPES = ["Client", "Prospect", "Partner", "Vendor", "Competitor"];
const ORG_TYPES = ["K thru 12", "Higher Education", "Commercial", "Government", "Healthcare", "Industrial", "Other"];
const CONTRACT_STATUSES = ["Active", "Expired", "Pending", "Terminated"];
const SALES_STATUSES = ["New", "Qualified", "Proposal", "Negotiation", "Renewal", "Closed Won", "Closed Lost"];

type AccountFormData = z.infer<typeof accountSchema>;

interface AccountFormProps {
  account?: Account | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Account>) => void;
  isSubmitting?: boolean;
}

export const AccountForm = ({ account, open, onClose, onSubmit, isSubmitting }: AccountFormProps) => {
  const { accounts } = useAccounts();
  const [openSections, setOpenSections] = useState({
    orgInfo: true,
    demographics: false,
    status: false,
    dataIntegration: false,
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      type: "Customer",
      status: "Active",
      org_record_type: "Prospect",
      faith_based: false,
      key_reference: false,
      push_to_d365: false,
    },
  });

  useEffect(() => {
    if (account) {
      reset({
        name: account.name || "",
        legal_name: account.legal_name || "",
        account_number: account.account_number || "",
        type: account.type || "Customer",
        industry: account.industry || "",
        website: account.website || "",
        phone: account.phone || "",
        billing_email: account.billing_email || "",
        billing_address: account.billing_address || "",
        physical_address: account.physical_address || "",
        mailing_address: account.mailing_address || "",
        status: account.status || "Active",
        association: account.association || "",
        parent_account_id: account.parent_account_id || "",
        client_id: account.client_id || "",
        org_record_type: account.org_record_type || "Prospect",
        org_type: account.org_type || "",
        faith_based: account.faith_based || false,
        contract_status: account.contract_status || "",
        sharepoint_path: account.sharepoint_path || "",
        key_reference: account.key_reference || false,
        est_annual_expenditures: account.est_annual_expenditures || undefined,
        minimum_utility_spend: account.minimum_utility_spend || undefined,
        cost_per_student: account.cost_per_student || undefined,
        prospect_data_source: account.prospect_data_source || "",
        membership_enrollment: account.membership_enrollment || undefined,
        total_gross_square_feet: account.total_gross_square_feet || undefined,
        sales_status: account.sales_status || "",
        push_to_d365: account.push_to_d365 || false,
      });
    }
  }, [account, reset]);

  const handleFormSubmit = (data: AccountFormData) => {
    // Clean up empty strings and NaN values
    const cleanedData: Partial<Account> = {
      ...data,
      parent_account_id: data.parent_account_id || null,
      est_annual_expenditures: isNaN(data.est_annual_expenditures as number) ? null : data.est_annual_expenditures,
      minimum_utility_spend: isNaN(data.minimum_utility_spend as number) ? null : data.minimum_utility_spend,
      cost_per_student: isNaN(data.cost_per_student as number) ? null : data.cost_per_student,
      membership_enrollment: isNaN(data.membership_enrollment as number) ? null : data.membership_enrollment,
      total_gross_square_feet: isNaN(data.total_gross_square_feet as number) ? null : data.total_gross_square_feet,
    };
    
    if (account) {
      onSubmit({ ...cleanedData, account_id: account.account_id });
    } else {
      onSubmit(cleanedData);
    }
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Filter out current account from parent options
  const parentAccountOptions = accounts?.filter(a => a.account_id !== account?.account_id) || [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{account ? "Edit Organization" : "Create New Organization"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">

          {/* Org Information Section */}
          <Collapsible open={openSections.orgInfo} onOpenChange={() => toggleSection('orgInfo')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <span className="font-medium">Org Information</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.orgInfo ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Org Name *</Label>
                  <Input id="name" {...register("name")} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_id">Client Id</Label>
                  <Input id="client_id" {...register("client_id")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legal_name">Org Legal Name</Label>
                  <Input id="legal_name" {...register("legal_name")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org_record_type">Org Record Type</Label>
                  <Select value={watch("org_record_type") || "Prospect"} onValueChange={(value) => setValue("org_record_type", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORG_RECORD_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="association">Association</Label>
                  <Input id="association" {...register("association")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org_type">Org Type</Label>
                  <Select value={watch("org_type") || "__none__"} onValueChange={(value) => setValue("org_type", value === "__none__" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select org type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {ORG_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parent_account_id">Parent Organization</Label>
                  <Select 
                    value={watch("parent_account_id") || "__none__"} 
                    onValueChange={(value) => setValue("parent_account_id", value === "__none__" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {parentAccountOptions.map((acc) => (
                        <SelectItem key={acc.account_id} value={acc.account_id}>{acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox 
                    id="faith_based" 
                    checked={watch("faith_based") || false}
                    onCheckedChange={(checked) => setValue("faith_based", checked === true)}
                  />
                  <Label htmlFor="faith_based">Faith-Based</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="physical_address">Physical Address</Label>
                  <Textarea id="physical_address" {...register("physical_address")} rows={2} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract_status">Contract Status</Label>
                  <Select value={watch("contract_status") || "__none__"} onValueChange={(value) => setValue("contract_status", value === "__none__" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {CONTRACT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" placeholder="https://example.com" {...register("website")} />
                  {errors.website && <p className="text-sm text-destructive">{errors.website.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sharepoint_path">SharePoint Path</Label>
                  <Input id="sharepoint_path" {...register("sharepoint_path")} />
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox 
                    id="key_reference" 
                    checked={watch("key_reference") || false}
                    onCheckedChange={(checked) => setValue("key_reference", checked === true)}
                  />
                  <Label htmlFor="key_reference">Key Reference</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mailing_address">Mailing Address</Label>
                  <Textarea id="mailing_address" {...register("mailing_address")} rows={2} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...register("phone")} />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Basic Demographics Section */}
          <Collapsible open={openSections.demographics} onOpenChange={() => toggleSection('demographics')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <span className="font-medium">Basic Demographics</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.demographics ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="est_annual_expenditures">Est. Annual Expenditures</Label>
                  <Input 
                    id="est_annual_expenditures" 
                    type="number" 
                    step="0.01"
                    {...register("est_annual_expenditures", { valueAsNumber: true })} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_per_student">Cost per Student</Label>
                  <Input 
                    id="cost_per_student" 
                    type="number" 
                    step="0.01"
                    {...register("cost_per_student", { valueAsNumber: true })} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimum_utility_spend">Minimum Utility Spend</Label>
                  <Input 
                    id="minimum_utility_spend" 
                    type="number" 
                    step="0.01"
                    {...register("minimum_utility_spend", { valueAsNumber: true })} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prospect_data_source">Prospect Data Source</Label>
                  <Input id="prospect_data_source" {...register("prospect_data_source")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="membership_enrollment">Membership/Enrollment</Label>
                  <Input 
                    id="membership_enrollment" 
                    type="number" 
                    {...register("membership_enrollment", { valueAsNumber: true })} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_gross_square_feet">Total Gross Square Feet</Label>
                  <Input 
                    id="total_gross_square_feet" 
                    type="number" 
                    {...register("total_gross_square_feet", { valueAsNumber: true })} 
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Status Section */}
          <Collapsible open={openSections.status} onOpenChange={() => toggleSection('status')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <span className="font-medium">Status</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.status ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select value={watch("status") || "Active"} onValueChange={(value) => setValue("status", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sales_status">Sales Status</Label>
                  <Select value={watch("sales_status") || "__none__"} onValueChange={(value) => setValue("sales_status", value === "__none__" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sales status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {SALES_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Data Integration Section */}
          <Collapsible open={openSections.dataIntegration} onOpenChange={() => toggleSection('dataIntegration')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <span className="font-medium">Data Integration</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.dataIntegration ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="push_to_d365" 
                    checked={watch("push_to_d365") || false}
                    onCheckedChange={(checked) => setValue("push_to_d365", checked === true)}
                  />
                  <Label htmlFor="push_to_d365">Push to D365</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select value={watch("type") || "Customer"} onValueChange={(value) => setValue("type", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Customer">Customer</SelectItem>
                      <SelectItem value="Prospect">Prospect</SelectItem>
                      <SelectItem value="Vendor">Vendor</SelectItem>
                      <SelectItem value="Partner">Partner</SelectItem>
                      <SelectItem value="Competitor">Competitor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : account ? "Update Organization" : "Create Organization"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
