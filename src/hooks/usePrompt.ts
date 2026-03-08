import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Prompt = Tables<"prompts">;

interface PromptContextValue {
  prompt: Prompt;
}

export const PromptContext = createContext<PromptContextValue | null>(null);

export function usePromptQuery(promptId: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["prompt", promptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompts")
        .select("*")
        .eq("id", promptId!)
        .eq("workspace_id", workspaceId!)
        .single();
      if (error) throw error;
      return data as Prompt;
    },
    enabled: !!promptId && !!workspaceId,
  });
}

export function usePrompt() {
  const ctx = useContext(PromptContext);
  if (!ctx) throw new Error("usePrompt must be used within PromptDetailLayout");
  return ctx;
}
