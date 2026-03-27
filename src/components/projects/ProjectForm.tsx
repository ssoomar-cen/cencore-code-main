import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/hooks/useAccounts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useContracts } from "@/hooks/useContracts";
import { Separator } from "@/components/ui/separator";

const projectSchema = z.object({
  name: z.string().trim().max(200, "Name must be less than 200 characters").optional(),
  service_status: z.string().default("Active"),
  account_id: z.string().optional(),
  related_opportunity_id: z.string().optional(),
  related_contract_id: z.string().optional(),
  original_contract_start_date: z.string().optional(),
  // Owner only - team members managed separately
  owner_user_id: z.string().optional(),
  // Program Information
  pma_user_id: z.string().optional(),
  pma_password: z.string().optional(),
  data_released: z.string().optional(),
  ct_hotnotes: z.string().optional(),
  // Suspension Detail
  sus_term_date: z.string().optional(),
  sus_term_info: z.string().optional(),
  sus_term_reason: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  project?: any;
}

export function ProjectForm({ open, onClose, onSubmit, isSubmitting, project }: ProjectFormProps) {
  const { accounts } = useAccounts();
  const { opportunities } = useOpportunities();
  const { contracts } = useContracts();
  
  // Fetch users for team member dropdowns
  const { data: users } = useQuery({
    queryKey: ["tenant-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_tenant_users");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      service_status: "Active",
      account_id: "",
      related_opportunity_id: "",
      related_contract_id: "",
      original_contract_start_date: "",
      owner_user_id: "",
      pma_user_id: "",
      pma_password: "",
      data_released: "",
      ct_hotnotes: "",
      sus_term_date: "",
      sus_term_info: "",
      sus_term_reason: "",
    },
  });

  // Populate form when editing existing project
  useEffect(() => {
    if (project && open) {
      form.reset({
        name: project.name || "",
        service_status: project.service_status || "Active",
        account_id: project.account_id || "",
        related_opportunity_id: project.related_opportunity_id || "",
        related_contract_id: project.related_contract_id || "",
        original_contract_start_date: project.original_contract_start_date || "",
        owner_user_id: project.owner_user_id || "",
        pma_user_id: project.pma_user_id || "",
        pma_password: project.pma_password || "",
        data_released: project.data_released || "",
        ct_hotnotes: project.ct_hotnotes || "",
        sus_term_date: project.sus_term_date || "",
        sus_term_info: project.sus_term_info || "",
        sus_term_reason: project.sus_term_reason || "",
      });
    } else if (!open) {
      form.reset();
    }
  }, [project, open, form]);

  const handleSubmit = async (data: ProjectFormData) => {
    const submitData = {
      ...(project?.project_id && { project_id: project.project_id }),
      name: data.name || null,
      service_status: data.service_status || "Active",
      account_id: data.account_id || null,
      related_opportunity_id: data.related_opportunity_id || null,
      related_contract_id: data.related_contract_id || null,
      original_contract_start_date: data.original_contract_start_date || null,
      owner_user_id: data.owner_user_id || null,
      pma_user_id: data.pma_user_id || null,
      pma_password: data.pma_password || null,
      data_released: data.data_released || null,
      ct_hotnotes: data.ct_hotnotes || null,
      sus_term_date: data.sus_term_date || null,
      sus_term_info: data.sus_term_info || null,
      sus_term_reason: data.sus_term_reason || null,
    };
    
    await onSubmit(submitData);
    form.reset();
  };

  const UserSelect = ({ field, label, placeholder }: { field: any; label: string; placeholder: string }) => (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <Select onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} value={field.value || "__none__"}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="__none__">None</SelectItem>
          {users?.map((user: any) => (
            <SelectItem key={user.id} value={user.id}>
              {user.first_name} {user.last_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Energy Program" : "Create New Energy Program"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Overview Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Overview</h3>
              <Separator />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Energy Program Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Auto-generated if blank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="service_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Status</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} value={field.value || "__none__"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">--None--</SelectItem>
                          <SelectItem value="IC">IC</SelectItem>
                          <SelectItem value="OOC">OOC</SelectItem>
                          <SelectItem value="Suspended">Suspended</SelectItem>
                          <SelectItem value="Terminated">Terminated</SelectItem>
                          <SelectItem value="Draft">Draft</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="original_contract_start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Original Contract Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="account_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} value={field.value || "__none__"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select organization" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {accounts?.map((account) => (
                            <SelectItem key={account.account_id} value={account.account_id}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="related_contract_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Contract</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} value={field.value || "__none__"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select contract" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {contracts?.map((contract) => (
                            <SelectItem key={contract.contract_id} value={contract.contract_id}>
                              {contract.contract_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="related_opportunity_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Related Opportunity</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} value={field.value || "__none__"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select opportunity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {opportunities?.map((opp) => (
                          <SelectItem key={opp.opportunity_id} value={opp.opportunity_id}>
                            {opp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Owner Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Owner</h3>
              <Separator />
              
              <div className="w-full md:w-1/2">
                <FormField
                  control={form.control}
                  name="owner_user_id"
                  render={({ field }) => <UserSelect field={field} label="Owner" placeholder="Select owner" />}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Team members can be managed from the Energy Program detail page after creation.
              </p>
            </div>

            {/* Program Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Program Information</h3>
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pma_user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PMA User Id</FormLabel>
                      <FormControl>
                        <Input placeholder="PMA User ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="data_released"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Released</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pma_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PMA Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="PMA Password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ct_hotnotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CT HotNotes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="CT HotNotes" className="resize-none" rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Suspension Detail Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Suspension Detail</h3>
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sus_term_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sus Term Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sus_term_reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sus Term Reason</FormLabel>
                      <FormControl>
                        <Input placeholder="Suspension reason" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="sus_term_info"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sus Term Info</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional suspension information" className="resize-none" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (project ? "Saving..." : "Creating...") : (project ? "Save Changes" : "Create Program")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
