import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMyCollections, useCreateCollection, useAddToCollection } from "@/hooks/useCollections";
import { Plus, FolderPlus, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptId: string;
}

export function SaveToCollectionDialog({ open, onOpenChange, promptId }: Props) {
  const { data: collections, isLoading } = useMyCollections();
  const createCollection = useCreateCollection();
  const addToCollection = useAddToCollection();
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());

  const handleAdd = async (collectionId: string) => {
    try {
      await addToCollection.mutateAsync({ collectionId, promptId });
      setAddedTo((prev) => new Set(prev).add(collectionId));
      toast({ title: "Added to collection" });
    } catch {
      toast({ title: "Already in collection or error", variant: "destructive" });
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const col = await createCollection.mutateAsync({ title: newTitle.trim() });
      await addToCollection.mutateAsync({ collectionId: col.id, promptId });
      setAddedTo((prev) => new Set(prev).add(col.id));
      setNewTitle("");
      setCreating(false);
      toast({ title: "Created & added!" });
    } catch {
      toast({ title: "Error creating collection", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save to Collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
          ) : !collections?.length && !creating ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No collections yet. Create one!</p>
          ) : (
            collections?.map((c: any) => (
              <button
                key={c.id}
                onClick={() => handleAdd(c.id)}
                disabled={addedTo.has(c.id) || addToCollection.isPending}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left disabled:opacity-60"
              >
                <div>
                  <div className="font-medium text-sm text-foreground">{c.title}</div>
                  <div className="text-xs text-muted-foreground">{c.visibility}</div>
                </div>
                {addedTo.has(c.id) && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))
          )}
        </div>

        {creating ? (
          <div className="flex gap-2">
            <Input
              placeholder="Collection name"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <Button size="sm" onClick={handleCreate} disabled={createCollection.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setCreating(true)} className="w-full">
            <FolderPlus className="h-4 w-4 mr-2" /> New Collection
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
