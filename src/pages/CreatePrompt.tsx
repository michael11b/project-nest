import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { generateSlug } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Plus, Trash2, GripVertical } from "lucide-react";

type Message = { role: "system" | "user" | "assistant"; content: string };

export default function CreatePrompt() {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — Meta
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [visibility, setVisibility] = useState<"private" | "workspace" | "public">("workspace");

  // Step 2 — Messages
  const [messages, setMessages] = useState<Message[]>([
    { role: "system", content: "" },
  ]);

  // Step 3 — Contract
  const [inputSchema, setInputSchema] = useState("{}");
  const [outputType, setOutputType] = useState<"text" | "json">("text");
  const [outputSchema, setOutputSchema] = useState("{}");

  const handleNameChange = (v: string) => {
    setName(v);
    setSlug(generateSlug(v));
  };

  const addMessage = () => setMessages([...messages, { role: "user", content: "" }]);
  const removeMessage = (i: number) => setMessages(messages.filter((_, idx) => idx !== i));
  const updateMessage = (i: number, field: keyof Message, value: string) => {
    const next = [...messages];
    (next[i] as any)[field] = value;
    setMessages(next);
  };

  const tags = tagsInput
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const canNext1 = name.trim() && slug.trim();
  const canNext2 = messages.length > 0 && messages.every((m) => m.content.trim());

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { data: prompt, error: pErr } = await supabase
        .from("prompts")
        .insert({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          tags: tags.length ? tags : null,
          visibility,
          workspace_id: workspace.id,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (pErr) throw pErr;

      const { error: vErr } = await supabase.from("prompt_versions").insert({
        prompt_id: prompt.id,
        version_number: 1,
        status: "draft",
        content_json: messages,
        contract_json: {
          input_schema: JSON.parse(inputSchema),
          output_type: outputType,
          ...(outputType === "json" ? { output_schema: JSON.parse(outputSchema) } : {}),
        },
        settings_json: {},
        created_by: user.id,
      });

      if (vErr) throw vErr;

      toast({ title: "Prompt created" });
      navigate(`/w/${workspace.slug}/prompts/${prompt.id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Create Prompt</h1>
      </div>

      {/* Step indicators */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Prompt Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="My Prompt" />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-prompt" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this prompt do?" />
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="classification, v2" />
              {tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {tags.map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="workspace">Workspace</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Use <code className="text-xs bg-muted px-1 py-0.5 rounded">{"{{variable}}"}</code> syntax for template variables.
            </p>
            {messages.map((msg, i) => (
              <div key={i} className="flex gap-3 items-start border rounded-lg p-3">
                <div className="space-y-2 flex-1">
                  <Select value={msg.role} onValueChange={(v: any) => updateMessage(i, "role", v)}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="assistant">Assistant</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={msg.content}
                    onChange={(e) => updateMessage(i, "content", e.target.value)}
                    placeholder="Message content..."
                    className="min-h-[100px]"
                  />
                </div>
                {messages.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeMessage(i)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" onClick={addMessage}>
              <Plus className="h-4 w-4 mr-2" />
              Add Message
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Contract</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Input Schema (JSON)</Label>
              <Textarea
                value={inputSchema}
                onChange={(e) => setInputSchema(e.target.value)}
                placeholder='{"query": "string"}'
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Output Type</Label>
              <Select value={outputType} onValueChange={(v: any) => setOutputType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {outputType === "json" && (
              <div className="space-y-2">
                <Label>Output JSON Schema</Label>
                <Textarea
                  value={outputSchema}
                  onChange={(e) => setOutputSchema(e.target.value)}
                  placeholder='{"type": "object"}'
                  className="font-mono text-sm"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep(step + 1)} disabled={step === 1 ? !canNext1 : !canNext2}>
            Next <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating..." : "Create Prompt"}
          </Button>
        )}
      </div>
    </div>
  );
}
