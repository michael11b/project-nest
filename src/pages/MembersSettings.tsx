import { useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useMembers, useInviteMember, useUpdateMemberRole, useRemoveMember } from "@/hooks/useMembers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Enums } from "@/integrations/supabase/types";

const ROLES: Enums<"workspace_role">[] = ["owner", "admin", "editor", "viewer"];

export default function MembersSettings() {
  const { workspace, role } = useWorkspace();
  const { user } = useAuth();
  const { data: members, isLoading } = useMembers(workspace.id);
  const invite = useInviteMember(workspace.id);
  const updateRole = useUpdateMemberRole(workspace.id);
  const removeMember = useRemoveMember(workspace.id);
  const { toast } = useToast();
  const isAdmin = role === "owner" || role === "admin";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Enums<"workspace_role">>("viewer");

  const handleInvite = async () => {
    try {
      await invite.mutateAsync({ email, role: inviteRole });
      toast({ title: "Member invited" });
      setDialogOpen(false);
      setEmail("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleRoleChange = async (memberId: string, newRole: Enums<"workspace_role">) => {
    try {
      await updateRole.mutateAsync({ memberId, role: newRole });
      toast({ title: "Role updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await removeMember.mutateAsync(memberId);
      toast({ title: "Member removed" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground">Manage who has access to this workspace.</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Invite Member</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Member</DialogTitle>
                <DialogDescription>Add a user to this workspace by their email address.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Enums<"workspace_role">)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.filter((r) => r !== "owner").map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleInvite} disabled={!email.trim() || invite.isPending}>
                  {invite.isPending ? "Inviting…" : "Invite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Members</CardTitle>
          <CardDescription>{members?.length ?? 0} members</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  {isAdmin && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members?.map((m) => {
                  const isSelf = m.user_id === user?.id;
                  const isOwnerRow = m.role === "owner";
                  const initials = (m.profile?.display_name || m.profile?.email || "?")
                    .slice(0, 2).toUpperCase();

                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium leading-none">{m.profile?.display_name || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground">{m.profile?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isOwnerRow ? "default" : "secondary"}>{m.role}</Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          {!isOwnerRow && !isSelf && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {ROLES.filter((r) => r !== "owner" && r !== m.role).map((r) => (
                                  <DropdownMenuItem key={r} onClick={() => handleRoleChange(m.id, r)}>
                                    Change to {r}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuItem className="text-destructive" onClick={() => handleRemove(m.id)}>
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
