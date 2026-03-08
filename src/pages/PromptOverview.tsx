import { usePrompt } from "@/hooks/usePrompt";
import { useLatestVersion } from "@/hooks/usePromptVersions";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function PromptOverview() {
  const { prompt } = usePrompt();
  const { data: latestVersion, isLoading: vLoading } = useLatestVersion(prompt.id);
  const { workspace } = useWorkspace();

  const { data: environments } = useQuery({
    queryKey: ["environments", workspace.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("environments")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: releases } = useQuery({
    queryKey: ["releases", prompt.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("releases")
        .select("*, prompt_versions(version_number), environments(name, slug)")
        .eq("prompt_id", prompt.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Latest release per environment
  const latestReleases = (environments ?? []).map((env) => {
    const rel = (releases ?? []).find((r: any) => r.environment_id === env.id);
    return { env, release: rel };
  });

  const messageCount = Array.isArray(latestVersion?.content_json)
    ? (latestVersion.content_json as any[]).length
    : 0;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Description */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {prompt.description || "No description provided."}
          </p>
        </CardContent>
      </Card>

      {/* Latest Version */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest Version</CardTitle>
        </CardHeader>
        <CardContent>
          {vLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : latestVersion ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">v{latestVersion.version_number}</span>
                <Badge variant="secondary" className="text-xs capitalize">
                  {latestVersion.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {messageCount} message{messageCount !== 1 ? "s" : ""} · Created{" "}
                {format(new Date(latestVersion.created_at), "MMM d, yyyy")}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No versions yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Release Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Releases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {latestReleases.map(({ env, release }) => (
              <div key={env.id} className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{env.name}</span>
                {release ? (
                  <Badge variant="secondary" className="text-xs">
                    v{(release as any).prompt_versions?.version_number}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Not released</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
