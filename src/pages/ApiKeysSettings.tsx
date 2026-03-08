import { useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useApiKeys, useCreateApiKey, useDeleteApiKey } from "@/hooks/useApiKeys";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Copy, Plus, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ApiKeysSettings() {
  const { workspace, role } = useWorkspace();
  const { data: keys, isLoading } = useApiKeys(workspace.id);
  const create = useCreateApiKey(workspace.id);
  const del = useDeleteApiKey(workspace.id);
  const { toast } = useToast();
  const isAdmin = role === "owner" || role === "admin";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [newPlaintext, setNewPlaintext] = useState<string | null>(null);

  const handleCreate = async () => {
    try {
      const plaintext = await create.mutateAsync({
        name: keyName,
        expiresAt: expiresAt || null,
      });
      setNewPlaintext(plaintext);
      setKeyName("");
      setExpiresAt("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleCopy = () => {
    if (newPlaintext) {
      navigator.clipboard.writeText(newPlaintext);
      toast({ title: "Copied to clipboard" });
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setNewPlaintext(null);
    setKeyName("");
    setExpiresAt("");
  };

  const handleDelete = async (id: string) => {
    try {
      await del.mutateAsync(id);
      toast({ title: "API key deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">Manage API keys for external integrations.</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Create API Key</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{newPlaintext ? "API Key Created" : "Create API Key"}</DialogTitle>
                <DialogDescription>
                  {newPlaintext
                    ? "Copy your key now. It won't be shown again."
                    : "Generate a new API key for this workspace."}
                </DialogDescription>
              </DialogHeader>

              {newPlaintext ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 rounded-md border bg-muted p-3">
                    <code className="flex-1 text-sm break-all">{newPlaintext}</code>
                    <Button variant="ghost" size="icon" onClick={handleCopy}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Store this key securely. It cannot be retrieved later.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="e.g. CI Pipeline" />
                  </div>
                  <div className="space-y-2">
                    <Label>Expires (optional)</Label>
                    <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                  </div>
                </div>
              )}

              <DialogFooter>
                {newPlaintext ? (
                  <Button onClick={handleCloseDialog}>Done</Button>
                ) : (
                  <Button onClick={handleCreate} disabled={!keyName.trim() || create.isPending}>
                    {create.isPending ? "Creating…" : "Create"}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Keys</CardTitle>
          <CardDescription>{keys?.length ?? 0} keys</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : keys?.length === 0 ? (
            <p className="text-muted-foreground">No API keys yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Last Used</TableHead>
                  {isAdmin && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys?.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell><code className="text-sm">{k.key_prefix}</code></TableCell>
                    <TableCell>{format(new Date(k.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>{k.expires_at ? format(new Date(k.expires_at), "MMM d, yyyy") : "Never"}</TableCell>
                    <TableCell>{k.last_used_at ? format(new Date(k.last_used_at), "MMM d, yyyy") : "Never"}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive">Delete</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{k.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Any integrations using this key will stop working immediately.
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
