import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Undo2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PromptVersion } from "@/hooks/usePromptVersions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versionA: PromptVersion;
  versionB: PromptVersion;
  canEdit?: boolean;
}

type Message = { role: string; content: string };

function parseMessages(version: PromptVersion): Message[] {
  const content = version.content_json;
  if (Array.isArray(content)) return content as Message[];
  return [];
}

/** Simple line-level diff: returns lines with type "same", "added", "removed" */
function diffLines(a: string, b: string): { type: "same" | "added" | "removed"; text: string }[] {
  const linesA = a.split("\n");
  const linesB = b.split("\n");
  const result: { type: "same" | "added" | "removed"; text: string }[] = [];

  // Simple LCS-based diff
  const m = linesA.length;
  const n = linesB.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (linesA[i - 1] === linesB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  const diff: { type: "same" | "added" | "removed"; text: string }[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      diff.unshift({ type: "same", text: linesA[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({ type: "added", text: linesB[j - 1] });
      j--;
    } else {
      diff.unshift({ type: "removed", text: linesA[i - 1] });
      i--;
    }
  }

  return diff;
}

function MessageDiff({ msgA, msgB }: { msgA?: Message; msgB?: Message }) {
  const contentA = msgA?.content ?? "";
  const contentB = msgB?.content ?? "";
  const roleA = msgA?.role ?? "";
  const roleB = msgB?.role ?? "";
  const lines = useMemo(() => diffLines(contentA, contentB), [contentA, contentB]);

  const roleChanged = roleA !== roleB;

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b border-border">
        {roleChanged ? (
          <>
            <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive line-through">{roleA || "—"}</Badge>
            <span className="text-xs text-muted-foreground">→</span>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary">{roleB || "—"}</Badge>
          </>
        ) : (
          <Badge variant="outline" className="text-xs">{roleA || roleB || "message"}</Badge>
        )}
      </div>
      <div className="font-mono text-xs leading-relaxed">
        {lines.map((line, i) => (
          <div
            key={i}
            className={
              line.type === "added"
                ? "bg-primary/10 text-primary px-3 py-0.5"
                : line.type === "removed"
                ? "bg-destructive/10 text-destructive line-through px-3 py-0.5"
                : "px-3 py-0.5 text-foreground"
            }
          >
            <span className="select-none text-muted-foreground mr-2 inline-block w-4 text-right">
              {line.type === "added" ? "+" : line.type === "removed" ? "−" : " "}
            </span>
            {line.text || " "}
          </div>
        ))}
      </div>
    </div>
  );
}

export function VersionCompareDialog({ open, onOpenChange, versionA, versionB, canEdit }: Props) {
  const messagesA = useMemo(() => parseMessages(versionA), [versionA]);
  const messagesB = useMemo(() => parseMessages(versionB), [versionB]);
  const [confirmRevert, setConfirmRevert] = useState<PromptVersion | null>(null);
  const queryClient = useQueryClient();

  const revertMutation = useMutation({
    mutationFn: async (targetVersion: PromptVersion) => {
      // Get latest version number
      const { data: versions, error: fetchErr } = await supabase
        .from("prompt_versions")
        .select("version_number")
        .eq("prompt_id", targetVersion.prompt_id)
        .order("version_number", { ascending: false })
        .limit(1);
      if (fetchErr) throw fetchErr;
      const nextNum = (versions?.[0]?.version_number ?? 0) + 1;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("prompt_versions").insert({
        prompt_id: targetVersion.prompt_id,
        version_number: nextNum,
        content_json: targetVersion.content_json,
        settings_json: targetVersion.settings_json,
        contract_json: targetVersion.contract_json,
        changelog: `Reverted to v${targetVersion.version_number}`,
        created_by: user.user.id,
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("New version created from revert");
      queryClient.invalidateQueries({ queryKey: ["prompt-versions"] });
      setConfirmRevert(null);
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Match messages by index
  const maxLen = Math.max(messagesA.length, messagesB.length);

  // Settings diff
  const settingsA = JSON.stringify(versionA.settings_json, null, 2);
  const settingsB = JSON.stringify(versionB.settings_json, null, 2);
  const settingsChanged = settingsA !== settingsB;
  const settingsDiff = useMemo(
    () => (settingsChanged ? diffLines(settingsA, settingsB) : []),
    [settingsA, settingsB, settingsChanged]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Compare v{versionA.version_number} → v{versionB.version_number}
            </DialogTitle>
            <DialogDescription>
              <span className="text-destructive">Red</span> = removed from v{versionA.version_number},
              {" "}<span className="text-primary">Green</span> = added in v{versionB.version_number}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-2">
              {/* Changelog diff */}
              {versionB.changelog && versionB.changelog !== versionA.changelog && (
                <div className="rounded-md border border-border p-3 bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Changelog (v{versionB.version_number})</p>
                  <p className="text-sm text-foreground">{versionB.changelog}</p>
                </div>
              )}

              {/* Messages diff */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Messages</h3>
                {Array.from({ length: maxLen }).map((_, idx) => (
                  <MessageDiff
                    key={idx}
                    msgA={messagesA[idx]}
                    msgB={messagesB[idx]}
                  />
                ))}
                {maxLen === 0 && (
                  <p className="text-sm text-muted-foreground">No messages in either version.</p>
                )}
              </div>

              {/* Settings diff */}
              {settingsChanged && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Settings</h3>
                  <div className="border border-border rounded-md font-mono text-xs leading-relaxed overflow-hidden">
                    {settingsDiff.map((line, i) => (
                      <div
                        key={i}
                        className={
                          line.type === "added"
                            ? "bg-primary/10 text-primary px-3 py-0.5"
                            : line.type === "removed"
                            ? "bg-destructive/10 text-destructive line-through px-3 py-0.5"
                            : "px-3 py-0.5 text-foreground"
                        }
                      >
                        <span className="select-none text-muted-foreground mr-2 inline-block w-4 text-right">
                          {line.type === "added" ? "+" : line.type === "removed" ? "−" : " "}
                        </span>
                        {line.text || " "}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {canEdit && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => setConfirmRevert(versionA)}>
                <Undo2 className="h-4 w-4 mr-1" /> Revert to v{versionA.version_number}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmRevert(versionB)}>
                <Undo2 className="h-4 w-4 mr-1" /> Revert to v{versionB.version_number}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmRevert} onOpenChange={(o) => !o && setConfirmRevert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to v{confirmRevert?.version_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new draft version with the content from v{confirmRevert?.version_number}. No existing versions will be modified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRevert && revertMutation.mutate(confirmRevert)}
              disabled={revertMutation.isPending}
            >
              {revertMutation.isPending ? "Reverting…" : "Revert"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
