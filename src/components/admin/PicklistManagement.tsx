import { useState, useMemo } from "react";
import { usePicklistAdmin, PicklistOption } from "@/hooks/usePicklistOptions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, ListFilter } from "lucide-react";

const ENTITY_LABELS: Record<string, string> = {
  contacts: "Contacts",
  accounts: "Organizations",
  opportunities: "Opportunities",
  leads: "Leads",
};

export default function PicklistManagement() {
  const { data, isLoading, create, update, remove } = usePicklistAdmin();
  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [filterField, setFilterField] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PicklistOption | null>(null);
  const [form, setForm] = useState({ entity: "", field: "", value: "", label: "", sort_order: 0, is_active: true });

  const entities = useMemo(() => {
    const set = new Set((data || []).map((o) => o.entity));
    return Array.from(set).sort();
  }, [data]);

  const fields = useMemo(() => {
    const filtered = filterEntity === "all" ? data || [] : (data || []).filter((o) => o.entity === filterEntity);
    const set = new Set(filtered.map((o) => o.field));
    return Array.from(set).sort();
  }, [data, filterEntity]);

  const filtered = useMemo(() => {
    let result = data || [];
    if (filterEntity !== "all") result = result.filter((o) => o.entity === filterEntity);
    if (filterField !== "all") result = result.filter((o) => o.field === filterField);
    return result;
  }, [data, filterEntity, filterField]);

  const openCreate = () => {
    setEditing(null);
    setForm({ entity: filterEntity !== "all" ? filterEntity : "", field: filterField !== "all" ? filterField : "", value: "", label: "", sort_order: 0, is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (opt: PicklistOption) => {
    setEditing(opt);
    setForm({ entity: opt.entity, field: opt.field, value: opt.value, label: opt.label, sort_order: opt.sort_order, is_active: opt.is_active });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.entity || !form.field || !form.value || !form.label) return;
    if (editing) {
      update.mutate({ id: editing.id, ...form });
    } else {
      create.mutate({ ...form, tenant_id: null });
    }
    setDialogOpen(false);
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListFilter className="h-5 w-5" /> Picklist Management
        </CardTitle>
        <CardDescription>Manage dropdown options for all CRM entities (contact types, lead sources, stages, etc.)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <Label className="text-xs">Entity</Label>
            <Select value={filterEntity} onValueChange={(v) => { setFilterEntity(v); setFilterField("all"); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entities.map((e) => <SelectItem key={e} value={e}>{ENTITY_LABELS[e] || e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Field</Label>
            <Select value={filterField} onValueChange={setFilterField}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fields</SelectItem>
                {fields.map((f) => <SelectItem key={f} value={f}>{f.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Option</Button>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Label</TableHead>
                <TableHead className="w-16">Order</TableHead>
                <TableHead className="w-16">Active</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No options found</TableCell></TableRow>
              ) : (
                filtered.map((opt) => (
                  <TableRow key={opt.id}>
                    <TableCell><Badge variant="outline">{ENTITY_LABELS[opt.entity] || opt.entity}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{opt.field}</TableCell>
                    <TableCell className="font-mono text-xs">{opt.value}</TableCell>
                    <TableCell>{opt.label}</TableCell>
                    <TableCell>{opt.sort_order}</TableCell>
                    <TableCell>
                      <Switch
                        checked={opt.is_active}
                        onCheckedChange={(checked) => update.mutate({ id: opt.id, is_active: checked })}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(opt)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(opt.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Option" : "Add Option"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Entity</Label>
                <Input value={form.entity} onChange={(e) => setForm({ ...form, entity: e.target.value })} placeholder="e.g. contacts" />
              </div>
              <div>
                <Label>Field</Label>
                <Input value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} placeholder="e.g. contact_type" />
              </div>
              <div>
                <Label>Value</Label>
                <Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="stored value" />
              </div>
              <div>
                <Label>Label</Label>
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="display label" />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.entity || !form.field || !form.value || !form.label}>
                {editing ? "Save" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
