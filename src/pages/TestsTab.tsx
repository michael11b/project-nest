import { useState } from "react";
import { usePrompt } from "@/hooks/usePrompt";
import { useTestSuites, useCreateTestSuite, useUpdateTestSuite, useDeleteTestSuite } from "@/hooks/useTestSuites";
import { useTestCases } from "@/hooks/useTestCases";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import TestCaseEditor from "@/components/TestCaseEditor";

export default function TestsTab() {
  const { prompt } = usePrompt();
  const { data: suites, isLoading } = useTestSuites(prompt.id);
  const { user } = useAuth();

  const [suiteDialogOpen, setSuiteDialogOpen] = useState(false);
  const [editingSuite, setEditingSuite] = useState<{ id: string; name: string; description: string } | null>(null);
  const [suiteName, setSuiteName] = useState("");
  const [suiteDesc, setSuiteDesc] = useState("");

  const createSuite = useCreateTestSuite();
  const updateSuite = useUpdateTestSuite();
  const deleteSuite = useDeleteTestSuite();

  const openCreateDialog = () => {
    setEditingSuite(null);
    setSuiteName("");
    setSuiteDesc("");
    setSuiteDialogOpen(true);
  };

  const openEditDialog = (suite: { id: string; name: string; description: string | null }) => {
    setEditingSuite({ id: suite.id, name: suite.name, description: suite.description ?? "" });
    setSuiteName(suite.name);
    setSuiteDesc(suite.description ?? "");
    setSuiteDialogOpen(true);
  };

  const handleSaveSuite = async () => {
    if (!suiteName.trim()) return;
    try {
      if (editingSuite) {
        await updateSuite.mutateAsync({ id: editingSuite.id, prompt_id: prompt.id, name: suiteName.trim(), description: suiteDesc.trim() || null });
        toast.success("Suite updated");
      } else {
        await createSuite.mutateAsync({ prompt_id: prompt.id, created_by: user!.id, name: suiteName.trim(), description: suiteDesc.trim() || null });
        toast.success("Suite created");
      }
      setSuiteDialogOpen(false);
    } catch {
      toast.error("Failed to save suite");
    }
  };

  const handleDeleteSuite = async (id: string) => {
    try {
      await deleteSuite.mutateAsync({ id, promptId: prompt.id });
      toast.success("Suite deleted");
    } catch {
      toast.error("Failed to delete suite");
    }
  };

  if (isLoading) {
    return <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Test Suites</h2>
        <Button size="sm" onClick={openCreateDialog}><Plus className="h-4 w-4 mr-1" />Create Suite</Button>
      </div>

      {!suites?.length ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">No test suites yet.</p>
          <Button onClick={openCreateDialog}><Plus className="h-4 w-4 mr-1" />Create your first suite</Button>
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {suites.map((suite) => (
            <AccordionItem key={suite.id} value={suite.id} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left flex-1">
                  <span className="font-medium">{suite.name}</span>
                  <Badge variant="secondary" className="text-xs">{suite.case_count} cases</Badge>
                  {suite.description && <span className="text-xs text-muted-foreground truncate max-w-xs">{suite.description}</span>}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex gap-2 mb-3">
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(suite)}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteSuite(suite.id)}><Trash2 className="h-3 w-3 mr-1" />Delete</Button>
                </div>
                <SuiteCases suiteId={suite.id} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <Dialog open={suiteDialogOpen} onOpenChange={setSuiteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSuite ? "Edit Suite" : "Create Suite"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Suite name" value={suiteName} onChange={(e) => setSuiteName(e.target.value)} />
            <Textarea placeholder="Description (optional)" value={suiteDesc} onChange={(e) => setSuiteDesc(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuiteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSuite} disabled={!suiteName.trim() || createSuite.isPending || updateSuite.isPending}>
              {editingSuite ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SuiteCases({ suiteId }: { suiteId: string }) {
  const { data: cases, isLoading } = useTestCases(suiteId);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<string | null>(null);

  if (isLoading) return <Skeleton className="h-20 w-full" />;

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => { setEditingCase(null); setEditorOpen(true); }}>
          <Plus className="h-3 w-3 mr-1" />Add Test Case
        </Button>
      </div>

      {cases?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Inputs</TableHead>
              <TableHead>Checks</TableHead>
              <TableHead>Critical</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.map((tc) => (
              <TableRow key={tc.id} className="cursor-pointer" onClick={() => { setEditingCase(tc.id); setEditorOpen(true); }}>
                <TableCell className="font-medium">{tc.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                  {JSON.stringify(tc.inputs_json).slice(0, 60)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{(tc.checks_json as unknown[]).length}</Badge>
                </TableCell>
                <TableCell>
                  {tc.critical && <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Critical</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No test cases yet.</p>
      )}

      <TestCaseEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        suiteId={suiteId}
        caseId={editingCase}
      />
    </div>
  );
}
