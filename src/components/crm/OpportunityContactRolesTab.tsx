import { useState } from "react";
import { useOpportunityContactRoles } from "@/hooks/useOpportunityContactRoles";
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
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface OpportunityContactRolesTabProps {
  opportunityId: string;
}

const emptyForm = {
  contact_id: "",
  role: "",
  is_primary: false,
};

export const OpportunityContactRolesTab = ({
  opportunityId,
}: OpportunityContactRolesTabProps) => {
  const { contactRoles, isLoading, createRole, deleteRole, isCreating } =
    useOpportunityContactRoles(opportunityId);

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

    createRole(
      {
        contact_id: form.contact_id,
        role: form.role || null,
        is_primary: form.is_primary,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setForm(emptyForm);
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact Role
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : contactRoles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contact roles found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Primary</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contactRoles.map((ocr) => {
              const fullName = ocr.contact
                ? `${ocr.contact.first_name} ${ocr.contact.last_name}`.trim()
                : ocr.contact_id;
              return (
                <TableRow key={ocr.ocr_id}>
                  <TableCell className="font-medium">{fullName}</TableCell>
                  <TableCell>{ocr.contact?.email ?? "—"}</TableCell>
                  <TableCell>{ocr.contact?.title ?? "—"}</TableCell>
                  <TableCell>{ocr.role ?? "—"}</TableCell>
                  <TableCell>
                    {ocr.is_primary ? (
                      <Badge variant="default">Primary</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteRole(ocr.ocr_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
            <DialogTitle>Add Contact Role</DialogTitle>
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
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                name="role"
                value={form.role}
                onChange={handleChange}
                placeholder="e.g. Decision Maker"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="is_primary"
                name="is_primary"
                type="checkbox"
                checked={form.is_primary}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_primary">Is Primary</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isCreating}>
              {isCreating ? "Adding..." : "Add Contact Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
