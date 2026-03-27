import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Loader2 } from "lucide-react";

interface ReassignOwnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentOwnerId: string | null;
  onReassign: (newOwnerId: string) => void;
  isReassigning?: boolean;
}

export const ReassignOwnerDialog = ({
  open,
  onOpenChange,
  currentOwnerId,
  onReassign,
  isReassigning = false,
}: ReassignOwnerDialogProps) => {
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(currentOwnerId || "");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["tenant-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_tenant_users");
      if (error) throw error;
      return data as Array<{
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
      }>;
    },
    enabled: open,
  });

  const handleReassign = () => {
    if (selectedOwnerId && selectedOwnerId !== currentOwnerId) {
      onReassign(selectedOwnerId);
    }
  };

  const getUserDisplayName = (user: any) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    return user.email;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign Owner</DialogTitle>
          <DialogDescription>
            Select a new owner for this record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="owner">New Owner</Label>
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Select
                value={selectedOwnerId}
                onValueChange={setSelectedOwnerId}
              >
                <SelectTrigger id="owner">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {getUserDisplayName(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isReassigning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReassign}
            disabled={
              !selectedOwnerId ||
              selectedOwnerId === currentOwnerId ||
              isReassigning
            }
          >
            {isReassigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reassign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
