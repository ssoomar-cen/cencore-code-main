import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type AppRole =
  | "admin"
  | "manager"
  | "user"
  | "client"
  | "finance"
  | "marketing"
  | "sales"
  | "hr"
  | "operations"
  | "contractor";

interface UserInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type InviteFunctionResponse = {
  invite?: { id: string; email: string };
  user?: { id: string; email: string; temporary_password?: string; is_demo_user?: boolean };
};

const getFunctionErrorMessage = async (error: unknown): Promise<string> => {
  const fallback = error instanceof Error ? error.message : "Request failed";
  const err = error as any;
  const response = err?.context;
  if (!response) return fallback;

  try {
    const payload = await response.clone().json();
    if (typeof payload?.error === "string" && payload.error.trim()) {
      return payload.error;
    }
    if (typeof payload?.message === "string" && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    try {
      const text = await response.clone().text();
      if (text?.trim()) return text;
    } catch {
      // ignore parse failures and return fallback below
    }
  }

  return fallback;
};

export function UserInviteDialog({ open, onOpenChange }: UserInviteDialogProps) {
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AppRole>("user");
  const [createDemoUser, setCreateDemoUser] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");

  useEffect(() => {
    if (!open) {
      setEmail("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setRole("user");
      setCreateDemoUser(false);
      setTemporaryPassword("");
    }
  }, [open]);

  const inviteUserMutation = useMutation({
    mutationFn: async () => {
      if (!isAdmin) {
        throw new Error("Only admins can add users.");
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (!createDemoUser && !normalizedEmail) {
        throw new Error("Email is required.");
      }

      const { data, error } = await supabase.functions.invoke<InviteFunctionResponse>("manage-user-invites", {
        body: {
          action: createDemoUser ? "create_demo_user" : "invite",
          email: normalizedEmail || undefined,
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          phone: phone.trim() || null,
          role,
          temporary_password: createDemoUser ? (temporaryPassword.trim() || null) : null,
        },
      });

      if (error) {
        const detail = await getFunctionErrorMessage(error);
        throw new Error(detail);
      }

      return data ?? {};
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      queryClient.invalidateQueries({ queryKey: ["pending-user-invites"] });

      if (createDemoUser) {
        const generatedPassword = data?.user?.temporary_password;
        if (generatedPassword) {
          try {
            await navigator.clipboard.writeText(generatedPassword);
            toast.success(`Demo user created. Password copied to clipboard: ${generatedPassword}`);
          } catch {
            toast.success(`Demo user created. Temporary password: ${generatedPassword}`);
          }
        } else {
          toast.success("Demo user created");
        }
      } else {
        toast.success("User invite created");
      }
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add user: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteUserMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>
            {createDemoUser
              ? "Create a demo user directly (no email invite will be sent)."
              : "Create a user invite for this tenant."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2 rounded-md border p-3">
            <Checkbox
              id="create-demo-user"
              checked={createDemoUser}
              onCheckedChange={(checked) => setCreateDemoUser(Boolean(checked))}
            />
            <Label htmlFor="create-demo-user" className="cursor-pointer">
              Create demo user (no email required)
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={createDemoUser ? "optional@demo.invalid" : "name@company.com"}
              required={!createDemoUser}
            />
            {createDemoUser && (
              <p className="text-xs text-muted-foreground">
                Leave blank to auto-generate a `.invalid` demo email.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invite-first-name">First Name</Label>
              <Input
                id="invite-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-last-name">Last Name</Label>
              <Input
                id="invite-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-phone">Phone Number</Label>
            <Input
              id="invite-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(value: AppRole) => setRole(value)}>
              <SelectTrigger id="invite-role">
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
                <SelectItem value="contractor">Contractor</SelectItem>
                <SelectItem value="client">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {createDemoUser && (
            <div className="space-y-2">
              <Label htmlFor="demo-password">Temporary Password (optional)</Label>
              <Input
                id="demo-password"
                type="text"
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
                placeholder="Auto-generated if left blank"
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={inviteUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={inviteUserMutation.isPending}>
              {inviteUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {createDemoUser ? "Creating..." : "Adding..."}
                </>
              ) : (
                createDemoUser ? "Create Demo User" : "Add User"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
