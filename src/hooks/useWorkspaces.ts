import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Tables, Enums } from "@/integrations/supabase/types";

export interface WorkspaceWithRole extends Tables<"workspaces"> {
  role: Enums<"workspace_role">;
}

export function useWorkspaces() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["workspaces", user?.id],
    queryFn: async (): Promise<WorkspaceWithRole[]> => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("role, workspaces(*)")
        .eq("user_id", user!.id);

      if (error) throw error;

      return (data ?? []).map((m) => ({
        ...(m.workspaces as Tables<"workspaces">),
        role: m.role,
      }));
    },
    enabled: !!user,
  });
}
