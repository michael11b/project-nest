import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type TestCase = Tables<"test_cases">;

export function useTestCases(suiteId: string | undefined) {
  return useQuery({
    queryKey: ["test-cases", suiteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_cases")
        .select("*")
        .eq("suite_id", suiteId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as TestCase[];
    },
    enabled: !!suiteId,
  });
}

export function useUpsertTestCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"test_cases"> & { id?: string }) => {
      if (input.id) {
        const { id, ...update } = input;
        const { data, error } = await supabase
          .from("test_cases")
          .update(update as TablesUpdate<"test_cases">)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from("test_cases").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["test-cases", data.suite_id] }),
  });
}

export function useDeleteTestCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, suiteId }: { id: string; suiteId: string }) => {
      const { error } = await supabase.from("test_cases").delete().eq("id", id);
      if (error) throw error;
      return suiteId;
    },
    onSuccess: (suiteId) => qc.invalidateQueries({ queryKey: ["test-cases", suiteId] }),
  });
}
