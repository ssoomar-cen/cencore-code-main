import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Mail, Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string | null;
  is_active: boolean;
  variables: string[];
};

const CATEGORIES = ["onboarding", "security", "notifications", "sales", "operations", "finance", "general"];

export default function EmailTemplatesManagement() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState({ name: "", subject: "", body: "", category: "general", variables: "" });

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    setLoading(true);
    const { data } = await supabase.from("email_templates").select("*").order("category").order("name");
    if (data) setTemplates(data as any);
    setLoading(false);
  };

  const openNew = () => {
    setEditItem(null);
    setForm({ name: "", subject: "", body: "", category: "general", variables: "" });
    setEditOpen(true);
  };

  const openEdit = (t: EmailTemplate) => {
    setEditItem(t);
    setForm({ name: t.name, subject: t.subject, body: t.body, category: t.category || "general", variables: t.variables?.join(", ") || "" });
    setEditOpen(true);
  };

  const save = async () => {
    const vars = form.variables.split(",").map(v => v.trim()).filter(Boolean);
    const payload = { name: form.name, subject: form.subject, body: form.body, category: form.category, variables: vars } as any;

    if (editItem) {
      const { error } = await supabase.from("email_templates").update(payload).eq("id", editItem.id);
      if (error) toast.error("Failed to save"); else toast.success("Template updated");
    } else {
      const { error } = await supabase.from("email_templates").insert(payload);
      if (error) toast.error("Failed to create"); else toast.success("Template created");
    }
    setEditOpen(false);
    loadTemplates();
  };

  const toggleActive = async (t: EmailTemplate) => {
    await supabase.from("email_templates").update({ is_active: !t.is_active } as any).eq("id", t.id);
    setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, is_active: !x.is_active } : x));
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from("email_templates").delete().eq("id", id);
    if (error) toast.error("Failed to delete"); else { toast.success("Deleted"); loadTemplates(); }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" />Email Templates</CardTitle>
            <CardDescription>Manage notification and transactional email templates</CardDescription>
          </div>
          <Button onClick={openNew} className="gap-2 w-full sm:w-auto"><Plus className="h-4 w-4" />New Template</Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="hidden sm:table-cell">Variables</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{t.subject}</TableCell>
                    <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-xs capitalize">{t.category}</Badge></TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {t.variables?.slice(0, 3).map(v => <Badge key={v} variant="secondary" className="text-[10px]">{`{{${v}}}`}</Badge>)}
                        {(t.variables?.length || 0) > 3 && <Badge variant="secondary" className="text-[10px]">+{t.variables.length - 3}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center"><Switch checked={t.is_active} onCheckedChange={() => toggleActive(t)} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteTemplate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {templates.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No templates</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "Edit Template" : "New Template"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Subject</Label><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Use {{variable}} for dynamic values" /></div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Body</Label><Textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={8} placeholder="Email body with {{variables}}" /></div>
            <div className="space-y-2"><Label>Variables (comma-separated)</Label><Input value={form.variables} onChange={e => setForm({ ...form, variables: e.target.value })} placeholder="first_name, company_name" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.name || !form.subject}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
