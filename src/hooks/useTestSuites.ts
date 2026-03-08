import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type TestSuite = Tables<"test_suites">;

export function useTestSuites(promptId: string | undefined) {
  return useQuery({
    queryKey: ["test-suites", promptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_suites")
        .select("*, test_cases(id)")
        .eq("prompt_id", promptId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((s) => ({
        ...s,
        case_count: (s.test_cases as unknown[]).length,
        test_cases: undefined,
      })) as (TestSuite & { case_count: number })[];
    },
    enabled: !!promptId,
  });
}

export function useCreateTestSuite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"test_suites">) => {
      const { data, error } = await supabase.from("test_suites").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["test-suites", data.prompt_id] }),
  });
}

export function useUpdateTestSuite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: TablesUpdate<"test_suites"> & { id: string; prompt_id: string }) => {
      const { data, error } = await supabase.from("test_suites").update(update).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["test-suites", data.prompt_id] }),
  });
}

export function useDeleteTestSuite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, promptId }: { id: string; promptId: string }) => {
      const { error } = await supabase.from("test_suites").delete().eq("id", id);
      if (error) throw error;
      return promptId;
    },
    onSuccess: (promptId) => qc.invalidateQueries({ queryKey: ["test-suites", promptId] }),
  });
}
