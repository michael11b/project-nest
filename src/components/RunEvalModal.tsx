import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { usePromptVersions } from "@/hooks/usePromptVersions";
import { useTestSuites } from "@/hooks/useTestSuites";
import { useCreateEvalRun } from "@/hooks/useEvalRuns";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import type { Enums } from "@/integrations/supabase/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptId: string;
}

export default function RunEvalModal({ open, onOpenChange, promptId }: Props) {
  const { data: versions } = usePromptVersions(promptId);
  const { data: suites } = useTestSuites(promptId);
  const createRun = useCreateEvalRun();
  const { workspace } = useWorkspace();
  const { user } = useAuth();

  const [versionId, setVersionId] = useState("");
  const [suiteId, setSuiteId] = useState("");
  const [provider, setProvider] = useState<Enums<"provider">>("openai");
  const [model, setModel] = useState("gpt-4o");
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("1024");

  const handleSubmit = async () => {
    if (!versionId || !suiteId) {
      toast.error("Select a version and test suite");
      return;
    }
    try {
      await createRun.mutateAsync({
        prompt_version_id: versionId,
        test_suite_id: suiteId,
        provider,
        model,
        workspace_id: workspace.id,
        created_by: user!.id,
        settings_json: {
          temperature: Number(temperature),
          max_tokens: Number(maxTokens),
        },
      });
      toast.success("Eval run queued");
      onOpenChange(false);
    } catch {
      toast.error("Failed to create eval run");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run Evaluation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Version</Label>
            <Select value={versionId} onValueChange={setVersionId}>
              <SelectTrigger><SelectValue placeholder="Select version" /></SelectTrigger>
              <SelectContent>
                {versions?.map((v) => (
                  <SelectItem key={v.id} value={v.id}>v{v.version_number} ({v.status})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Test Suite</Label>
            <Select value={suiteId} onValueChange={setSuiteId}>
              <SelectTrigger><SelectValue placeholder="Select suite" /></SelectTrigger>
              <SelectContent>
                {suites?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as Enums<"provider">)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Model</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Temperature</Label>
              <Input type="number" step="0.1" min="0" max="2" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Max Tokens</Label>
              <Input type="number" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createRun.isPending}>Queue Run</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
