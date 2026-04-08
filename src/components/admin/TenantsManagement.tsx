import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Building, Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

type Tenant = {
  id: string;
  name: string;
  domain: string | null;
  status: string;
  plan: string;
  max_users: number;
  current_users: number;
  contact_email: string | null;
  contact_name: string | null;
  notes: string | null;
  created_at: string;
};

export default function TenantsManagement() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ name: "", domain: "", status: "active", plan: "standard", max_users: "50", contact_email: "", contact_name: "" });

  useEffect(() => { loadTenants(); }, []);

  const loadTenants = async () => {
    setLoading(true);
    const { data } = await supabase.from("tenants").select("*").order("name");
    if (data) setTenants(data as any);
    setLoading(false);
  };

  const openNew = () => {
    setEditItem(null);
    setForm({ name: "", domain: "", status: "active", plan: "standard", max_users: "50", contact_email: "", contact_name: "" });
    setEditOpen(true);
  };

  const openEdit = (t: Tenant) => {
    setEditItem(t);
    setForm({ name: t.name, domain: t.domain || "", status: t.status, plan: t.plan, max_users: String(t.max_users), contact_email: t.contact_email || "", contact_name: t.contact_name || "" });
    setEditOpen(true);
  };

  const save = async () => {
    const payload = { name: form.name, domain: form.domain || null, status: form.status, plan: form.plan, max_users: parseInt(form.max_users) || 50, contact_email: form.contact_email || null, contact_name: form.contact_name || null } as any;
    if (editItem) {
      const { error } = await supabase.from("tenants").update(payload).eq("id", editItem.id);
      if (error) toast.error("Failed to save"); else toast.success("Tenant updated");
    } else {
      const { error } = await supabase.from("tenants").insert(payload);
      if (error) toast.error("Failed to create"); else toast.success("Tenant created");
    }
    setEditOpen(false);
    loadTenants();
  };

  const deleteTenant = async (id: string) => {
    const { error } = await supabase.from("tenants").delete().eq("id", id);
    if (error) toast.error("Failed to delete"); else { toast.success("Deleted"); loadTenants(); }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "bg-success text-white";
      case "suspended": return "bg-warning text-white";
      case "inactive": return "bg-muted text-muted-foreground";
      default: return "";
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5 text-primary" />Tenants Management</CardTitle>
            <CardDescription>Manage organizations and their access plans</CardDescription>
          </div>
          <Button onClick={openNew} className="gap-2 w-full sm:w-auto"><Plus className="h-4 w-4" />New Tenant</Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Plan</TableHead>
                  <TableHead className="hidden lg:table-cell">Users</TableHead>
                  <TableHead className="hidden lg:table-cell">Contact</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{t.domain || "—"}</TableCell>
                    <TableCell><Badge className={`text-xs ${statusColor(t.status)} capitalize`}>{t.status}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-xs capitalize">{t.plan}</Badge></TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{t.current_users}/{t.max_users}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{t.contact_email || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteTenant(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {tenants.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No tenants configured</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Edit Tenant" : "New Tenant"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Domain</Label><Input value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} placeholder="company.com" /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={form.plan} onValueChange={v => setForm({ ...form, plan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Max Users</Label><Input type="number" value={form.max_users} onChange={e => setForm({ ...form, max_users: e.target.value })} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Contact Name</Label><Input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Contact Email</Label><Input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
