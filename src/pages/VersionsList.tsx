import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePrompt } from "@/hooks/usePrompt";
import { usePromptVersions, type PromptVersion } from "@/hooks/usePromptVersions";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, GitCompare, Undo2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { VersionCompareDialog } from "@/components/VersionCompareDialog";

export default function VersionsList() {
  const { prompt } = usePrompt();
  const { workspace, role } = useWorkspace();
  const navigate = useNavigate();
  const { data: versions, isLoading } = usePromptVersions(prompt.id);
  const canEdit = role === "owner" || role === "admin" || role === "editor";

  const [selected, setSelected] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= 2) return [prev[1], id]; // Replace oldest
      return [...prev, id];
    });
  };

  const compareVersions = versions
    ? selected
        .map((id) => versions.find((v) => v.id === id))
        .filter(Boolean)
        .sort((a, b) => a!.version_number - b!.version_number) as PromptVersion[]
    : [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Versions</h2>
        <div className="flex items-center gap-2">
          {selected.length === 2 && (
            <Button variant="outline" size="sm" onClick={() => setCompareOpen(true)}>
              <GitCompare className="h-4 w-4 mr-1" /> Compare
            </Button>
          )}
          {selected.length > 0 && selected.length < 2 && (
            <span className="text-xs text-muted-foreground">Select one more to compare</span>
          )}
          {canEdit && versions?.length ? (
            <Button onClick={() => navigate(versions[0].id)}>
              <Plus className="h-4 w-4 mr-2" /> New Version
            </Button>
          ) : null}
        </div>
      </div>

      {!versions?.length ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No versions yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <span className="sr-only">Compare</span>
              </TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Changelog</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((v) => (
              <TableRow
                key={v.id}
                className="cursor-pointer"
                onClick={() => navigate(v.id)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.includes(v.id)}
                    onCheckedChange={() => toggleSelect(v.id)}
                  />
                </TableCell>
                <TableCell className="font-medium flex items-center gap-1.5">
                  v{v.version_number}
                  {v.changelog?.startsWith("Reverted to v") && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Undo2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">{v.changelog}</TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs capitalize">{v.status}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                  {v.changelog || "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(v.created_at), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {compareVersions.length === 2 && (
        <VersionCompareDialog
          open={compareOpen}
          onOpenChange={setCompareOpen}
          versionA={compareVersions[0]}
          versionB={compareVersions[1]}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}
