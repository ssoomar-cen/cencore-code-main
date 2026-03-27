import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export interface BulkEditField {
  name: string;
  label: string;
  type: "text" | "select" | "date" | "number";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  fields: BulkEditField[];
  selectedCount: number;
  onSave: (values: Record<string, any>) => Promise<void>;
  isLoading?: boolean;
}

export function BulkEditDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  selectedCount,
  onSave,
  isLoading,
}: BulkEditDialogProps) {
  const [values, setValues] = useState<Record<string, any>>({});

  const handleSave = async () => {
    // Only send fields that have been changed
    const changedValues = Object.entries(values).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== "") {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    if (Object.keys(changedValues).length > 0) {
      await onSave(changedValues);
      setValues({});
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description.replace("{count}", String(selectedCount))}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Only fields you modify will be updated. Empty fields will be ignored.
          </p>

          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              
              {field.type === "select" && field.options ? (
                <Select
                  value={values[field.name] || ""}
                  onValueChange={(value) =>
                    setValues((prev) => ({ ...prev, [field.name]: value }))
                  }
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder={field.placeholder || "Select..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={values[field.name] || ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                  }
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setValues({});
              onOpenChange(false);
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update {selectedCount} {selectedCount === 1 ? "Item" : "Items"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
