import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateWorkspaceDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const slug = slugify(name);

  const handleCreate = async () => {
    if (!name.trim() || !user) return;
    setSubmitting(true);

    // Create workspace
    const { data: ws, error: wsErr } = await supabase
      .from("workspaces")
      .insert({ name: name.trim(), slug: slug + "-" + crypto.randomUUID().slice(0, 8) })
      .select()
      .single();

    if (wsErr || !ws) {
      toast({ title: "Error", description: wsErr?.message ?? "Failed to create workspace", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Add current user as owner
    await supabase.from("workspace_members").insert({
      workspace_id: ws.id,
      user_id: user.id,
      role: "owner" as const,
    });

    // Seed environments
    await supabase.from("environments").insert([
      { workspace_id: ws.id, name: "Development", slug: "dev", sort_order: 0 },
      { workspace_id: ws.id, name: "Staging", slug: "staging", sort_order: 1 },
      { workspace_id: ws.id, name: "Production", slug: "prod", sort_order: 2 },
    ]);

    await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    setSubmitting(false);
    setName("");
    onOpenChange(false);
    navigate(`/w/${ws.slug}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
          <DialogDescription>Create a new workspace for your team.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ws-name">Workspace Name</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Team"
              maxLength={100}
            />
            {slug && (
              <p className="text-xs text-muted-foreground">
                Slug: <code className="rounded bg-muted px-1">{slug}</code>
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
