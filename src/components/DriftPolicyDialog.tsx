import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateDriftPolicy, useUpdateDriftPolicy, SCHEDULE_OPTIONS, type DriftPolicyRow } from "@/hooks/useDrift";
import { useTestSuites } from "@/hooks/useTestSuites";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptId: string;
  workspaceId: string;
  policy?: DriftPolicyRow | null;
}

export function DriftPolicyDialog({ open, onOpenChange, promptId, workspaceId, policy }: Props) {
  const isEdit = !!policy;

  const [environmentId, setEnvironmentId] = useState(policy?.environment_id ?? "");
  const [testSuiteId, setTestSuiteId] = useState(policy?.test_suite_id ?? "");
  const [scheduleCron, setScheduleCron] = useState(policy?.schedule_cron ?? "0 */6 * * *");
  const [threshold, setThreshold] = useState(String((policy?.threshold ?? 0.9) * 100));
  const [enabled, setEnabled] = useState(policy?.enabled ?? true);

  useEffect(() => {
    if (policy) {
      setEnvironmentId(policy.environment_id);
      setTestSuiteId(policy.test_suite_id);
      setScheduleCron(policy.schedule_cron);
      setThreshold(String(policy.threshold * 100));
      setEnabled(policy.enabled);
    } else {
      setEnvironmentId("");
      setTestSuiteId("");
      setScheduleCron("0 */6 * * *");
      setThreshold("90");
      setEnabled(true);
    }
  }, [policy, open]);

  const { data: environments } = useQuery({
    queryKey: ["environments", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("environments")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: testSuites } = useTestSuites(promptId);

  const createMutation = useCreateDriftPolicy();
  const updateMutation = useUpdateDriftPolicy();

  const handleSubmit = async () => {
    const thresholdNum = parseFloat(threshold) / 100;
    if (isNaN(thresholdNum) || thresholdNum < 0 || thresholdNum > 1) {
      toast({ title: "Invalid threshold", description: "Enter a value between 0 and 100", variant: "destructive" });
      return;
    }
    if (!environmentId || !testSuiteId) {
      toast({ title: "Missing fields", description: "Select environment and test suite", variant: "destructive" });
      return;
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: policy!.id,
          prompt_id: promptId,
          environment_id: environmentId,
          test_suite_id: testSuiteId,
          schedule_cron: scheduleCron,
          threshold: thresholdNum,
          enabled,
        });
        toast({ title: "Policy updated" });
      } else {
        await createMutation.mutateAsync({
          prompt_id: promptId,
          workspace_id: workspaceId,
          environment_id: environmentId,
          test_suite_id: testSuiteId,
          schedule_cron: scheduleCron,
          threshold: thresholdNum,
          enabled,
        });
        toast({ title: "Policy created" });
      }
      onOpenChange(false);
    } catch {
      toast({ title: "Error saving policy", variant: "destructive" });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit" : "Add"} Drift Policy</DialogTitle>
          <DialogDescription>
            Configure automated eval schedules and alert thresholds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Environment</Label>
            <Select value={environmentId} onValueChange={setEnvironmentId}>
              <SelectTrigger><SelectValue placeholder="Select environment" /></SelectTrigger>
              <SelectContent>
                {environments?.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Test Suite</Label>
            <Select value={testSuiteId} onValueChange={setTestSuiteId}>
              <SelectTrigger><SelectValue placeholder="Select test suite" /></SelectTrigger>
              <SelectContent>
                {testSuites?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Schedule</Label>
            <Select value={scheduleCron} onValueChange={setScheduleCron}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCHEDULE_OPTIONS.map((o) => (
                  <SelectItem key={o.cron} value={o.cron}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Threshold (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="90"
            />
            <p className="text-xs text-muted-foreground">Alert triggers when score drops below this.</p>
          </div>

          <div className="flex items-center justify-between">
            <Label>Enabled</Label>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving…" : isEdit ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
