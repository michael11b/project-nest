import { useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuditLogs, type AuditLogFilters } from "@/hooks/useAuditLogs";
import { useMembers } from "@/hooks/useMembers";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const COMMON_ACTIONS = [
  "prompt.created",
  "prompt.updated",
  "prompt.deleted",
  "version.created",
  "version.updated",
  "release.created",
  "member.added",
  "member.removed",
  "suite.created",
  "suite.updated",
  "suite.deleted",
  "drift_policy.created",
  "drift_policy.updated",
  "drift_policy.deleted",
  "provider_key.created",
  "provider_key.updated",
  "provider_key.deleted",
];

export default function AuditLogsSettings() {
  const { workspace } = useWorkspace();
  const { data: members } = useMembers(workspace.id);

  const [action, setAction] = useState<string>("");
  const [actorId, setActorId] = useState<string>("");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [page, setPage] = useState(0);

  const filters: AuditLogFilters = {
    action: action || undefined,
    actorId: actorId || undefined,
    from: fromDate,
    to: toDate,
    page,
  };

  const { data: events, isLoading } = useAuditLogs(workspace.id, filters);

  const formatMeta = (meta: unknown) => {
    if (!meta || typeof meta !== "object") return "—";
    const entries = Object.entries(meta as Record<string, unknown>).slice(0, 3);
    if (entries.length === 0) return "—";
    return entries.map(([k, v]) => `${k}: ${String(v)}`).join(", ");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Audit Logs</h2>
        <p className="text-muted-foreground">View workspace activity history.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={action} onValueChange={(v) => { setAction(v === "__all__" ? "" : v); setPage(0); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All actions</SelectItem>
            {COMMON_ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actorId} onValueChange={(v) => { setActorId(v === "__all__" ? "" : v); setPage(0); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All actors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All actors</SelectItem>
            {members?.map((m) => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.profile?.display_name || m.profile?.email || "Unknown"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !fromDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {fromDate ? format(fromDate, "PP") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={fromDate} onSelect={(d) => { setFromDate(d ?? undefined); setPage(0); }} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !toDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {toDate ? format(toDate, "PP") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={toDate} onSelect={(d) => { setToDate(d ?? undefined); setPage(0); }} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        {(action || actorId || fromDate || toDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setAction(""); setActorId(""); setFromDate(undefined); setToDate(undefined); setPage(0); }}>
            Clear filters
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>Read-only log of all workspace events.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : !events?.length ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No audit events found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {format(new Date(ev.created_at), "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {ev.actorName || "System"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">{ev.action}</Badge>
                    </TableCell>
                    <TableCell>
                      {ev.target_type ? (
                        <Badge variant="outline" className="text-xs">{ev.target_type}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                      {formatMeta(ev.metadata_json)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Prev
            </Button>
            <span className="text-sm text-muted-foreground">Page {page + 1}</span>
            <Button variant="outline" size="sm" disabled={!events || events.length < 50} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
