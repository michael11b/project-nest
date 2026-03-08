import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePrompt } from "@/hooks/usePrompt";
import { usePromptVersion, usePromptVersions } from "@/hooks/usePromptVersions";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Save } from "lucide-react";

type Message = { role: string; content: string };

export default function VersionEditor() {
  const { versionId } = useParams<{ versionId: string }>();
  const { prompt } = usePrompt();
  const { workspace, role } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: version, isLoading } = usePromptVersion(versionId);
  const { data: allVersions } = usePromptVersions(prompt.id);
  const canEdit = role === "owner" || role === "admin" || role === "editor";

  const [messages, setMessages] = useState<Message[] | null>(null);
  const [inputSchema, setInputSchema] = useState<string | null>(null);
  const [outputType, setOutputType] = useState<string | null>(null);
  const [outputSchema, setOutputSchema] = useState<string | null>(null);
  const [showSave, setShowSave] = useState(false);
  const [changelog, setChangelog] = useState("");
  const [saving, setSaving] = useState(false);

  // Initialize from version data
  const currentMessages = messages ?? (Array.isArray(version?.content_json) ? version.content_json as Message[] : []);
  const contract = version?.contract_json as any ?? {};
  const currentInputSchema = inputSchema ?? JSON.stringify(contract.input_schema ?? {}, null, 2);
  const currentOutputType = outputType ?? (contract.output_type ?? "text");
  const currentOutputSchema = outputSchema ?? JSON.stringify(contract.output_schema ?? {}, null, 2);

  const isDirty = messages !== null || inputSchema !== null || outputType !== null || outputSchema !== null;

  const updateMessage = (i: number, field: string, value: string) => {
    const next = [...currentMessages];
    (next[i] as any)[field] = value;
    setMessages(next);
  };
  const addMessage = () => setMessages([...currentMessages, { role: "user", content: "" }]);
  const removeMessage = (i: number) => setMessages(currentMessages.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!user || !allVersions) return;
    setSaving(true);
    try {
      const maxVersion = Math.max(...allVersions.map((v) => v.version_number));
      const { data, error } = await supabase
        .from("prompt_versions")
        .insert({
          prompt_id: prompt.id,
          version_number: maxVersion + 1,
          status: "draft",
          content_json: currentMessages,
          contract_json: {
            input_schema: JSON.parse(currentInputSchema),
            output_type: currentOutputType,
            ...(currentOutputType === "json" ? { output_schema: JSON.parse(currentOutputSchema) } : {}),
          },
          settings_json: version?.settings_json ?? {},
          changelog: changelog.trim() || null,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;
      toast({ title: `Version v${maxVersion + 1} created` });
      navigate(`/w/${workspace.slug}/prompts/${prompt.id}/versions/${data.id}`, { replace: true });
      // Reset dirty state
      setMessages(null);
      setInputSchema(null);
      setOutputType(null);
      setOutputSchema(null);
      setChangelog("");
      setShowSave(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!version) {
    return <p className="text-muted-foreground text-center py-8">Version not found.</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">v{version.version_number}</h2>
          <Badge variant="secondary" className="text-xs capitalize">{version.status}</Badge>
        </div>
        {canEdit && isDirty && (
          <Button onClick={() => setShowSave(true)}>
            <Save className="h-4 w-4 mr-2" /> Save as New Version
          </Button>
        )}
      </div>

      {/* Messages */}
      <Card>
        <CardHeader><CardTitle className="text-base">Messages</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {currentMessages.map((msg, i) => (
            <div key={i} className="flex gap-3 items-start border rounded-lg p-3">
              <div className="space-y-2 flex-1">
                <Select
                  value={msg.role}
                  onValueChange={(v) => updateMessage(i, "role", v)}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="assistant">Assistant</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  value={msg.content}
                  onChange={(e) => updateMessage(i, "content", e.target.value)}
                  disabled={!canEdit}
                  className="min-h-[100px] font-mono text-sm"
                />
              </div>
              {canEdit && currentMessages.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => removeMessage(i)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          ))}
          {canEdit && (
            <Button variant="outline" onClick={addMessage}>
              <Plus className="h-4 w-4 mr-2" /> Add Message
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Contract */}
      <Card>
        <CardHeader><CardTitle className="text-base">Contract</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Input Schema (JSON)</Label>
            <Textarea
              value={currentInputSchema}
              onChange={(e) => setInputSchema(e.target.value)}
              disabled={!canEdit}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label>Output Type</Label>
            <Select
              value={currentOutputType}
              onValueChange={(v) => setOutputType(v)}
              disabled={!canEdit}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {currentOutputType === "json" && (
            <div className="space-y-2">
              <Label>Output JSON Schema</Label>
              <Textarea
                value={currentOutputSchema}
                onChange={(e) => setOutputSchema(e.target.value)}
                disabled={!canEdit}
                className="font-mono text-sm"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save dialog */}
      <Dialog open={showSave} onOpenChange={setShowSave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as New Version</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Changelog (optional)</Label>
            <Textarea
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="What changed in this version?"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSave(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Create Version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
