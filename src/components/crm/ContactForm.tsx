import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Contact } from "@/hooks/useContacts";
import { useAccounts } from "@/hooks/useAccounts";
import { useFieldAccess } from "@/hooks/useFieldAccess";

const contactSchema = z.object({
  contact_number: z.string().optional(),
  account_id: z.string().min(1, "Account is required"),
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  title: z.string().max(100).optional().or(z.literal("")),
  is_primary: z.boolean().default(false),
  // New fields
  contact_type: z.string().optional().or(z.literal("")),
  goes_by: z.string().max(100).optional().or(z.literal("")),
  association: z.string().max(255).optional().or(z.literal("")),
  asst_email: z.string().email("Invalid email").optional().or(z.literal("")),
  sales_role: z.string().max(100).optional().or(z.literal("")),
  personal_email: z.string().email("Invalid email").optional().or(z.literal("")),
  additional_email: z.string().email("Invalid email").optional().or(z.literal("")),
  mobile: z.string().max(50).optional().or(z.literal("")),
  fax: z.string().max(50).optional().or(z.literal("")),
  commission_split_total: z.coerce.number().optional(),
  mc_commission: z.string().optional().or(z.literal("")),
  recruiter_commission: z.string().optional().or(z.literal("")),
  internal_search_owner: z.string().optional().or(z.literal("")),
  agreement_notes: z.string().optional().or(z.literal("")),
  actual_from_goals: z.coerce.number().optional(),
  quota_over_goals: z.coerce.number().optional(),
  amount_over_quota: z.coerce.number().optional(),
  dallas_visit_date: z.string().optional().or(z.literal("")),
  commission_notes: z.string().optional().or(z.literal("")),
  key_reference: z.boolean().default(false),
  key_reference_date: z.string().optional().or(z.literal("")),
  reference_notes: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  employee_id: z.string().max(50).optional().or(z.literal("")),
  mailing_address: z.string().optional().or(z.literal("")),
  home_address: z.string().optional().or(z.literal("")),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormProps {
  contact?: Contact;
  onSubmit: (data: Partial<Contact>) => void;
  onCancel: () => void;
  initialAccountId?: string;
}

export const ContactForm = ({ contact, onSubmit, onCancel, initialAccountId }: ContactFormProps) => {
  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { isFieldVisible } = useFieldAccess();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: contact ? {
      contact_number: contact.contact_number || "",
      account_id: contact.account_id,
      first_name: contact.first_name || "",
      last_name: contact.last_name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      title: contact.title || "",
      is_primary: contact.is_primary,
      contact_type: contact.contact_type || "",
      goes_by: contact.goes_by || "",
      association: contact.association || "",
      asst_email: contact.asst_email || "",
      sales_role: contact.sales_role || "",
      personal_email: contact.personal_email || "",
      additional_email: contact.additional_email || "",
      mobile: contact.mobile || "",
      fax: contact.fax || "",
      commission_split_total: contact.commission_split_total || 0,
      mc_commission: contact.mc_commission || "",
      recruiter_commission: contact.recruiter_commission || "",
      internal_search_owner: contact.internal_search_owner || "",
      agreement_notes: contact.agreement_notes || "",
      actual_from_goals: contact.actual_from_goals || undefined,
      quota_over_goals: contact.quota_over_goals || undefined,
      amount_over_quota: contact.amount_over_quota || undefined,
      dallas_visit_date: contact.dallas_visit_date || "",
      commission_notes: contact.commission_notes || "",
      key_reference: contact.key_reference || false,
      key_reference_date: contact.key_reference_date || "",
      reference_notes: contact.reference_notes || "",
      description: contact.description || "",
      employee_id: contact.employee_id || "",
      mailing_address: contact.mailing_address || "",
      home_address: contact.home_address || "",
    } : {
      contact_number: "",
      account_id: initialAccountId || "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      title: "",
      is_primary: false,
      contact_type: "",
      goes_by: "",
      association: "",
      asst_email: "",
      sales_role: "",
      personal_email: "",
      additional_email: "",
      mobile: "",
      fax: "",
      commission_split_total: 0,
      mc_commission: "",
      recruiter_commission: "",
      internal_search_owner: "",
      agreement_notes: "",
      actual_from_goals: undefined,
      quota_over_goals: undefined,
      amount_over_quota: undefined,
      dallas_visit_date: "",
      commission_notes: "",
      key_reference: false,
      key_reference_date: "",
      reference_notes: "",
      description: "",
      employee_id: "",
      mailing_address: "",
      home_address: "",
    },
  });

  // Reset form when contact changes
  useEffect(() => {
    if (contact) {
      reset({
        contact_number: contact.contact_number || "",
        account_id: contact.account_id,
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        email: contact.email || "",
        phone: contact.phone || "",
        title: contact.title || "",
        is_primary: contact.is_primary,
        contact_type: contact.contact_type || "",
        goes_by: contact.goes_by || "",
        association: contact.association || "",
        asst_email: contact.asst_email || "",
        sales_role: contact.sales_role || "",
        personal_email: contact.personal_email || "",
        additional_email: contact.additional_email || "",
        mobile: contact.mobile || "",
        fax: contact.fax || "",
        commission_split_total: contact.commission_split_total || 0,
        mc_commission: contact.mc_commission || "",
        recruiter_commission: contact.recruiter_commission || "",
        internal_search_owner: contact.internal_search_owner || "",
        agreement_notes: contact.agreement_notes || "",
        actual_from_goals: contact.actual_from_goals || undefined,
        quota_over_goals: contact.quota_over_goals || undefined,
        amount_over_quota: contact.amount_over_quota || undefined,
        dallas_visit_date: contact.dallas_visit_date || "",
        commission_notes: contact.commission_notes || "",
        key_reference: contact.key_reference || false,
        key_reference_date: contact.key_reference_date || "",
        reference_notes: contact.reference_notes || "",
        description: contact.description || "",
        employee_id: contact.employee_id || "",
        mailing_address: contact.mailing_address || "",
        home_address: contact.home_address || "",
      });
    }
  }, [contact, reset]);

  const accountId = watch("account_id");
  const isPrimary = watch("is_primary");
  const keyReference = watch("key_reference");

  const handleFormSubmit = (data: ContactFormData) => {
    onSubmit(contact ? { contact_id: contact.contact_id, ...data } as any : data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="commission">Commission</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="contact_number">Contact Number</Label>
            <Input 
              id="contact_number" 
              value={watch("contact_number") || "Will be auto-generated"}
              readOnly 
              className="bg-muted"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_type">Contact Type</Label>
              <Select
                value={watch("contact_type") || undefined}
                onValueChange={(value) => setValue("contact_type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Internal">Internal</SelectItem>
                  <SelectItem value="External">External</SelectItem>
                  <SelectItem value="Partner">Partner</SelectItem>
                  <SelectItem value="Vendor">Vendor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_id">Organization *</Label>
              <Select
                value={accountId || undefined}
                onValueChange={(value) => setValue("account_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
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
              <Label htmlFor="first_name">First Name *</Label>
              <Input id="first_name" {...register("first_name")} />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input id="last_name" {...register("last_name")} />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="goes_by">Goes By (Nickname)</Label>
              <Input id="goes_by" {...register("goes_by")} placeholder="Nickname" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register("title")} placeholder="e.g., CEO, Manager" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="association">Association</Label>
              <Input id="association" {...register("association")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sales_role">Sales Role</Label>
              <Input id="sales_role" {...register("sales_role")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile</Label>
              <Input id="mobile" {...register("mobile")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fax">Fax</Label>
              <Input id="fax" {...register("fax")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="personal_email">Personal Email</Label>
              <Input id="personal_email" type="email" {...register("personal_email")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional_email">Additional Email</Label>
              <Input id="additional_email" type="email" {...register("additional_email")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="asst_email">Asst Email</Label>
              <Input id="asst_email" type="email" {...register("asst_email")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee_id">Employee ID</Label>
              <Input id="employee_id" {...register("employee_id")} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_primary"
                  checked={isPrimary}
                  onCheckedChange={(checked) => setValue("is_primary", checked)}
                />
                <Label htmlFor="is_primary">Primary Contact</Label>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} rows={3} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="commission" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commission_split_total">Commission Split Total</Label>
              <Input 
                id="commission_split_total" 
                type="number" 
                step="0.01"
                {...register("commission_split_total")} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mc_commission">MC Commission</Label>
              <Input id="mc_commission" {...register("mc_commission")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recruiter_commission">Recruiter Commission</Label>
              <Input id="recruiter_commission" {...register("recruiter_commission")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="internal_search_owner">Internal Search Owner</Label>
              <Input id="internal_search_owner" {...register("internal_search_owner")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actual_from_goals">Actual from Goals</Label>
              <Input 
                id="actual_from_goals" 
                type="number" 
                step="0.01"
                {...register("actual_from_goals")} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quota_over_goals">Quota Over Goals</Label>
              <Input 
                id="quota_over_goals" 
                type="number" 
                step="0.01"
                {...register("quota_over_goals")} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount_over_quota">Amount Over Quota</Label>
              <Input 
                id="amount_over_quota" 
                type="number" 
                step="0.01"
                {...register("amount_over_quota")} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dallas_visit_date">Dallas Visit Date</Label>
              <Input 
                id="dallas_visit_date" 
                type="date"
                {...register("dallas_visit_date")} 
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="agreement_notes">Agreement Notes</Label>
              <Textarea id="agreement_notes" {...register("agreement_notes")} rows={3} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="commission_notes">Commission Notes</Label>
              <Textarea id="commission_notes" {...register("commission_notes")} rows={3} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="marketing" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="key_reference"
                  checked={keyReference}
                  onCheckedChange={(checked) => setValue("key_reference", checked)}
                />
                <Label htmlFor="key_reference">Key Reference</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="key_reference_date">Key Reference Date</Label>
              <Input 
                id="key_reference_date" 
                type="date"
                {...register("key_reference_date")} 
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="reference_notes">Reference Notes</Label>
              <Textarea id="reference_notes" {...register("reference_notes")} rows={3} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="address" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mailing_address">Mailing Address</Label>
              <Textarea id="mailing_address" {...register("mailing_address")} rows={4} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="home_address">Home Address</Label>
              <Textarea id="home_address" {...register("home_address")} rows={4} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {contact ? "Update" : "Create"} Contact
        </Button>
      </div>
    </form>
  );
};
