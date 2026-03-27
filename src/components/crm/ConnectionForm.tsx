import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useAccounts } from "@/hooks/useAccounts";
import { useContacts } from "@/hooks/useContacts";
import { Separator } from "@/components/ui/separator";

const connectionSchema = z.object({
  account_id: z.string().min(1, "Organization is required"),
  contact_id: z.string().min(1, "Contact is required"),
  role: z.string().optional(),
  is_active: z.boolean().default(true),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  notes: z.string().optional(),
  push_to_d365: z.boolean().default(false),
});

type ConnectionFormData = z.infer<typeof connectionSchema>;

interface ConnectionFormProps {
  connection?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialAccountId?: string;
  initialContactId?: string;
}

const ROLE_OPTIONS = [
  "Energy Specialist",
  "Primary Contact",
  "Decision Maker",
  "Influencer",
  "Technical Contact",
  "Billing Contact",
  "Executive Sponsor",
  "Other",
];

export function ConnectionForm({
  connection,
  onSubmit,
  onCancel,
  initialAccountId,
  initialContactId,
}: ConnectionFormProps) {
  const { accounts } = useAccounts();
  const { contacts } = useContacts();

  const form = useForm<ConnectionFormData>({
    resolver: zodResolver(connectionSchema),
    defaultValues: {
      account_id: initialAccountId || "",
      contact_id: initialContactId || "",
      role: "",
      is_active: true,
      start_date: "",
      end_date: "",
      notes: "",
      push_to_d365: false,
    },
  });

  useEffect(() => {
    if (connection) {
      form.reset({
        account_id: connection.account_id || "",
        contact_id: connection.contact_id || "",
        role: connection.role || "",
        is_active: connection.is_active ?? true,
        start_date: connection.start_date || "",
        end_date: connection.end_date || "",
        notes: connection.notes || "",
        push_to_d365: connection.push_to_d365 || false,
      });
    }
  }, [connection, form]);

  const handleSubmit = (data: ConnectionFormData) => {
    const submitData = {
      ...data,
      account_id: data.account_id || null,
      contact_id: data.contact_id || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
    };

    if (connection) {
      onSubmit({ connection_id: connection.connection_id, ...submitData });
    } else {
      onSubmit(submitData);
    }
  };

  const selectedAccountId = form.watch("account_id");
  const filteredContacts = contacts.filter(
    (c: any) => !selectedAccountId || c.account_id === selectedAccountId
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Connections Section */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Connections</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account: any) => (
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
              name="contact_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select contact" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredContacts.map((contact: any) => (
                        <SelectItem key={contact.contact_id} value={contact.contact_id}>
                          {contact.first_name} {contact.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Details Section */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
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
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-6">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Active</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Notes Section */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Notes</h3>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea rows={4} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* System Information Section */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4">System Information</h3>
          <FormField
            control={form.control}
            name="push_to_d365"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="font-normal">Push to D365</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {connection ? "Save" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
