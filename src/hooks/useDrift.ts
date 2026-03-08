import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export interface DriftPolicyRow {
  id: string;
  prompt_id: string;
  workspace_id: string;
  environment_id: string;
  test_suite_id: string;
  schedule_cron: string;
  threshold: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  environments: { name: string; slug: string } | null;
  test_suites: { name: string } | null;
}

export interface DriftAlertRow {
  id: string;
  drift_policy_id: string;
  workspace_id: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "acknowledged" | "resolved";
  message: string | null;
  baseline_score: number | null;
  current_score: number | null;
  eval_run_id: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  drift_policies: { environment_id: string } | null;
  eval_runs: { score: number | null; status: string } | null;
}

export function useDriftPolicies(promptId: string | undefined) {
  return useQuery({
    queryKey: ["drift-policies", promptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drift_policies")
        .select("*, environments(name, slug), test_suites(name)")
        .eq("prompt_id", promptId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as DriftPolicyRow[];
    },
    enabled: !!promptId,
  });
}

export function useCreateDriftPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"drift_policies">) => {
      const { data, error } = await supabase.from("drift_policies").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["drift-policies", data.prompt_id] }),
  });
}

export function useUpdateDriftPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: TablesUpdate<"drift_policies"> & { id: string; prompt_id: string }) => {
      const { data, error } = await supabase.from("drift_policies").update(update).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["drift-policies", data.prompt_id] }),
  });
}

export function useDeleteDriftPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, promptId }: { id: string; promptId: string }) => {
      const { error } = await supabase.from("drift_policies").delete().eq("id", id);
      if (error) throw error;
      return promptId;
    },
    onSuccess: (promptId) => {
      qc.invalidateQueries({ queryKey: ["drift-policies", promptId] });
      qc.invalidateQueries({ queryKey: ["drift-alerts", promptId] });
    },
  });
}

export function useDriftAlerts(promptId: string | undefined) {
  return useQuery({
    queryKey: ["drift-alerts", promptId],
    queryFn: async () => {
      // First get policy ids for this prompt
      const { data: policies, error: pErr } = await supabase
        .from("drift_policies")
        .select("id")
        .eq("prompt_id", promptId!);
      if (pErr) throw pErr;
      if (!policies.length) return [] as DriftAlertRow[];

      const policyIds = policies.map((p) => p.id);
      const { data, error } = await supabase
        .from("drift_alerts")
        .select("*, drift_policies(environment_id), eval_runs(score, status)")
        .in("drift_policy_id", policyIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as DriftAlertRow[];
    },
    enabled: !!promptId,
  });
}

export function useUpdateDriftAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, promptId, ...update }: TablesUpdate<"drift_alerts"> & { id: string; promptId: string }) => {
      const { data, error } = await supabase.from("drift_alerts").update(update).eq("id", id).select().single();
      if (error) throw error;
      return { data, promptId };
    },
    onSuccess: ({ promptId }) => qc.invalidateQueries({ queryKey: ["drift-alerts", promptId] }),
  });
}

// Cron helpers
const SCHEDULE_OPTIONS = [
  { label: "Every 6 hours", cron: "0 */6 * * *" },
  { label: "Every 12 hours", cron: "0 */12 * * *" },
  { label: "Daily", cron: "0 0 * * *" },
  { label: "Weekly", cron: "0 0 * * 0" },
] as const;

export { SCHEDULE_OPTIONS };

export function cronToLabel(cron: string): string {
  const match = SCHEDULE_OPTIONS.find((s) => s.cron === cron);
  return match?.label ?? cron;
}
