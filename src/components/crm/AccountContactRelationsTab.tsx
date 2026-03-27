import { useState } from "react";
import { useAccountContactRelations } from "@/hooks/useAccountContactRelations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

interface AccountContactRelationsTabProps {
  accountId: string;
}

const emptyForm = {
  contact_id: "",
  connection_role: "",
  is_direct: false,
};

export const AccountContactRelationsTab = ({
  accountId,
}: AccountContactRelationsTabProps) => {
  const {
    contactRelations,
    isLoading,
    createRelation,
    updateRelation,
    deleteRelation,
    isCreating,
  } = useAccountContactRelations(accountId);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = () => {
    if (!form.contact_id.trim()) {
      toast.error("Contact ID is required");
      return;
    }

    createRelation(
      {
        contact_id: form.contact_id,
        connection_role: form.connection_role || null,
        is_direct: form.is_direct,
        is_active: true,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setForm(emptyForm);
        },
      }
    );
  };

  const handleToggleActive = (acr_id: string, currentValue: boolean) => {
    updateRelation({ acr_id, is_active: !currentValue });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact Relation
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : contactRelations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contact relations found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Connection Role</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Direct</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contactRelations.map((acr) => {
              const fullName = acr.contact
                ? `${acr.contact.first_name} ${acr.contact.last_name}`.trim()
                : acr.contact_id;
              return (
                <TableRow key={acr.acr_id}>
                  <TableCell className="font-medium">{fullName}</TableCell>
                  <TableCell>{acr.contact?.email ?? "—"}</TableCell>
                  <TableCell>{acr.contact?.title ?? "—"}</TableCell>
                  <TableCell>{acr.connection_role ?? "—"}</TableCell>
                  <TableCell>
                    {acr.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {acr.is_direct ? (
                      <Badge variant="outline">Direct</Badge>
                    ) : (
                      <Badge variant="secondary">Indirect</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={acr.is_active ? "Deactivate" : "Activate"}
                        onClick={() => handleToggleActive(acr.acr_id, acr.is_active)}
                      >
                        {acr.is_active ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteRelation(acr.acr_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact Relation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="contact_id">Contact ID</Label>
              <Input
                id="contact_id"
                name="contact_id"
                value={form.contact_id}
                onChange={handleChange}
                placeholder="Contact UUID"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="connection_role">Role</Label>
              <Input
                id="connection_role"
                name="connection_role"
                value={form.connection_role}
                onChange={handleChange}
                placeholder="e.g. Billing Contact"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="is_direct"
                name="is_direct"
                type="checkbox"
                checked={form.is_direct}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_direct">Direct Relation</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isCreating}>
              {isCreating ? "Adding..." : "Add Relation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
