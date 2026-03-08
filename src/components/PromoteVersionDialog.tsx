import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePromptVersions } from "@/hooks/usePromptVersions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  environment: { id: string; name: string; slug: string };
  promptId: string;
}

export function PromoteVersionDialog({
  open,
  onOpenChange,
  environment,
  promptId,
}: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: versions, isLoading } = usePromptVersions(promptId);

  const [versionId, setVersionId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const promote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("releases").insert({
        prompt_id: promptId,
        prompt_version_id: versionId,
        environment_id: environment.id,
        released_by: user!.id,
        notes: notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["releases", promptId] });
      toast({ title: "Released!", description: `Promoted to ${environment.name}.` });
      onOpenChange(false);
      setVersionId("");
      setNotes("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Promote to {environment.name}</DialogTitle>
          <DialogDescription>
            Select a prompt version to deploy to the{" "}
            <Badge variant="outline" className="mx-1">
              {environment.slug}
            </Badge>{" "}
            environment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Version</Label>
            <Select value={versionId} onValueChange={setVersionId}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading…" : "Select version"} />
              </SelectTrigger>
              <SelectContent>
                {versions?.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    v{v.version_number}{" "}
                    <span className="text-muted-foreground ml-1 text-xs capitalize">
                      ({v.status})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Release notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => promote.mutate()}
            disabled={!versionId || promote.isPending}
          >
            {promote.isPending ? "Promoting…" : "Promote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
