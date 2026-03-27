import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Case } from "@/hooks/useCases";
import { useEffect, useState } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import { useContacts } from "@/hooks/useContacts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, FileIcon } from "lucide-react";

const formSchema = z.object({
  case_number: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().optional(),
  status: z.string(),
  priority: z.string(),
  category: z.string().optional(),
  origin: z.string(),
  account_id: z.string().optional(),
  contact_id: z.string().optional(),
  resolution: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CaseFormProps {
  case?: Case;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialAccountId?: string;
}

export const CaseForm = ({ case: caseData, onSubmit, onCancel, initialAccountId }: CaseFormProps) => {
  const { accounts } = useAccounts();
  const { contacts } = useContacts();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      case_number: "",
      subject: "",
      description: "",
      status: "New",
      priority: "Normal",
      category: "",
      origin: "Email",
      account_id: initialAccountId || "",
      contact_id: "",
      resolution: "",
    },
  });

  useEffect(() => {
    if (caseData) {
      form.reset({
        case_number: caseData.case_number || "",
        subject: caseData.subject || "",
        description: caseData.description || "",
        status: caseData.status || "New",
        priority: caseData.priority || "Normal",
        category: caseData.category || "",
        origin: caseData.origin || "Email",
        account_id: caseData.account_id || "",
        contact_id: caseData.contact_id || "",
        resolution: caseData.resolution || "",
      });
    } else {
      form.reset({
        case_number: "",
        subject: "",
        description: "",
        status: "New",
        priority: "Normal",
        category: "",
        origin: "Email",
        account_id: initialAccountId || "",
        contact_id: "",
        resolution: "",
      });
    }
  }, [caseData, form]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (data: FormData) => {
    const { case_number, ...rest } = data;
    
    // Convert empty strings to null for UUID fields
    const cleanedData = {
      ...rest,
      account_id: rest.account_id || null,
      contact_id: rest.contact_id || null,
      category: rest.category || null,
    };
    
    setUploadingFiles(true);
    try {
      // Submit the case first
      const casePayload = caseData 
        ? { case_id: caseData.case_id, ...cleanedData }
        : cleanedData;
      
      await onSubmit(casePayload);

      // Upload files if any
      if (selectedFiles.length > 0 && caseData?.case_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data: profile } = await supabase
          .from("profile")
          .select("tenant_id")
          .eq("id", user.id)
          .single();

        if (!profile) throw new Error("Profile not found");

        for (const file of selectedFiles) {
          const fileExt = file.name.split(".").pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${profile.tenant_id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("documents")
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          await supabase.from("documents").insert({
            name: file.name,
            file_type: file.type,
            file_size: file.size,
            storage_path: filePath,
            owner_user_id: user.id,
            tenant_id: profile.tenant_id,
            related_to_type: "case",
            related_to_id: caseData.case_id,
          } as any);
        }
        
        toast.success(`Uploaded ${selectedFiles.length} file(s)`);
        setSelectedFiles([]);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to upload files");
    } finally {
      setUploadingFiles(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="case_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Case Number</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  readOnly 
                  placeholder={caseData?.case_number || "Will be auto-generated"}
                  className="bg-muted"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Brief description of the issue" />
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
                <Textarea 
                  {...field} 
                  placeholder="Detailed description of the case (HTML supported for email content)" 
                  className="font-mono text-sm min-h-[150px] max-h-[400px] resize-y"
                  style={{ height: 'auto' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 400) + 'px';
                  }}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">
                HTML formatting is supported. You can paste email content directly.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Waiting on Customer">Waiting on Customer</SelectItem>
                    <SelectItem value="Waiting on Third Party">Waiting on Third Party</SelectItem>
                    <SelectItem value="Escalated">Escalated</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="Billing">Billing</SelectItem>
                    <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                    <SelectItem value="Feature Request">Feature Request</SelectItem>
                    <SelectItem value="Bug Report">Bug Report</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="origin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Origin</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Phone">Phone</SelectItem>
                    <SelectItem value="Web">Web</SelectItem>
                    <SelectItem value="Chat">Chat</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="account_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
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
            name="contact_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {contacts?.map((contact) => (
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

        {(caseData?.status === "Resolved" || caseData?.status === "Closed") && (
          <FormField
            control={form.control}
            name="resolution"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Resolution</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="How was this case resolved?" rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="space-y-2">
          <FormLabel>Attachments</FormLabel>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="flex-1"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <Upload className="h-4 w-4 text-muted-foreground" />
          </div>
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <FileIcon className="h-4 w-4" />
                  <span className="text-sm flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={uploadingFiles}>
            {uploadingFiles ? "Uploading..." : caseData ? "Update Case" : "Create Case"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
