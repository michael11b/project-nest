import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { supabase } from "@/integrations/supabase/client";
import { generateSlug } from "@/lib/slug";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { GitFork, Loader2 } from "lucide-react";

interface ForkPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptId: string;
  promptName: string;
}

export function ForkPromptDialog({ open, onOpenChange, promptId, promptName }: ForkPromptDialogProps) {
  const { user } = useAuth();
  const { data: workspaces } = useWorkspaces();
  const navigate = useNavigate();
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  const [forking, setForking] = useState(false);

  const handleFork = async () => {
    if (!user || !selectedWorkspace) return;
    setForking(true);
    try {
      // Fetch the source prompt
      const { data: source, error: srcErr } = await supabase
        .from("prompts")
        .select("*")
        .eq("id", promptId)
        .eq("visibility", "public")
        .single();
      if (srcErr || !source) throw new Error("Could not read source prompt");

      // Fetch latest version
      const { data: srcVersion } = await supabase
        .from("prompt_versions")
        .select("*")
        .eq("prompt_id", promptId)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Create forked prompt
      const slug = generateSlug(source.name) + "-fork-" + Date.now().toString(36);
      const { data: newPrompt, error: insertErr } = await supabase
        .from("prompts")
        .insert({
          name: source.name + " (fork)",
          slug,
          description: source.description,
          tags: source.tags,
          workspace_id: selectedWorkspace,
          created_by: user.id,
          visibility: "workspace",
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      // Copy latest version if exists
      if (srcVersion && newPrompt) {
        await supabase.from("prompt_versions").insert({
          prompt_id: newPrompt.id,
          version_number: 1,
          content_json: srcVersion.content_json,
          contract_json: srcVersion.contract_json,
          settings_json: srcVersion.settings_json,
          created_by: user.id,
          status: "draft",
        });
      }

      toast({ title: "Prompt forked!", description: `"${source.name}" copied to your workspace.` });
      onOpenChange(false);

      // Navigate to the forked prompt
      const ws = workspaces?.find((w) => w.id === selectedWorkspace);
      if (ws && newPrompt) {
        navigate(`/w/${ws.slug}/prompts/${newPrompt.id}`);
      }
    } catch (err: any) {
      toast({ title: "Fork failed", description: err.message, variant: "destructive" });
    } finally {
      setForking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitFork className="h-5 w-5" /> Fork Prompt
          </DialogTitle>
          <DialogDescription>
            Copy "{promptName}" into one of your workspaces as a private draft.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <label className="text-sm font-medium">Destination workspace</label>
          <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
            <SelectTrigger>
              <SelectValue placeholder="Select a workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces?.map((ws) => (
                <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleFork} disabled={forking || !selectedWorkspace}>
            {forking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <GitFork className="h-4 w-4 mr-2" />}
            Fork
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
