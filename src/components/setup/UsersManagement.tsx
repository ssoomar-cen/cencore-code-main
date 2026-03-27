import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";
import { Users as UsersIcon, Edit, UserPlus } from "lucide-react";
import { useState } from "react";
import { UserEditDialog } from "./UserEditDialog";
import { UserInviteDialog } from "./UserInviteDialog";
import { useUserRole } from "@/hooks/useUserRole";

interface UserWithRole {
  user_id: string;
  role: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone?: string | null;
  created_at: string;
}

interface PendingInvite {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string | null;
  created_at: string | null;
  expires_at?: string | null;
}

export function UsersManagement() {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const { isAdmin } = useUserRole();

  // Set up realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('users-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profile' },
        (payload) => {
          console.log('Profile changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_role' },
        (payload) => {
          console.log('User role changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
        }
      )
      .subscribe((status) => {
        console.log('Users realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Demo users for visual display - removed deleted users
  const demoUsers: UserWithRole[] = [];

  const { data: users, isLoading } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      // Get all tenant users with their emails and phone using RPC
      const { data: tenantUsers, error: usersError } = await supabase
        .rpc("get_tenant_users");

      if (usersError) throw usersError;
      
      // Get roles for each user
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_role")
        .select("*");

      if (rolesError) throw rolesError;

      // Combine user data with roles
      const usersWithRoles: UserWithRole[] = (tenantUsers || []).map((user: any) => {
        const userRole = userRoles?.find((role) => role.user_id === user.id);
        return {
          user_id: user.id,
          role: userRole?.role || 'user',
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          created_at: user.created_at,
        };
      });

      // Merge real users with demo users
      return [...usersWithRoles, ...demoUsers] as UserWithRole[];
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      newRole,
    }: {
      userId: string;
      newRole: "admin" | "user" | "manager" | "sales" | "marketing" | "finance" | "hr" | "operations" | "contractor";
    }) => {
      // Prevent updating demo users
      if (userId.startsWith('demo-')) {
        throw new Error("Cannot modify demo users");
      }

      const { error } = await supabase
        .from("user_role")
        .update({ role: newRole as any })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast.success("User role updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });

  const { data: pendingInvites, isLoading: pendingInvitesLoading } = useQuery({
    queryKey: ["pending-user-invites"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-user-invites", {
        body: { action: "list" },
      });

      if (error) throw error;
      return ((data?.invites as PendingInvite[]) || []);
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase.functions.invoke("manage-user-invites", {
        body: { action: "cancel", invite_id: inviteId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-user-invites"] });
      toast.success("Invite cancelled");
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel invite: ${error.message}`);
    },
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "manager":
        return "default";
      case "sales":
      case "marketing":
      case "finance":
      case "hr":
      case "operations":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Users
          </CardTitle>
          {isAdmin && (
            <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          )}
        </div>
        <CardDescription>
          View and manage user roles in your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading users...
          </div>
        ) : users && users.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="font-medium">
                    {user.first_name && user.last_name
                      ? `${user.first_name} ${user.last_name}`
                      : "N/A"}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.phone || "N/A"}
                  </TableCell>
                  <TableCell>
                    {user.user_id.startsWith('demo-') ? (
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    ) : (
                      <Select
                        value={user.role}
                        onValueChange={(newRole: "admin" | "user" | "manager" | "sales" | "marketing" | "finance" | "hr" | "operations" | "contractor") =>
                          updateRoleMutation.mutate({
                            userId: user.user_id,
                            newRole,
                          })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue>
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {user.role}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="hr">HR</SelectItem>
                          <SelectItem value="operations">Operations</SelectItem>
                          <SelectItem value="contractor">Contractor</SelectItem>
                          <SelectItem value="user">Basic User</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(user.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {!user.user_id.startsWith('demo-') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No users found
          </div>
        )}

        {isAdmin && (
          <div className="mt-8">
            <h3 className="text-base font-semibold mb-3">Pending Invites</h3>
            {pendingInvitesLoading ? (
              <div className="text-sm text-muted-foreground">Loading pending invites...</div>
            ) : pendingInvites && pendingInvites.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Invited</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell className="font-medium">
                        {invite.first_name || invite.last_name
                          ? `${invite.first_name || ""} ${invite.last_name || ""}`.trim()
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invite.phone || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(invite.role || "user")}>
                          {invite.role || "user"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invite.created_at ? format(new Date(invite.created_at), "MMM d, yyyy") : "N/A"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invite.expires_at ? format(new Date(invite.expires_at), "MMM d, yyyy") : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={cancelInviteMutation.isPending}
                          onClick={() => cancelInviteMutation.mutate(invite.id)}
                        >
                          Cancel Invite
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-sm text-muted-foreground">No pending invites</div>
            )}
          </div>
        )}
      </CardContent>

      {editingUser && (
        <UserEditDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          user={{
            id: editingUser.user_id,
            email: editingUser.email,
            first_name: editingUser.first_name,
            last_name: editingUser.last_name,
            phone: editingUser.phone,
            role: editingUser.role
          }}
        />
      )}

      <UserInviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
    </Card>
  );
}
