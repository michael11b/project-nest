import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Play, Layers, AlertTriangle, Clock } from "lucide-react";

export default function Dashboard() {
  const { workspace } = useWorkspace();
  const { user } = useAuth();

  const { data: recentlyViewed } = useQuery({
    queryKey: ["recently-viewed", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_views")
        .select("prompt_id, viewed_at, prompts:prompts(id, name, slug, workspace_id, workspaces:workspaces(slug))")
        .eq("user_id", user!.id)
        .order("viewed_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: recentPrompts } = useQuery({
    queryKey: ["dashboard-prompts", workspace.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("prompts")
        .select("id, name, slug, updated_at")
        .eq("workspace_id", workspace.id)
        .order("updated_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: recentRuns } = useQuery({
    queryKey: ["dashboard-runs", workspace.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("eval_runs")
        .select("id, status, score, model, created_at, prompt_version_id, prompt_versions(prompt_id)")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: environments } = useQuery({
    queryKey: ["dashboard-envs", workspace.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("environments")
        .select("id, name, slug, sort_order")
        .eq("workspace_id", workspace.id)
        .order("sort_order");
      return data ?? [];
    },
  });

  const { data: alertCount } = useQuery({
    queryKey: ["dashboard-alerts", workspace.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("drift_alerts")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .eq("status", "open");
      return count ?? 0;
    },
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "succeeded": return "default";
      case "failed": return "destructive";
      case "running": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of {workspace.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Prompts */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Recent Prompts</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPrompts?.length ? (
              <ul className="space-y-2">
                {recentPrompts.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/w/${workspace.slug}/prompts/${p.id}`}
                      className="flex items-center justify-between text-sm rounded-md px-2 py-1.5 -mx-2 hover:bg-accent transition-colors"
                    >
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(p.updated_at).toLocaleDateString()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No prompts yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Eval Runs */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Play className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Recent Eval Runs</CardTitle>
          </CardHeader>
          <CardContent>
            {recentRuns?.length ? (
              <ul className="space-y-2">
                {recentRuns.map((r) => {
                  const promptId = (r as any).prompt_versions?.prompt_id;
                  const inner = (
                    <div className="flex items-center justify-between text-sm w-full">
                      <div className="flex items-center gap-2">
                        <Badge variant={statusColor(r.status) as any}>{r.status}</Badge>
                        <span className="text-xs text-muted-foreground">{r.model}</span>
                      </div>
                      {r.score !== null && (
                        <span className="text-xs font-mono">{(Number(r.score) * 100).toFixed(0)}%</span>
                      )}
                    </div>
                  );
                  return (
                    <li key={r.id}>
                      {promptId ? (
                        <Link
                          to={`/w/${workspace.slug}/prompts/${promptId}/evals/${r.id}`}
                          className="flex rounded-md px-2 py-1.5 -mx-2 hover:bg-accent transition-colors"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <div className="flex px-2 py-1.5 -mx-2">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No eval runs yet</p>
            )}
          </CardContent>
        </Card>

        {/* Environments */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Environments</CardTitle>
          </CardHeader>
          <CardContent>
            {environments?.length ? (
              <ul className="space-y-2">
                {environments.map((env) => (
                  <li key={env.id} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{env.name}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No environments</p>
            )}
          </CardContent>
        </Card>

        {/* Drift Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Drift Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {alertCount && alertCount > 0 ? (
              <p className="text-sm">
                <span className="text-2xl font-bold">{alertCount}</span>{" "}
                <span className="text-muted-foreground">open alert{alertCount > 1 ? "s" : ""}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No open alerts</p>
            )}
          </CardContent>
        </Card>

        {/* Recently Viewed */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Recently Viewed</CardTitle>
          </CardHeader>
          <CardContent>
            {recentlyViewed?.length ? (
              <ul className="space-y-2">
                {recentlyViewed.map((v: any) => {
                  const prompt = v.prompts;
                  if (!prompt) return null;
                  const wsSlug = prompt.workspaces?.slug;
                  const link = wsSlug
                    ? `/w/${wsSlug}/prompts/${prompt.id}`
                    : `/explore/${prompt.id}`;
                  return (
                    <li key={v.prompt_id}>
                      <Link
                        to={link}
                        className="flex items-center justify-between text-sm rounded-md px-2 py-1.5 -mx-2 hover:bg-accent transition-colors"
                      >
                        <span className="truncate font-medium">{prompt.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(v.viewed_at).toLocaleDateString()}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No recently viewed prompts</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
