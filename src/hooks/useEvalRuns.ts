import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type EvalRun = Tables<"eval_runs">;
export type EvalResult = Tables<"eval_results">;

export function useEvalRuns(promptId: string | undefined) {
  const query = useQuery({
    queryKey: ["eval-runs", promptId],
    queryFn: async () => {
      // Get version ids for this prompt
      const { data: versions, error: vErr } = await supabase
        .from("prompt_versions")
        .select("id, version_number")
        .eq("prompt_id", promptId!);
      if (vErr) throw vErr;
      if (!versions.length) return [];

      const versionIds = versions.map((v) => v.id);
      const versionMap = Object.fromEntries(versions.map((v) => [v.id, v.version_number]));

      const { data: runs, error } = await supabase
        .from("eval_runs")
        .select("*, test_suites(name)")
        .in("prompt_version_id", versionIds)
        .order("created_at", { ascending: false });
      if (error) throw error;

      return runs.map((r) => ({
        ...r,
        version_number: versionMap[r.prompt_version_id] ?? 0,
        suite_name: (r.test_suites as any)?.name ?? "Unknown",
        test_suites: undefined,
      })) as (EvalRun & { version_number: number; suite_name: string })[];
    },
    enabled: !!promptId,
  });

  const hasActiveRuns = query.data?.some((r) => r.status === "queued" || r.status === "running");

  return {
    ...query,
    refetchInterval: hasActiveRuns ? 5000 : false,
  };
}

export function useEvalRun(evalRunId: string | undefined) {
  return useQuery({
    queryKey: ["eval-run", evalRunId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eval_runs")
        .select("*, test_suites(name)")
        .eq("id", evalRunId!)
        .single();
      if (error) throw error;
      return {
        ...data,
        suite_name: (data.test_suites as any)?.name ?? "Unknown",
      } as EvalRun & { suite_name: string };
    },
    enabled: !!evalRunId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "running" ? 5000 : false;
    },
  });
}

export function useEvalResults(evalRunId: string | undefined) {
  return useQuery({
    queryKey: ["eval-results", evalRunId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eval_results")
        .select("*, test_cases(name, critical)")
        .eq("eval_run_id", evalRunId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data.map((r) => ({
        ...r,
        case_name: (r.test_cases as any)?.name ?? "Unknown",
        case_critical: (r.test_cases as any)?.critical ?? false,
      })) as (EvalResult & { case_name: string; case_critical: boolean })[];
    },
    enabled: !!evalRunId,
  });
}

export function useCreateEvalRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"eval_runs">) => {
      const { data, error } = await supabase.from("eval_runs").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["eval-runs"] }),
  });
}
