import { useState } from "react";
import { useOpportunityLineItems } from "@/hooks/useOpportunityLineItems";
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
import { Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface OpportunityLineItemsTabProps {
  opportunityId: string;
}

const formatCurrency = (val: number | null | undefined) => {
  if (val == null) return "—";
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
};

const emptyForm = {
  name: "",
  description: "",
  product_code: "",
  quantity: "",
  unit_price: "",
  discount: "",
  service_date: "",
};

export const OpportunityLineItemsTab = ({ opportunityId }: OpportunityLineItemsTabProps) => {
  const { lineItems, isLoading, createItem, deleteItem, isCreating } =
    useOpportunityLineItems(opportunityId);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    createItem(
      {
        name: form.name || null,
        description: form.description || null,
        product_code: form.product_code || null,
        quantity: form.quantity !== "" ? parseFloat(form.quantity) : null,
        unit_price: form.unit_price !== "" ? parseFloat(form.unit_price) : null,
        discount: form.discount !== "" ? parseFloat(form.discount) : null,
        service_date: form.service_date || null,
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
          Add Line Item
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : lineItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">No line items found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name / Description</TableHead>
              <TableHead>Product Code</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Discount %</TableHead>
              <TableHead className="text-right">Total Price</TableHead>
              <TableHead>Service Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((item) => (
              <TableRow key={item.opp_line_item_id}>
                <TableCell>
                  <div className="font-medium">{item.name ?? "—"}</div>
                  {item.description && (
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  )}
                </TableCell>
                <TableCell>{item.product_code ?? "—"}</TableCell>
                <TableCell className="text-right">{item.quantity ?? "—"}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                <TableCell className="text-right">
                  {item.discount != null ? `${item.discount}%` : "—"}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(item.total_price)}</TableCell>
                <TableCell>
                  {item.service_date
                    ? format(new Date(item.service_date), "MMM d, yyyy")
                    : "—"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteItem(item.opp_line_item_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Line Item</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Line item name"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Description"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="product_code">Product Code</Label>
              <Input
                id="product_code"
                name="product_code"
                value={form.product_code}
                onChange={handleChange}
                placeholder="SKU / code"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="service_date">Service Date</Label>
              <Input
                id="service_date"
                name="service_date"
                type="date"
                value={form.service_date}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                value={form.quantity}
                onChange={handleChange}
                placeholder="0"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="unit_price">Unit Price</Label>
              <Input
                id="unit_price"
                name="unit_price"
                type="number"
                value={form.unit_price}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="discount">Discount (%)</Label>
              <Input
                id="discount"
                name="discount"
                type="number"
                value={form.discount}
                onChange={handleChange}
                placeholder="0"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isCreating}>
              {isCreating ? "Adding..." : "Add Line Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
