import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useEnvironments(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["environments", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("environments")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateEnvironment(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      // Get max sort_order
      const { data: existing } = await supabase
        .from("environments")
        .select("sort_order")
        .eq("workspace_id", workspaceId)
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

      const { error } = await supabase.from("environments").insert({
        workspace_id: workspaceId,
        name,
        slug,
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["environments", workspaceId] }),
  });
}

export function useUpdateEnvironment(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, slug }: { id: string; name: string; slug: string }) => {
      const { error } = await supabase
        .from("environments")
        .update({ name, slug })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["environments", workspaceId] }),
  });
}

export function useDeleteEnvironment(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("environments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["environments", workspaceId] }),
  });
}
