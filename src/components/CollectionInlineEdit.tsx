import { useState, useRef, useEffect } from "react";
import { useUpdateCollection } from "@/hooks/useCollections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Lock, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  collectionId: string;
  title: string;
  description: string | null;
  visibility: string;
  isOwner: boolean;
}

export default function CollectionInlineEdit({ collectionId, title, description, visibility, isOwner }: Props) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDesc, setEditDesc] = useState(description ?? "");
  const [editVis, setEditVis] = useState(visibility);
  const updateCollection = useUpdateCollection();
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setEditTitle(title);
      setEditDesc(description ?? "");
      setEditVis(visibility);
      setTimeout(() => titleRef.current?.focus(), 0);
    }
  }, [editing, title, description, visibility]);

  const save = async () => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      toast.error("Title cannot be empty");
      return;
    }
    if (trimmedTitle.length > 200) {
      toast.error("Title must be under 200 characters");
      return;
    }
    if (editDesc.length > 2000) {
      toast.error("Description must be under 2000 characters");
      return;
    }
    try {
      await updateCollection.mutateAsync({
        id: collectionId,
        title: trimmedTitle,
        description: editDesc.trim() || undefined,
        visibility: editVis,
      });
      setEditing(false);
      toast.success("Collection updated");
    } catch (err: any) {
      toast.error(err.message ?? "Update failed");
    }
  };

  if (!isOwner || !editing) {
    return (
      <div className="group/header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <Badge variant="secondary" className="text-xs">
            {visibility === "public" ? (
              <><Globe className="h-3 w-3 mr-1" /> Public</>
            ) : (
              <><Lock className="h-3 w-3 mr-1" /> Private</>
            )}
          </Badge>
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover/header:opacity-100 transition-opacity"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {description && (
          <p className="text-muted-foreground mb-4">{description}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-2">
      <Input
        ref={titleRef}
        value={editTitle}
        onChange={(e) => setEditTitle(e.target.value)}
        placeholder="Collection title"
        maxLength={200}
        className="text-lg font-semibold"
      />
      <Textarea
        value={editDesc}
        onChange={(e) => setEditDesc(e.target.value)}
        placeholder="Description (optional)"
        maxLength={2000}
        rows={2}
        className="resize-none"
      />
      <div className="flex items-center gap-3">
        <Select value={editVis} onValueChange={setEditVis}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public"><span className="flex items-center gap-1.5"><Globe className="h-3 w-3" /> Public</span></SelectItem>
            <SelectItem value="private"><span className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> Private</span></SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 ml-auto">
          <Button size="sm" onClick={save} disabled={updateCollection.isPending}>
            <Check className="h-4 w-4 mr-1" /> Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={updateCollection.isPending}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
