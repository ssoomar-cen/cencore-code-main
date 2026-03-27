import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { Lead } from "@/hooks/useLeads";

const leadSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  title: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  // Classification
  lead_source: z.string().optional().or(z.literal("")),
  status: z.string().optional().or(z.literal("")),
  rating: z.string().optional().or(z.literal("")),
  // Address
  address_street: z.string().optional().or(z.literal("")),
  address_city: z.string().optional().or(z.literal("")),
  address_state: z.string().optional().or(z.literal("")),
  address_zip: z.string().optional().or(z.literal("")),
  address_country: z.string().optional().or(z.literal("")),
  // Notes
  description: z.string().optional().or(z.literal("")),
});

type LeadFormData = z.infer<typeof leadSchema>;

const leadSources = [
  "Web",
  "Phone Inquiry",
  "Partner Referral",
  "Trade Show",
  "Cold Call",
  "Email Campaign",
  "Advertisement",
  "Employee Referral",
  "Other",
];

const leadStatuses = ["New", "Working", "Closed-Converted", "Closed-Not Converted"];
const leadRatings = ["Hot", "Warm", "Cold"];

interface LeadFormProps {
  item?: Lead | null;
  onSubmit: (data: Partial<Lead>) => void;
  onCancel: () => void;
}

const SectionHeader = ({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) => (
  <CollapsibleTrigger asChild onClick={onToggle}>
    <div className="flex items-center justify-between cursor-pointer py-2 border-b mb-3">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <ChevronDown
        className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
      />
    </div>
  </CollapsibleTrigger>
);

export const LeadForm = ({ item, onSubmit, onCancel }: LeadFormProps) => {
  const [section1Open, setSection1Open] = useState(true);
  const [section2Open, setSection2Open] = useState(true);
  const [section3Open, setSection3Open] = useState(false);
  const [section4Open, setSection4Open] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: item
      ? {
          first_name: item.first_name || "",
          last_name: item.last_name || "",
          email: item.email || "",
          phone: item.phone || "",
          title: item.title || "",
          company: item.company || "",
          lead_source: item.lead_source || "",
          status: item.status || "New",
          rating: item.rating || "",
          address_street: item.address_street || "",
          address_city: item.address_city || "",
          address_state: item.address_state || "",
          address_zip: item.address_zip || "",
          address_country: item.address_country || "",
          description: item.description || "",
        }
      : {
          status: "New",
        },
  });

  useEffect(() => {
    if (item) {
      reset({
        first_name: item.first_name || "",
        last_name: item.last_name || "",
        email: item.email || "",
        phone: item.phone || "",
        title: item.title || "",
        company: item.company || "",
        lead_source: item.lead_source || "",
        status: item.status || "New",
        rating: item.rating || "",
        address_street: item.address_street || "",
        address_city: item.address_city || "",
        address_state: item.address_state || "",
        address_zip: item.address_zip || "",
        address_country: item.address_country || "",
        description: item.description || "",
      });
    } else {
      reset({ status: "New" });
    }
  }, [item, reset]);

  const leadSource = watch("lead_source");
  const status = watch("status");
  const rating = watch("rating");

  const handleFormSubmit = (data: LeadFormData) => {
    const formattedData: Partial<Lead> = {
      ...data,
      email: data.email || null,
      phone: data.phone || null,
      title: data.title || null,
      company: data.company || null,
      lead_source: data.lead_source || null,
      status: data.status || null,
      rating: data.rating || null,
      address_street: data.address_street || null,
      address_city: data.address_city || null,
      address_state: data.address_state || null,
      address_zip: data.address_zip || null,
      address_country: data.address_country || null,
      description: data.description || null,
    };
    onSubmit(item ? { lead_id: item.lead_id, ...formattedData } as any : formattedData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
      {/* Section 1: Lead Info */}
      <Collapsible open={section1Open} onOpenChange={setSection1Open}>
        <SectionHeader title="Lead Info" open={section1Open} onToggle={() => setSection1Open((o) => !o)} />
        <CollapsibleContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input id="first_name" {...register("first_name")} placeholder="First name" />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input id="last_name" {...register("last_name")} placeholder="Last name" />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="email@example.com" />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} placeholder="Phone number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register("title")} placeholder="Job title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input id="company" {...register("company")} placeholder="Company name" />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Section 2: Classification */}
      <Collapsible open={section2Open} onOpenChange={setSection2Open}>
        <SectionHeader title="Classification" open={section2Open} onToggle={() => setSection2Open((o) => !o)} />
        <CollapsibleContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="lead_source">Lead Source</Label>
              <Select value={leadSource || undefined} onValueChange={(v) => setValue("lead_source", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {leadSources.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status || undefined} onValueChange={(v) => setValue("status", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {leadStatuses.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating">Rating</Label>
              <Select value={rating || undefined} onValueChange={(v) => setValue("rating", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  {leadRatings.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Section 3: Address */}
      <Collapsible open={section3Open} onOpenChange={setSection3Open}>
        <SectionHeader title="Address" open={section3Open} onToggle={() => setSection3Open((o) => !o)} />
        <CollapsibleContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address_street">Street</Label>
              <Input id="address_street" {...register("address_street")} placeholder="Street address" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_city">City</Label>
              <Input id="address_city" {...register("address_city")} placeholder="City" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_state">State</Label>
              <Input id="address_state" {...register("address_state")} placeholder="State" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_zip">ZIP Code</Label>
              <Input id="address_zip" {...register("address_zip")} placeholder="ZIP" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_country">Country</Label>
              <Input id="address_country" {...register("address_country")} placeholder="Country" />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Section 4: Notes */}
      <Collapsible open={section4Open} onOpenChange={setSection4Open}>
        <SectionHeader title="Notes" open={section4Open} onToggle={() => setSection4Open((o) => !o)} />
        <CollapsibleContent>
          <div className="pb-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} rows={4} placeholder="Additional notes or description..." />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-background pb-1">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {item ? "Update" : "Create"} Lead
        </Button>
      </div>
    </form>
  );
};
