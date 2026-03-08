import { usePrompt } from "@/hooks/usePrompt";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useEvalRuns } from "@/hooks/useEvalRuns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Play } from "lucide-react";
import { format } from "date-fns";
import RunEvalModal from "@/components/RunEvalModal";

const statusColors: Record<string, string> = {
  queued: "bg-muted text-muted-foreground",
  running: "bg-primary/20 text-primary",
  succeeded: "bg-green-500/20 text-green-700 dark:text-green-400",
  failed: "bg-destructive/20 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

export default function EvalsTab() {
  const { prompt } = usePrompt();
  const { workspace } = useWorkspace();
  const { data: runs, isLoading, refetchInterval } = useEvalRuns(prompt.id);
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);

  if (isLoading) {
    return <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Eval Runs</h2>
        <Button size="sm" onClick={() => setModalOpen(true)}><Play className="h-4 w-4 mr-1" />Run Eval</Button>
      </div>

      {!runs?.length ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">No evaluation runs yet.</p>
          <Button onClick={() => setModalOpen(true)}><Play className="h-4 w-4 mr-1" />Run your first eval</Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Suite</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => (
              <TableRow
                key={run.id}
                className="cursor-pointer"
                onClick={() => navigate(`/w/${workspace.slug}/prompts/${prompt.id}/evals/${run.id}`)}
              >
                <TableCell className="font-mono text-sm">v{run.version_number}</TableCell>
                <TableCell>{run.suite_name}</TableCell>
                <TableCell>
                  <Badge className={statusColors[run.status] ?? ""} variant="secondary">{run.status}</Badge>
                </TableCell>
                <TableCell>{run.score != null ? `${(Number(run.score) * 100).toFixed(0)}%` : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{run.provider}/{run.model}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(run.created_at), "MMM d, HH:mm")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <RunEvalModal open={modalOpen} onOpenChange={setModalOpen} promptId={prompt.id} />
    </div>
  );
}
