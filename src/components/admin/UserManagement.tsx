import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserPlus, Loader2, Mail, CheckCircle, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { format } from "date-fns";

const ALL_ROLES = [
  { key: "admin", label: "Admin", color: "bg-destructive text-destructive-foreground" },
  { key: "manager", label: "Manager", color: "bg-primary text-primary-foreground" },
  { key: "sales", label: "Sales", color: "bg-emerald-600 text-white" },
  { key: "marketing", label: "Marketing", color: "bg-violet-600 text-white" },
  { key: "finance", label: "Finance", color: "bg-amber-600 text-white" },
  { key: "hr", label: "HR", color: "bg-pink-600 text-white" },
  { key: "operations", label: "Operations", color: "bg-cyan-600 text-white" },
  { key: "contractor", label: "Contractor", color: "bg-orange-600 text-white" },
  { key: "basic_user", label: "Basic User", color: "bg-muted text-muted-foreground" },
  { key: "moderator", label: "Moderator", color: "bg-yellow-600 text-white" },
  { key: "user", label: "User", color: "bg-secondary text-secondary-foreground" },
] as const;

type UserWithRoles = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  roles: string[];
};

export default function UserManagement() {
  const { isAdmin, isLoading: isRoleLoading } = useUserRole();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("basic_user");
  const [inviting, setInviting] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [confirmingUser, setConfirmingUser] = useState<string | null>(null);

  useEffect(() => {
    if (isRoleLoading) {
      setLoading(true);
      return;
    }

    if (!isAdmin) {
      setLoading(false);
      return;
    }

    loadUsers();
  }, [isAdmin, isRoleLoading]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Query user_profiles + user_roles directly (no edge function needed)
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("user_profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
      ]);
      if (profilesRes.error) throw new Error(profilesRes.error.message);

      const roles = rolesRes.data || [];
      const usersWithRoles: UserWithRoles[] = (profilesRes.data || []).map((p) => ({
        id: p.id,
        email: p.email ?? "",
        created_at: p.created_at ?? "",
        last_sign_in_at: p.last_sign_in_at ?? null,
        email_confirmed_at: p.email_confirmed_at ?? null,
        roles: roles.filter((r) => r.user_id === p.id).map((r) => r.role),
      }));
      setUsers(usersWithRoles);
    } catch (err: any) {
      toast.error("Failed to load users: " + err.message);
    }
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!isAdmin) {
      toast.error("Admin access required");
      return;
    }

    if (!inviteEmail) return;
    setInviting(true);
    try {
      const res = await supabase.functions.invoke("invite-user", {
        body: { email: inviteEmail, role: inviteRole },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteOpen(false);
      loadUsers();
    } catch (err: any) {
      toast.error("Failed to invite user: " + err.message);
    }
    setInviting(false);
  };

  const toggleUserRole = async (userId: string, role: string, currentRoles: string[]) => {
    if (!isAdmin) {
      toast.error("Admin access required");
      return;
    }

    setUpdatingRole(userId);
    try {
      const hasRole = currentRoles.includes(role);
      if (hasRole) {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error && !error.message.includes("duplicate")) throw new Error(error.message);
      }

      setUsers(prev => prev.map(u => {
        if (u.id !== userId) return u;
        return {
          ...u,
          roles: hasRole ? u.roles.filter(r => r !== role) : [...u.roles, role],
        };
      }));
      toast.success(`Role ${hasRole ? "removed" : "added"}`);
    } catch (err: any) {
      toast.error("Failed to update role: " + err.message);
    }
    setUpdatingRole(null);
  };

  const handleConfirmUser = async (userId: string, email: string) => {
    if (!isAdmin) {
      toast.error("Admin access required");
      return;
    }

    setConfirmingUser(userId);
    try {
      const res = await supabase.functions.invoke("confirm-user", {
        body: { user_id: userId },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`Email confirmed for ${email}`);
      loadUsers();
    } catch (err: any) {
      toast.error("Failed to confirm user: " + err.message);
    }
    setConfirmingUser(null);
  };

  const getRoleBadges = (roles: string[]) => {
    if (roles.length === 0) return <Badge variant="outline">No Role</Badge>;
    return (
      <div className="flex flex-wrap gap-1">
        {roles.map(r => {
          const roleDef = ALL_ROLES.find(ar => ar.key === r);
          return (
            <Badge key={r} className={`text-xs ${roleDef?.color || "bg-secondary"}`}>
              {roleDef?.label || r}
            </Badge>
          );
        })}
      </div>
    );
  };

  if (loading || isRoleLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Administrator access is required to manage users and roles.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              User Management
            </CardTitle>
            <CardDescription>
              {users.length} user{users.length !== 1 ? "s" : ""} registered
            </CardDescription>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
                <DialogDescription>
                  Send an invitation email to a new user. They'll receive a link to set up their account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Initial Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_ROLES.map(r => (
                        <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                <Button onClick={handleInvite} disabled={inviting || !inviteEmail}>
                  {inviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  Send Invitation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Sign In</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-sm max-w-[180px] truncate">{user.email}</TableCell>
                    <TableCell>{getRoleBadges(user.roles)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {user.email_confirmed_at ? (
                        <Badge variant="default" className="bg-success text-white">Verified</Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Pending</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            disabled={confirmingUser === user.id}
                            onClick={() => handleConfirmUser(user.id, user.email)}
                          >
                            {confirmingUser === user.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            Confirm
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                      {user.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      {user.last_sign_in_at ? format(new Date(user.last_sign_in_at), "MMM d, yyyy") : "Never"}
                    </TableCell>
                    <TableCell>
                      {updatingRole === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-1">
                              Manage Roles
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-2" align="end">
                            <div className="space-y-1">
                              {ALL_ROLES.map(role => (
                                <label
                                  key={role.key}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
                                >
                                  <Checkbox
                                    checked={user.roles.includes(role.key)}
                                    onCheckedChange={() => toggleUserRole(user.id, role.key, user.roles)}
                                  />
                                  {role.label}
                                </label>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
