import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Plus, Search } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  in_review: "bg-accent text-accent-foreground",
  approved: "bg-primary text-primary-foreground",
  deprecated: "bg-destructive text-destructive-foreground",
};

export default function PromptList() {
  const { workspace, role } = useWorkspace();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const visibility = searchParams.get("visibility") ?? "all";
  const sort = searchParams.get("sort") ?? "updated_at";
  const canCreate = role === "owner" || role === "admin" || role === "editor";

  const { data: prompts, isLoading } = useQuery({
    queryKey: ["prompts", workspace.id, q, visibility, sort],
    queryFn: async () => {
      let query = supabase
        .from("prompts")
        .select("*, prompt_versions(version_number, status, created_at)")
        .eq("workspace_id", workspace.id)
        .order(sort === "name" ? "name" : "updated_at", { ascending: sort === "name" });

      if (q) {
        query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
      }
      if (visibility !== "all") {
        query = query.eq("visibility", visibility as "private" | "workspace" | "public");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const getLatestVersion = (prompt: any) => {
    const versions = prompt.prompt_versions ?? [];
    if (!versions.length) return null;
    return versions.reduce((a: any, b: any) =>
      a.version_number > b.version_number ? a : b
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Prompts</h1>
        {canCreate && (
          <Button onClick={() => navigate("new")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Prompt
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            value={q}
            onChange={(e) => updateFilter("q", e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={visibility} onValueChange={(v) => updateFilter("visibility", v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="workspace">Workspace</SelectItem>
            <SelectItem value="public">Public</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => updateFilter("sort", v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated_at">Last Updated</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !prompts?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-semibold">No prompts yet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first prompt to get started.
          </p>
          {canCreate && (
            <Button onClick={() => navigate("new")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Prompt
            </Button>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Latest Version</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prompts.map((prompt) => {
              const latest = getLatestVersion(prompt);
              return (
                <TableRow
                  key={prompt.id}
                  className="cursor-pointer"
                  onClick={() => navigate(prompt.id)}
                >
                  <TableCell className="font-medium">{prompt.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {(prompt.tags ?? []).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {prompt.visibility}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {latest ? (
                      <Badge className={`text-xs ${STATUS_COLORS[latest.status] ?? ""}`}>
                        v{latest.version_number} · {latest.status}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(prompt.updated_at), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
