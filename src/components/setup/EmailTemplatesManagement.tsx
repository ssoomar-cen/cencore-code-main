import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const EmailTemplatesManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body_html: "",
    category: "invoice",
  });

  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { error } = await supabase
        .from("email_templates")
        .insert({
          ...template,
          user_id: user.id,
          tenant_id: profile.tenant_id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Email template created successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create template");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...template }: any) => {
      const { error } = await supabase
        .from("email_templates")
        .update(template)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Email template updated successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update template");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Email template deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete template");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      subject: "",
      body_html: "",
      category: "invoice",
    });
    setEditingTemplate(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body_html: template.body_html,
      category: template.category,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Email Templates</CardTitle>
            <CardDescription>
              Create and manage email templates for invoices and other communications
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? "Edit Template" : "Create Email Template"}
                </DialogTitle>
                <DialogDescription>
                  Create a custom email template for your communications. Use variables like {`{{invoice_number}}`}, {`{{payment_url}}`}, {`{{company_name}}`}, etc.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Invoice Payment Reminder"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                      <SelectItem value="confirmation">Confirmation</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subject">Email Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g., Invoice {{invoice_number}} - Payment Required"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="body_html">Email Body (HTML)</Label>
                  <Textarea
                    id="body_html"
                    value={formData.body_html}
                    onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
                    placeholder="Enter your HTML email template here..."
                    rows={10}
                    className="font-mono text-sm"
                    required
                  />
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <div>
                      <strong>Available Variables:</strong> You can use either <code className="text-xs">{`{variable}`}</code> or <code className="text-xs">{`{{variable}}`}</code> format.
                    </div>
                    <div className="text-xs space-y-1">
                      <div><code>{`{invoice_number}`}</code> - Invoice number</div>
                      <div><code>{`{payment_url}`}</code> - <strong className="text-primary">Payment link (IMPORTANT: Include this!)</strong></div>
                      <div><code>{`{company_name}`}</code> - Your company name</div>
                      <div><code>{`{account_name}`}</code> - Customer company name</div>
                      <div><code>{`{primary_contact}`}</code> - Primary contact person name</div>
                      <div><code>{`{total_amount}`}</code> - Total amount with $</div>
                      <div><code>{`{issue_date}`}</code> - Invoice issue date</div>
                      <div><code>{`{due_date}`}</code> - Payment due date</div>
                      <div><code>{`{support_email}`}</code> - Support email</div>
                      <div><code>{`{support_phone}`}</code> - Support phone</div>
                    </div>
                    <div className="text-xs border-t pt-2 mt-2">
                      <strong>HTML Formatting Tips:</strong> Use HTML tags for structure: <code>&lt;p&gt;</code> for paragraphs, <code>&lt;br&gt;</code> for line breaks, <code>&lt;strong&gt;</code> for bold, <code>&lt;table&gt;</code> for tables.
                    </div>
                    <div className="text-xs border-t pt-2 mt-2">
                      <strong>Example Template:</strong>
                      <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
{`<p>Hi {primary_contact},</p>

<p>Thank you for your business. Please find your invoice details below:</p>

<table style="margin: 20px 0;">
  <tr><td><strong>Invoice Number:</strong></td><td>{invoice_number}</td></tr>
  <tr><td><strong>Issue Date:</strong></td><td>{issue_date}</td></tr>
  <tr><td><strong>Due Date:</strong></td><td>{due_date}</td></tr>
  <tr><td><strong>Total Amount:</strong></td><td>{total_amount}</td></tr>
</table>

<p>You can view and pay your invoice using the button below:</p>

<p><a href="{payment_url}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">View & Pay Invoice</a></p>

<p>If you have any questions, please contact us.</p>

<p>Best regards,<br>{company_name}</p>`}
                      </pre>
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingTemplate ? "Update" : "Create"} Template
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Loading templates...</p>
        ) : !templates?.length ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No email templates created yet.</p>
            <p className="text-sm text-muted-foreground">
              Create your first template to customize invoice emails and other communications.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{template.category}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate">{template.subject}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
