import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { useTestCases, useUpsertTestCase, useDeleteTestCase, type TestCase } from "@/hooks/useTestCases";
import type { Json } from "@/integrations/supabase/types";

const CHECK_TYPES = [
  { value: "json_valid", label: "JSON Valid", fields: [] },
  { value: "json_schema", label: "JSON Schema", fields: [{ key: "schema", label: "JSON Schema", type: "textarea" }] },
  { value: "required_keys", label: "Required Keys", fields: [{ key: "keys", label: "Keys (comma-separated)", type: "text" }] },
  { value: "regex", label: "Regex", fields: [{ key: "pattern", label: "Pattern", type: "text" }] },
  { value: "banned_phrases", label: "Banned Phrases", fields: [{ key: "phrases", label: "Phrases (comma-separated)", type: "text" }] },
  { value: "max_length", label: "Max Length", fields: [{ key: "max", label: "Max characters", type: "number" }] },
  { value: "contains", label: "Contains", fields: [{ key: "text", label: "Text to find", type: "text" }] },
] as const;

interface Check {
  type: string;
  config: Record<string, string | number>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suiteId: string;
  caseId: string | null;
}

export default function TestCaseEditor({ open, onOpenChange, suiteId, caseId }: Props) {
  const { data: cases } = useTestCases(suiteId);
  const upsert = useUpsertTestCase();
  const deleteCase = useDeleteTestCase();

  const [name, setName] = useState("Untitled");
  const [inputsJson, setInputsJson] = useState("{}");
  const [critical, setCritical] = useState(false);
  const [checks, setChecks] = useState<Check[]>([]);

  useEffect(() => {
    if (!open) return;
    if (caseId && cases) {
      const tc = cases.find((c) => c.id === caseId);
      if (tc) {
        setName(tc.name);
        setInputsJson(JSON.stringify(tc.inputs_json, null, 2));
        setCritical(tc.critical);
        setChecks((tc.checks_json as unknown as Check[]) ?? []);
        return;
      }
    }
    setName("Untitled");
    setInputsJson("{}");
    setCritical(false);
    setChecks([]);
  }, [open, caseId, cases]);

  const addCheck = () => setChecks([...checks, { type: "json_valid", config: {} }]);
  const removeCheck = (i: number) => setChecks(checks.filter((_, idx) => idx !== i));
  const updateCheckType = (i: number, type: string) => {
    const updated = [...checks];
    updated[i] = { type, config: {} };
    setChecks(updated);
  };
  const updateCheckConfig = (i: number, key: string, value: string | number) => {
    const updated = [...checks];
    updated[i] = { ...updated[i], config: { ...updated[i].config, [key]: value } };
    setChecks(updated);
  };

  const handleSave = async () => {
    let parsedInputs: Json;
    try {
      parsedInputs = JSON.parse(inputsJson);
    } catch {
      toast.error("Invalid JSON in inputs");
      return;
    }
    try {
      await upsert.mutateAsync({
        ...(caseId ? { id: caseId } : {}),
        suite_id: suiteId,
        name: name.trim() || "Untitled",
        inputs_json: parsedInputs,
        critical,
        checks_json: checks as unknown as Json,
      });
      toast.success(caseId ? "Test case updated" : "Test case created");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save test case");
    }
  };

  const handleDuplicate = async () => {
    if (!caseId || !cases) return;
    const tc = cases.find((c) => c.id === caseId);
    if (!tc) return;
    try {
      await upsert.mutateAsync({
        suite_id: suiteId,
        name: `${tc.name} (copy)`,
        inputs_json: tc.inputs_json,
        critical: tc.critical,
        checks_json: tc.checks_json,
      });
      toast.success("Test case duplicated");
      onOpenChange(false);
    } catch {
      toast.error("Failed to duplicate");
    }
  };

  const handleDelete = async () => {
    if (!caseId) return;
    try {
      await deleteCase.mutateAsync({ id: caseId, suiteId });
      toast.success("Test case deleted");
      onOpenChange(false);
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{caseId ? "Edit Test Case" : "New Test Case"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Inputs JSON</Label>
            <Textarea className="font-mono text-xs" rows={6} value={inputsJson} onChange={(e) => setInputsJson(e.target.value)} />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={critical} onCheckedChange={setCritical} />
            <Label>Critical (failures block promotion)</Label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Checks</Label>
              <Button size="sm" variant="outline" onClick={addCheck}><Plus className="h-3 w-3 mr-1" />Add Check</Button>
            </div>

            {checks.map((check, i) => {
              const typeDef = CHECK_TYPES.find((t) => t.value === check.type);
              return (
                <div key={i} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Select value={check.type} onValueChange={(v) => updateCheckType(i, v)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHECK_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" onClick={() => removeCheck(i)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  {typeDef?.fields.map((field) => (
                    <div key={field.key}>
                      <Label className="text-xs">{field.label}</Label>
                      {field.type === "textarea" ? (
                        <Textarea
                          className="font-mono text-xs mt-1"
                          rows={3}
                          value={(check.config[field.key] as string) ?? ""}
                          onChange={(e) => updateCheckConfig(i, field.key, e.target.value)}
                        />
                      ) : (
                        <Input
                          type={field.type}
                          className="mt-1"
                          value={(check.config[field.key] as string) ?? ""}
                          onChange={(e) => updateCheckConfig(i, field.key, field.type === "number" ? Number(e.target.value) : e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              );
            })}

            {!checks.length && <p className="text-xs text-muted-foreground">No checks added yet.</p>}
          </div>
        </div>

        <SheetFooter className="flex gap-2">
          {caseId && (
            <>
              <Button variant="outline" size="sm" onClick={handleDuplicate}><Copy className="h-3 w-3 mr-1" />Duplicate</Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}><Trash2 className="h-3 w-3 mr-1" />Delete</Button>
            </>
          )}
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {caseId ? "Save Changes" : "Create Case"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
