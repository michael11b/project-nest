import { useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useEnvironments, useCreateEnvironment, useUpdateEnvironment, useDeleteEnvironment } from "@/hooks/useEnvironments";
import { generateSlug } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EnvironmentsSettings() {
  const { workspace, role } = useWorkspace();
  const { data: envs, isLoading } = useEnvironments(workspace.id);
  const create = useCreateEnvironment(workspace.id);
  const update = useUpdateEnvironment(workspace.id);
  const del = useDeleteEnvironment(workspace.id);
  const { toast } = useToast();
  const isAdmin = role === "owner" || role === "admin";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [envName, setEnvName] = useState("");
  const [envSlug, setEnvSlug] = useState("");

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");

  const handleCreate = async () => {
    try {
      await create.mutateAsync({ name: envName, slug: envSlug || generateSlug(envName) });
      toast({ title: "Environment created" });
      setDialogOpen(false);
      setEnvName("");
      setEnvSlug("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!editId) return;
    try {
      await update.mutateAsync({ id: editId, name: editName, slug: editSlug });
      toast({ title: "Updated" });
      setEditId(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await del.mutateAsync(id);
      toast({ title: "Deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Environments</h1>
          <p className="text-muted-foreground">Manage deployment environments for your prompts.</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Environment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Environment</DialogTitle>
                <DialogDescription>Create a new deployment environment.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={envName}
                    onChange={(e) => {
                      setEnvName(e.target.value);
                      setEnvSlug(generateSlug(e.target.value));
                    }}
                    placeholder="e.g. Canary"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input value={envSlug} onChange={(e) => setEnvSlug(e.target.value)} placeholder="auto-generated" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={!envName.trim() || create.isPending}>
                  {create.isPending ? "Creating…" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Environments</CardTitle>
          <CardDescription>{envs?.length ?? 0} environments</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Order</TableHead>
                  {isAdmin && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {envs?.map((env) => (
                  <TableRow key={env.id}>
                    <TableCell>
                      {editId === env.id ? (
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                      ) : (
                        env.name
                      )}
                    </TableCell>
                    <TableCell>
                      {editId === env.id ? (
                        <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} className="h-8" />
                      ) : (
                        <code className="text-sm">{env.slug}</code>
                      )}
                    </TableCell>
                    <TableCell>{env.sort_order}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        {editId === env.id ? (
                          <div className="flex gap-1">
                            <Button size="sm" onClick={handleUpdate}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditId(env.id); setEditName(env.name); setEditSlug(env.slug); }}>
                                Edit
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete "{env.name}"?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Releases associated with this environment may be affected.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(env.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
