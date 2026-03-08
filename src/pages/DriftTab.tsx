import { useState } from "react";
import { usePrompt } from "@/hooks/usePrompt";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import {
  useDriftPolicies,
  useDriftAlerts,
  useDeleteDriftPolicy,
  useUpdateDriftPolicy,
  useUpdateDriftAlert,
  cronToLabel,
  type DriftPolicyRow,
} from "@/hooks/useDrift";
import { DriftPolicyDialog } from "@/components/DriftPolicyDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

const severityColors: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-700 border-blue-200",
  medium: "bg-amber-500/10 text-amber-700 border-amber-200",
  high: "bg-orange-500/10 text-orange-700 border-orange-200",
  critical: "bg-red-500/10 text-red-700 border-red-200",
};

const statusColors: Record<string, string> = {
  open: "bg-red-500/10 text-red-700 border-red-200",
  acknowledged: "bg-amber-500/10 text-amber-700 border-amber-200",
  resolved: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
};

export default function DriftTab() {
  const { prompt } = usePrompt();
  const { workspace, role } = useWorkspace();
  const { user } = useAuth();
  const isAdmin = role === "owner" || role === "admin";

  const { data: policies, isLoading: policiesLoading } = useDriftPolicies(prompt.id);
  const { data: alerts, isLoading: alertsLoading } = useDriftAlerts(prompt.id);
  const deleteMutation = useDeleteDriftPolicy();
  const toggleMutation = useUpdateDriftPolicy();
  const alertMutation = useUpdateDriftAlert();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState<DriftPolicyRow | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id, promptId: prompt.id });
      toast({ title: "Policy deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleToggle = async (policy: DriftPolicyRow) => {
    try {
      await toggleMutation.mutateAsync({
        id: policy.id,
        prompt_id: policy.prompt_id,
        enabled: !policy.enabled,
      });
    } catch {
      toast({ title: "Failed to toggle", variant: "destructive" });
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await alertMutation.mutateAsync({
        id: alertId,
        promptId: prompt.id,
        status: "acknowledged",
        acknowledged_by: user?.id,
        acknowledged_at: new Date().toISOString(),
      });
      toast({ title: "Alert acknowledged" });
    } catch {
      toast({ title: "Failed to update alert", variant: "destructive" });
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await alertMutation.mutateAsync({
        id: alertId,
        promptId: prompt.id,
        status: "resolved",
        resolved_by: user?.id,
        resolved_at: new Date().toISOString(),
      });
      toast({ title: "Alert resolved" });
    } catch {
      toast({ title: "Failed to update alert", variant: "destructive" });
    }
  };

  if (policiesLoading || alertsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Drift Policies */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Drift Policies</h3>
          {isAdmin && (
            <Button size="sm" onClick={() => { setEditPolicy(null); setDialogOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Policy
            </Button>
          )}
        </div>

        {!policies?.length ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No drift policies configured yet.</p>
              {isAdmin && <p className="text-xs mt-1">Add a policy to monitor prompt performance over time.</p>}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">
                      {p.environments?.name ?? "—"} &middot; {p.test_suites?.name ?? "—"}
                    </CardTitle>
                    <Switch
                      checked={p.enabled}
                      onCheckedChange={() => handleToggle(p)}
                      disabled={!isAdmin}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>Schedule: {cronToLabel(p.schedule_cron)}</span>
                    <span>&middot;</span>
                    <span>Threshold: {Math.round(p.threshold * 100)}%</span>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setEditPolicy(p); setDialogOpen(true); }}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(p.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Drift Alerts */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Drift Alerts</h3>
        {!alerts?.length ? (
          <p className="text-sm text-muted-foreground">No alerts yet.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Baseline</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Date</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Badge variant="outline" className={severityColors[a.severity] ?? ""}>
                        {a.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[a.status] ?? ""}>
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate text-muted-foreground">
                      {a.message || "—"}
                    </TableCell>
                    <TableCell className="font-mono">
                      {a.baseline_score != null ? `${Math.round(a.baseline_score * 100)}%` : "—"}
                    </TableCell>
                    <TableCell className="font-mono">
                      {a.current_score != null ? `${Math.round(a.current_score * 100)}%` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(a.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-1">
                          {a.status === "open" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAcknowledge(a.id)}
                              disabled={alertMutation.isPending}
                            >
                              Acknowledge
                            </Button>
                          )}
                          {a.status === "acknowledged" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResolve(a.id)}
                              disabled={alertMutation.isPending}
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Policy dialog */}
      <DriftPolicyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        promptId={prompt.id}
        workspaceId={workspace.id}
        policy={editPolicy}
      />
    </div>
  );
}
