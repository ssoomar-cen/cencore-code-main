import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant?: {
    tenant_id: string;
    name: string;
    domain: string | null;
    is_active: boolean;
    plan_type: string | null;
  } | null;
}

export function TenantFormDialog({ open, onOpenChange, tenant }: TenantFormDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [planType, setPlanType] = useState("free");

  const isEditing = !!tenant;

  useEffect(() => {
    if (open && tenant) {
      setName(tenant.name);
      setDomain(tenant.domain || "");
      setIsActive(tenant.is_active);
      setPlanType(tenant.plan_type || "free");
    } else if (open && !tenant) {
      // Reset form for new tenant
      setName("");
      setDomain("");
      setIsActive(true);
      setPlanType("free");
    }
  }, [open, tenant]);

  const saveTenantMutation = useMutation({
    mutationFn: async (values: {
      name: string;
      domain: string;
      is_active: boolean;
      plan_type: string;
    }) => {
      if (isEditing) {
        const { error } = await supabase
          .from("tenant")
          .update(values)
          .eq("tenant_id", tenant.tenant_id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tenant")
          .insert([values]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success(isEditing ? "Tenant updated successfully" : "Tenant created successfully");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to ${isEditing ? "update" : "create"} tenant: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Tenant name is required");
      return;
    }

    saveTenantMutation.mutate({
      name: name.trim(),
      domain: domain.trim() || null,
      is_active: isActive,
      plan_type: planType,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Tenant" : "Add New Tenant"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update tenant information"
              : "Create a new tenant organization"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tenant Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Acme Corporation"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g., acmecorp.com"
            />
            <p className="text-xs text-muted-foreground">
              Email domain for auto-assigning users to this tenant
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="planType">Plan Type</Label>
            <Select value={planType} onValueChange={setPlanType}>
              <SelectTrigger id="planType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Active Status</Label>
              <p className="text-xs text-muted-foreground">
                Inactive tenants cannot access the system
              </p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveTenantMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveTenantMutation.isPending}
            >
              {saveTenantMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : (
                isEditing ? "Update Tenant" : "Create Tenant"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
