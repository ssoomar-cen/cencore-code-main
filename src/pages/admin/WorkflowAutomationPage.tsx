import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Workflow, Zap } from "lucide-react";

const entityOptions = [
  "accounts", "contacts", "leads", "opportunities", "quotes",
  "contracts", "invoices", "activities",
];

const triggerOptions = [
  { label: "On Create", value: "create" },
  { label: "On Update", value: "update" },
  { label: "On Delete", value: "delete" },
];

export default function WorkflowAutomationPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", entity_type: "", trigger_event: "create", is_active: true });

  const { data: rules, isLoading } = useQuery({
    queryKey: ["workflow_rules"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("workflow_rules").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (rule: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("workflow_rules").insert({ ...rule, user_id: user?.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["workflow_rules"] }); toast.success("Rule created"); resetForm(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await (supabase as any).from("workflow_rules").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["workflow_rules"] }); toast.success("Rule updated"); resetForm(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("workflow_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["workflow_rules"] }); toast.success("Rule deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from("workflow_rules").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["workflow_rules"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetForm = () => { setForm({ name: "", description: "", entity_type: "", trigger_event: "create", is_active: true }); setEditItem(null); setDialogOpen(false); };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ name: item.name, description: item.description || "", entity_type: item.entity_type, trigger_event: item.trigger_event, is_active: item.is_active });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.entity_type) { toast.error("Name and entity are required"); return; }
    if (editItem) update.mutate({ id: editItem.id, ...form });
    else create.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Workflow Automation</h2>
          <p className="text-muted-foreground">Create rules to automate business processes</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Rule
        </Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : !rules?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Workflow className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No workflow rules yet. Click "Add Rule" to create your first automation.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule: any) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{rule.entity_type}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{rule.trigger_event}</Badge></TableCell>
                  <TableCell>
                    <Switch checked={rule.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: rule.id, is_active: v })} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(rule.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(rule.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={o => { if (!o) resetForm(); setDialogOpen(o); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Edit Rule" : "New Workflow Rule"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Rule name" /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does this rule do?" /></div>
            <div className="space-y-1.5"><Label>Entity</Label>
              <Select value={form.entity_type} onValueChange={v => setForm({ ...form, entity_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
                <SelectContent>{entityOptions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Trigger</Label>
              <Select value={form.trigger_event} onValueChange={v => setForm({ ...form, trigger_event: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{triggerOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleSubmit}>{editItem ? "Save" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
