import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Records that the current user viewed a prompt.
 * Upserts so we only keep the latest timestamp per user+prompt.
 */
export function useRecordPromptView(promptId: string | undefined) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !promptId) return;

    // Upsert: insert or update viewed_at
    supabase
      .from("prompt_views")
      .upsert(
        { user_id: user.id, prompt_id: promptId, viewed_at: new Date().toISOString() },
        { onConflict: "user_id,prompt_id" }
      )
      .then(() => {});
  }, [user, promptId]);
}
