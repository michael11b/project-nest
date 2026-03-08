import { useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useProviderKeys, useCreateProviderKey, useUpdateProviderKey, useDeleteProviderKey } from "@/hooks/useProviderKeys";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Provider = Database["public"]["Enums"]["provider"];

const PROVIDER_LABELS: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
};

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "••••" + key.slice(-4);
}

export default function ProviderKeysSettings() {
  const { workspace, role } = useWorkspace();
  const { data: keys, isLoading } = useProviderKeys(workspace.id);
  const create = useCreateProviderKey(workspace.id);
  const update = useUpdateProviderKey(workspace.id);
  const del = useDeleteProviderKey(workspace.id);
  const { toast } = useToast();
  const isAdmin = role === "owner" || role === "admin";

  // Add dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>("openai");
  const [displayName, setDisplayName] = useState("");
  const [apiKey, setApiKey] = useState("");

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editApiKey, setEditApiKey] = useState("");

  const resetAdd = () => { setProvider("openai"); setDisplayName(""); setApiKey(""); };
  const resetEdit = () => { setEditId(""); setEditDisplayName(""); setEditApiKey(""); };

  const handleCreate = async () => {
    try {
      await create.mutateAsync({ provider, displayName, apiKey });
      toast({ title: "Provider key added" });
      setAddOpen(false);
      resetAdd();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    try {
      await update.mutateAsync({
        id: editId,
        displayName: editDisplayName,
        apiKey: editApiKey || undefined,
      });
      toast({ title: "Provider key updated" });
      setEditOpen(false);
      resetEdit();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await del.mutateAsync(id);
      toast({ title: "Provider key deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const openEdit = (k: { id: string; display_name: string }) => {
    setEditId(k.id);
    setEditDisplayName(k.display_name);
    setEditApiKey("");
    setEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Provider Keys</h1>
          <p className="text-muted-foreground">Manage API keys for LLM providers.</p>
        </div>
        {isAdmin && (
          <Dialog open={addOpen} onOpenChange={(open) => { if (!open) resetAdd(); setAddOpen(open); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Provider Key</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Provider Key</DialogTitle>
                <DialogDescription>Add an API key for an LLM provider.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Production Key" />
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={!displayName.trim() || !apiKey.trim() || create.isPending}>
                  {create.isPending ? "Adding…" : "Add"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) resetEdit(); setEditOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Provider Key</DialogTitle>
            <DialogDescription>Update the display name or replace the API key.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>New API Key (leave blank to keep current)</Label>
              <Input type="password" value={editApiKey} onChange={(e) => setEditApiKey(e.target.value)} placeholder="sk-..." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdate} disabled={!editDisplayName.trim() || update.isPending}>
              {update.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Configured Keys</CardTitle>
          <CardDescription>{keys?.length ?? 0} provider keys</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : keys?.length === 0 ? (
            <p className="text-muted-foreground">No provider keys configured yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  {isAdmin && <TableHead className="w-24" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys?.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{PROVIDER_LABELS[k.provider]}</TableCell>
                    <TableCell>{k.display_name}</TableCell>
                    <TableCell><code className="text-sm">{maskKey(k.encrypted_key)}</code></TableCell>
                    <TableCell>{format(new Date(k.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>{format(new Date(k.updated_at), "MMM d, yyyy")}</TableCell>
                    {isAdmin && (
                      <TableCell className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(k)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive">Delete</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{k.display_name}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove the provider key. Any features using it will stop working.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(k.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
