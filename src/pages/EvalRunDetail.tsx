import { useParams, useNavigate } from "react-router-dom";
import { useEvalRun, useEvalResults } from "@/hooks/useEvalRuns";
import { usePromptVersion } from "@/hooks/usePromptVersions";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePrompt } from "@/hooks/usePrompt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

const statusColors: Record<string, string> = {
  queued: "bg-muted text-muted-foreground",
  running: "bg-primary/20 text-primary",
  succeeded: "bg-green-500/20 text-green-700 dark:text-green-400",
  failed: "bg-destructive/20 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

export default function EvalRunDetail() {
  const { evalRunId } = useParams<{ evalRunId: string }>();
  const { prompt } = usePrompt();
  const { workspace } = useWorkspace();
  const navigate = useNavigate();
  const { data: run, isLoading: runLoading } = useEvalRun(evalRunId);
  const { data: version } = usePromptVersion(run?.prompt_version_id);
  const { data: results, isLoading: resultsLoading } = useEvalResults(evalRunId);

  if (runLoading) return <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-40 w-full" /></div>;
  if (!run) return <p className="text-muted-foreground text-center py-10">Eval run not found.</p>;

  const isActive = run.status === "queued" || run.status === "running";
  const totalCases = results?.length ?? 0;
  const passed = results?.filter((r) => r.passed).length ?? 0;
  const failed = totalCases - passed;
  const criticalFails = results?.filter((r) => !r.passed && r.case_critical).length ?? 0;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/w/${workspace.slug}/prompts/${prompt.id}/evals`)}>
        <ArrowLeft className="h-4 w-4 mr-1" />Back to Evals
      </Button>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">Eval Run</h2>
        <Badge className={statusColors[run.status] ?? ""} variant="secondary">{run.status}</Badge>
        {version && <Badge variant="outline" className="font-mono">v{version.version_number}</Badge>}
        <Badge variant="outline">{run.suite_name}</Badge>
        <span className="text-sm text-muted-foreground">{run.provider}/{run.model}</span>
      </div>

      {run.score != null && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Score:</span>
          <span className="text-2xl font-bold">{(Number(run.score) * 100).toFixed(0)}%</span>
          {run.critical_failed && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Critical Failed</Badge>}
        </div>
      )}

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Created: {format(new Date(run.created_at), "MMM d, HH:mm")}</span>
        {run.started_at && <span>Started: {format(new Date(run.started_at), "HH:mm:ss")}</span>}
        {run.completed_at && <span>Completed: {format(new Date(run.completed_at), "HH:mm:ss")}</span>}
      </div>

      {isActive && (
        <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Waiting for worker to process this evaluation…</span>
        </div>
      )}

      {run.error_message && (
        <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10 text-sm text-destructive">
          {run.error_message}
        </div>
      )}

      {/* Summary */}
      {totalCases > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <SumCard label="Total" value={totalCases} />
          <SumCard label="Passed" value={passed} className="text-green-600 dark:text-green-400" />
          <SumCard label="Failed" value={failed} className="text-destructive" />
          <SumCard label="Critical Fails" value={criticalFails} className="text-destructive" />
        </div>
      )}

      {/* Results */}
      {resultsLoading ? <Skeleton className="h-40 w-full" /> : results?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Latency</TableHead>
              <TableHead>Output</TableHead>
              <TableHead>Checks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((r) => (
              <ResultRow key={r.id} result={r} />
            ))}
          </TableBody>
        </Table>
      ) : !isActive ? (
        <p className="text-sm text-muted-foreground text-center py-8">No results available.</p>
      ) : null}
    </div>
  );
}

function SumCard({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="border rounded-lg p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${className ?? ""}`}>{value}</p>
    </div>
  );
}

function ResultRow({ result }: { result: any }) {
  const [expanded, setExpanded] = useState(false);
  const checkResults = (result.check_results_json ?? []) as { type: string; passed: boolean; detail?: string }[];

  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <TableCell className="font-medium">
          {result.case_name}
          {result.case_critical && <Badge variant="destructive" className="ml-2 text-xs">Critical</Badge>}
        </TableCell>
        <TableCell>
          {result.passed ? (
            <Badge className="bg-green-500/20 text-green-700 dark:text-green-400" variant="secondary">
              <CheckCircle2 className="h-3 w-3 mr-1" />Pass
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />Fail
            </Badge>
          )}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">{result.latency_ms ? `${result.latency_ms}ms` : "—"}</TableCell>
        <TableCell className="text-xs max-w-[250px] truncate">{result.output_text?.slice(0, 80) ?? "—"}</TableCell>
        <TableCell>
          <Badge variant="secondary">{checkResults.length} checks</Badge>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/30">
            <div className="space-y-2 p-2">
              {result.output_text && (
                <div>
                  <p className="text-xs font-medium mb-1">Full Output:</p>
                  <pre className="text-xs bg-background border rounded p-2 whitespace-pre-wrap max-h-48 overflow-auto">{result.output_text}</pre>
                </div>
              )}
              {checkResults.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1">Check Results:</p>
                  <div className="space-y-1">
                    {checkResults.map((cr, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {cr.passed ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-destructive" />}
                        <span className="font-mono">{cr.type}</span>
                        {cr.detail && <span className="text-muted-foreground">— {cr.detail}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
