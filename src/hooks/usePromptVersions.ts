import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type PromptVersion = Tables<"prompt_versions">;

export function usePromptVersions(promptId: string | undefined) {
  return useQuery({
    queryKey: ["prompt-versions", promptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_versions")
        .select("*")
        .eq("prompt_id", promptId!)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return data as PromptVersion[];
    },
    enabled: !!promptId,
  });
}

export function useLatestVersion(promptId: string | undefined) {
  const query = usePromptVersions(promptId);
  return {
    ...query,
    data: query.data?.[0] ?? null,
  };
}

export function usePromptVersion(versionId: string | undefined) {
  return useQuery({
    queryKey: ["prompt-version", versionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_versions")
        .select("*")
        .eq("id", versionId!)
        .single();
      if (error) throw error;
      return data as PromptVersion;
    },
    enabled: !!versionId,
  });
}
