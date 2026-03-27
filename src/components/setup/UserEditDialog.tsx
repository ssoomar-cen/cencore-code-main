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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone?: string | null;
    role?: string;
  } | null;
}

export function UserEditDialog({ open, onOpenChange, user }: UserEditDialogProps) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    if (open && user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setPhone(user.phone || "");
      setRole(user.role || "user");
    }
  }, [open, user]);

  const updateUserMutation = useMutation({
    mutationFn: async (values: { first_name: string; last_name: string; phone: string; role: string }) => {
      if (!user) return;
      
      // Update profile
      const { error: profileError } = await supabase
        .from("profile")
        .update({
          first_name: values.first_name,
          last_name: values.last_name,
          phone: values.phone,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update role - cast to app_role enum type
      const { error: roleError } = await supabase
        .from("user_role")
        .update({ role: values.role as any })
        .eq("user_id", user.id);

      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      queryClient.invalidateQueries({ queryKey: ["all-tenant-users"] });
      toast.success("User updated successfully");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update user: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserMutation.mutate({
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      role: role,
    });
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information for {user.email}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
