import { useNavigate } from "react-router-dom";
import { usePrompt } from "@/hooks/usePrompt";
import { usePromptVersions } from "@/hooks/usePromptVersions";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { format } from "date-fns";

export default function VersionsList() {
  const { prompt } = usePrompt();
  const { workspace, role } = useWorkspace();
  const navigate = useNavigate();
  const { data: versions, isLoading } = usePromptVersions(prompt.id);
  const canEdit = role === "owner" || role === "admin" || role === "editor";

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
        {canEdit && versions?.length ? (
          <Button onClick={() => navigate(versions[0].id)}>
            <Plus className="h-4 w-4 mr-2" /> New Version
          </Button>
        ) : null}
      </div>

      {!versions?.length ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No versions yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell className="font-medium">v{v.version_number}</TableCell>
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
    </div>
  );
}
