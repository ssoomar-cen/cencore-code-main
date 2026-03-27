import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { UserCog } from "lucide-react";

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface UserImpersonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserImpersonationDialog({ open, onOpenChange }: UserImpersonationDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { startImpersonation } = useImpersonation();

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_tenant_users");

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    const selectedUser = users.find(u => u.id === selectedUserId);
    if (!selectedUser) return;

    const displayName = selectedUser.first_name && selectedUser.last_name
      ? `${selectedUser.first_name} ${selectedUser.last_name}`
      : selectedUser.email;

    setLoading(true);
    try {
      const success = await startImpersonation(selectedUserId, displayName);
      if (!success) {
        toast.error("Failed to start impersonation. You may not have permission to impersonate this user.");
        setLoading(false);
      }
      // If successful, page will reload
    } catch (error) {
      console.error("Error starting impersonation:", error);
      toast.error("Failed to start impersonation");
      setLoading(false);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Impersonate User
          </DialogTitle>
          <DialogDescription>
            View the system as another user. This will reload the page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-select">Select User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger id="user-select">
                <SelectValue placeholder="Choose a user to impersonate" />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <SelectItem value="_loading" disabled>
                    Loading users...
                  </SelectItem>
                ) : users.length === 0 ? (
                  <SelectItem value="_empty" disabled>
                    No other users found
                  </SelectItem>
                ) : (
                  users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : user.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
            <p className="text-sm text-foreground">
              <strong>Note:</strong> You will see the system from this user's perspective, 
              including their data, permissions, and access levels.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImpersonate}
              disabled={!selectedUserId || loading}
            >
              Start Impersonating
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
