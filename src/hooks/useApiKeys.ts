import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

async function hashKey(plaintext: string): Promise<string> {
  const encoded = new TextEncoder().encode(plaintext);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sk_${raw}`;
}

export function useApiKeys(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["api_keys", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, name, key_prefix, created_at, expires_at, last_used_at")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateApiKey(workspaceId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, expiresAt }: { name: string; expiresAt?: string | null }) => {
      const plaintext = generateKey();
      const keyHash = await hashKey(plaintext);
      const keyPrefix = plaintext.slice(0, 10) + "...";

      const { error } = await supabase.from("api_keys").insert({
        workspace_id: workspaceId,
        name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        created_by: user!.id,
        expires_at: expiresAt || null,
      });
      if (error) throw error;
      return plaintext; // returned once, never stored
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api_keys", workspaceId] }),
  });
}

export function useDeleteApiKey(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api_keys", workspaceId] }),
  });
}
