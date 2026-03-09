import { useState } from "react";
import { useCreateCollection } from "@/hooks/useCollections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCollectionDialog({ open, onOpenChange }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public" | "workspace">("private");
  const createCollection = useCreateCollection();
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!title.trim()) return;

    createCollection.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        visibility,
      },
      {
        onSuccess: () => {
          toast({ title: "Success", description: "Collection created!" });
          setTitle("");
          setDescription("");
          setVisibility("private");
          onOpenChange(false);
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: (error as Error)?.message ?? "Failed to create collection",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Collection</DialogTitle>
          <DialogDescription>Create a new collection to organize prompts.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="coll-title">Title</Label>
            <Input
              id="coll-title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 200))}
              placeholder="My Collection"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">{title.length}/200</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="coll-desc">Description (optional)</Label>
            <Textarea
              id="coll-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
              placeholder="Describe your collection..."
              maxLength={2000}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">{description.length}/2000</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="coll-visibility">Visibility</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as "private" | "public" | "workspace")}>
              <SelectTrigger id="coll-visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="workspace">Workspace</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {visibility === "private" && "Only you can access this collection."}
              {visibility === "workspace" && "Your workspace members can access this collection."}
              {visibility === "public" && "Anyone can view this collection."}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || createCollection.isPending}
          >
            {createCollection.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
