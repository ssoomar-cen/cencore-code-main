import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Mail } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Activity } from "@/hooks/useActivities";
import { useAccounts } from "@/hooks/useAccounts";
import { useContacts } from "@/hooks/useContacts";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useQuotes } from "@/hooks/useQuotes";
import { useContracts } from "@/hooks/useContracts";
import { useCases } from "@/hooks/useCases";
import { useProjects } from "@/hooks/useProjects";
import { useFieldAccess } from "@/hooks/useFieldAccess";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const activitySchema = z.object({
  activity_number: z.string().optional(),
  type: z.string().min(1, "Type is required"),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  due_date: z.date().optional(),
  start_datetime: z.date().optional(),
  end_datetime: z.date().optional(),
  regarding_type: z.string().optional(),
  regarding_id: z.string().optional(),
  to_email: z.string().email().optional().or(z.literal("")),
  cc_email: z.string().email().optional().or(z.literal("")),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

interface ActivityFormProps {
  activity?: Activity;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialRegardingType?: string;
  initialRegardingId?: string;
}

export function ActivityForm({ activity, onSubmit, onCancel, initialRegardingType, initialRegardingId }: ActivityFormProps) {
  const { accounts } = useAccounts();
  const { contacts } = useContacts();
  const { opportunities } = useOpportunities();
  const { quotes } = useQuotes();
  const { contracts } = useContracts();
  const { cases } = useCases();
  const { projects } = useProjects();
  const { isFieldVisible } = useFieldAccess();
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Determine initial regarding type from activity or props
  const getInitialRegardingType = () => {
    if (initialRegardingType) return initialRegardingType;
    if (!activity) return "";
    if (activity.account_id) return "account";
    if (activity.contact_id) return "contact";
    if (activity.opportunity_id) return "opportunity";
    if (activity.quote_id) return "quote";
    if (activity.contract_id) return "contract";
    if ((activity as any).case_id) return "case";
    if (activity.project_id) return "project";
    return "";
  };

  const getInitialRegardingId = () => {
    if (initialRegardingId) return initialRegardingId;
    if (!activity) return "";
    if (activity.account_id) return activity.account_id;
    if (activity.contact_id) return activity.contact_id;
    if (activity.opportunity_id) return activity.opportunity_id;
    if (activity.quote_id) return activity.quote_id;
    if (activity.contract_id) return activity.contract_id;
    if ((activity as any).case_id) return (activity as any).case_id;
    if (activity.project_id) return activity.project_id;
    return "";
  };

  const [regardingType, setRegardingType] = useState(getInitialRegardingType());

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      activity_number: activity?.activity_number || "",
      type: activity?.type || "Task",
      subject: activity?.subject || "",
      description: activity?.description || "",
      status: activity?.status || "Not Started",
      priority: activity?.priority || "Normal",
      due_date: activity?.due_date ? new Date(activity.due_date) : undefined,
      start_datetime: activity?.start_datetime ? new Date(activity.start_datetime) : undefined,
      end_datetime: activity?.end_datetime ? new Date(activity.end_datetime) : undefined,
      regarding_type: getInitialRegardingType(),
      regarding_id: getInitialRegardingId(),
      to_email: (activity as any)?.to_email || "",
      cc_email: (activity as any)?.cc_email || "",
    },
  });

  const activityType = form.watch("type");
  const regardingId = form.watch("regarding_id");

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "regarding_type") {
        setRegardingType(value.regarding_type || "");
        form.setValue("regarding_id", "");
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Auto-populate Subject when regarding type is Case
  useEffect(() => {
    // Only auto-populate for new activities, not when editing
    if (!activity && regardingType === "case" && regardingId) {
      const selectedCase = cases?.find((c: any) => c.case_id === regardingId);
      if (selectedCase?.subject) {
        const currentSubject = form.getValues("subject");
        // Only set if subject is empty
        if (!currentSubject) {
          form.setValue("subject", selectedCase.subject);
        }
      }
    }
  }, [regardingId, regardingType, cases, form, activity]);

  // Auto-populate "To Email" when type is Email and regarding record changes
  useEffect(() => {
    if (activityType === "Email" && regardingId && regardingType) {
      const getEmailFromRegarding = async () => {
        try {
          if (regardingType === "contact") {
            const contact = contacts?.find((c: any) => c.contact_id === regardingId);
            if (contact?.email) {
              form.setValue("to_email", contact.email);
            }
          } else if (regardingType === "case") {
            const supportCase = cases?.find((c: any) => c.case_id === regardingId);
            if (supportCase?.contact_id) {
              const contact = contacts?.find((c: any) => c.contact_id === supportCase.contact_id);
              if (contact?.email) {
                form.setValue("to_email", contact.email);
              }
            }
          } else if (regardingType === "account") {
            const account = accounts?.find((a: any) => a.account_id === regardingId);
            if (account?.account_id) {
              // Find primary contact for this account
              const primaryContact = contacts?.find((c: any) => 
                c.account_id === account.account_id && c.is_primary
              );
              if (primaryContact?.email) {
                form.setValue("to_email", primaryContact.email);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching email:", error);
        }
      };
      getEmailFromRegarding();
    }
  }, [activityType, regardingId, regardingType, contacts, cases, accounts, form]);

  const handleSubmit = (data: ActivityFormValues) => {
    const formattedData: any = {
      type: data.type,
      subject: data.subject,
      description: data.description,
      status: data.status,
      priority: data.priority,
      due_date: data.due_date ? format(data.due_date, "yyyy-MM-dd") : null,
      start_datetime: data.start_datetime ? data.start_datetime.toISOString() : null,
      end_datetime: data.end_datetime ? data.end_datetime.toISOString() : null,
      account_id: null,
      contact_id: null,
      opportunity_id: null,
      lead_id: null,
      quote_id: null,
      contract_id: null,
      case_id: null,
      project_id: null,
    };

    // Set the appropriate ID based on regarding type
    if (data.regarding_type && data.regarding_id) {
      formattedData[`${data.regarding_type}_id`] = data.regarding_id;
    }

    // Add email fields if type is Email
    if (data.type === "Email") {
      formattedData.to_email = data.to_email || null;
      formattedData.cc_email = data.cc_email || null;
    }

    onSubmit(activity ? { activity_id: activity.activity_id, ...formattedData } : formattedData);
  };

  const handleSendEmail = async () => {
    const values = form.getValues();
    
    if (!values.to_email) {
      toast.error("Please provide a recipient email address");
      return;
    }

    setIsSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('send-activity-email', {
        body: {
          to: values.to_email,
          cc: values.cc_email || null,
          toName: values.to_email,
          subject: values.subject || "No Subject",
          body: values.description || "",
          activityId: activity?.activity_id || "new"
        }
      });
      
      if (error) throw error;
      
      // Prepare data with completed status
      const formattedData: any = {
        type: values.type,
        subject: values.subject,
        description: values.description,
        status: "Completed",
        priority: values.priority,
        due_date: values.due_date ? format(values.due_date, "yyyy-MM-dd") : null,
        start_datetime: values.start_datetime ? values.start_datetime.toISOString() : null,
        end_datetime: values.end_datetime ? values.end_datetime.toISOString() : null,
        account_id: null,
        contact_id: null,
        opportunity_id: null,
        lead_id: null,
        quote_id: null,
        contract_id: null,
        case_id: null,
        project_id: null,
        to_email: values.to_email || null,
        cc_email: values.cc_email || null,
      };

      if (values.regarding_type && values.regarding_id) {
        formattedData[`${values.regarding_type}_id`] = values.regarding_id;
      }

      onSubmit(activity ? { activity_id: activity.activity_id, ...formattedData } : formattedData);
      toast.success("Email sent successfully");
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || "Failed to send email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getRegardingRecords = () => {
    switch (regardingType) {
      case "account":
        return accounts?.map((a: any) => ({ id: a.account_id, label: a.name })) || [];
      case "contact":
        return contacts?.map((c: any) => ({ 
          id: c.contact_id, 
          label: `${c.first_name} ${c.last_name}` 
        })) || [];
      case "opportunity":
        return opportunities?.map((o: any) => ({ id: o.opportunity_id, label: o.name })) || [];
      case "quote":
        return quotes?.map((q: any) => ({ 
          id: q.quote_id, 
          label: `Quote #${q.quote_number}` 
        })) || [];
      case "contract":
        return contracts?.map((c: any) => ({ 
          id: c.contract_id, 
          label: `Contract #${c.contract_number}` 
        })) || [];
      case "case":
        return cases?.map((c: any) => ({ id: c.case_id, label: c.subject })) || [];
      case "project":
        return projects?.map((p: any) => ({ id: p.project_id, label: p.name })) || [];
      default:
        return [];
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="activity_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Activity Number</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  value={field.value || "Will be auto-generated"}
                  readOnly 
                  className="bg-muted"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Task">Task</SelectItem>
                  <SelectItem value="Call">Call</SelectItem>
                  <SelectItem value="Meeting">Meeting</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="regarding_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Regarding Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select record type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="account">Organization</SelectItem>
                    <SelectItem value="contact">Contact</SelectItem>
                    <SelectItem value="opportunity">Opportunity</SelectItem>
                    <SelectItem value="quote">Quote</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="case">Case</SelectItem>
                    <SelectItem value="project">Energy Program</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="regarding_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Regarding</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                  disabled={!regardingType}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        regardingType ? "Select record" : "Select type first"
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {getRegardingRecords().map((record) => (
                      <SelectItem key={record.id} value={record.id}>
                        {record.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {activityType === "Email" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="to_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="recipient@example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cc_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CC Email (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="cc@example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="due_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {activityType === "Email" && (
            <Button type="button" onClick={handleSendEmail} disabled={isSendingEmail}>
              <Mail className="h-4 w-4 mr-2" />
              {isSendingEmail ? "Sending..." : "Send Email"}
            </Button>
          )}
          <Button type="submit">
            {activity ? "Update" : "Create"} Activity
          </Button>
        </div>
      </form>
    </Form>
  );
}
