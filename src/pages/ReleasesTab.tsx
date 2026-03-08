import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePrompt } from "@/hooks/usePrompt";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Rocket, Clock } from "lucide-react";
import { format } from "date-fns";
import { PromoteVersionDialog } from "@/components/PromoteVersionDialog";

interface Environment {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

interface ReleaseRow {
  id: string;
  created_at: string;
  notes: string | null;
  environment_id: string;
  prompt_version_id: string;
  released_by: string;
  prompt_versions: { version_number: number } | null;
  environments: { name: string; slug: string } | null;
  profiles: { display_name: string | null } | null;
}

function useEnvironments(workspaceId: string) {
  return useQuery({
    queryKey: ["environments", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("environments")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("sort_order");
      if (error) throw error;
      return data as Environment[];
    },
  });
}

function useReleases(promptId: string) {
  return useQuery({
    queryKey: ["releases", promptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("releases")
        .select(
          "id, created_at, notes, environment_id, prompt_version_id, released_by, prompt_versions(version_number), environments(name, slug), profiles:released_by(display_name)"
        )
        .eq("prompt_id", promptId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ReleaseRow[];
    },
  });
}

const envColorMap: Record<string, string> = {
  dev: "bg-blue-500/10 text-blue-700 border-blue-200",
  staging: "bg-amber-500/10 text-amber-700 border-amber-200",
  prod: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
};

export default function ReleasesTab() {
  const { prompt } = usePrompt();
  const { workspace } = useWorkspace();
  const { data: environments, isLoading: envsLoading } = useEnvironments(workspace.id);
  const { data: releases, isLoading: releasesLoading } = useReleases(prompt.id);

  const [promoteEnv, setPromoteEnv] = useState<Environment | null>(null);

  const latestByEnv = (envId: string) =>
    releases?.find((r) => r.environment_id === envId) ?? null;

  if (envsLoading || releasesLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Environment cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {environments?.map((env) => {
          const latest = latestByEnv(env.id);
          return (
            <Card key={env.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold capitalize">
                    {env.name}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={envColorMap[env.slug] ?? ""}
                  >
                    {env.slug}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {latest ? (
                  <>
                    <div className="text-2xl font-bold font-mono">
                      v{latest.prompt_versions?.version_number}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(latest.created_at), "MMM d, yyyy HH:mm")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      by {latest.profiles?.display_name ?? "Unknown"}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No release yet</p>
                )}
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => setPromoteEnv(env)}
                >
                  <Rocket className="h-3.5 w-3.5 mr-1" />
                  Promote
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Release history */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Release History</h3>
        {!releases?.length ? (
          <p className="text-sm text-muted-foreground">No releases yet.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Environment</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Released By</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {releases.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          envColorMap[r.environments?.slug ?? ""] ?? ""
                        }
                      >
                        {r.environments?.name ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      v{r.prompt_versions?.version_number}
                    </TableCell>
                    <TableCell>
                      {r.profiles?.display_name ?? "Unknown"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {r.notes || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(r.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Promote dialog */}
      {promoteEnv && (
        <PromoteVersionDialog
          open={!!promoteEnv}
          onOpenChange={(open) => !open && setPromoteEnv(null)}
          environment={promoteEnv}
          promptId={prompt.id}
        />
      )}
    </div>
  );
}
