import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Provider = Database["public"]["Enums"]["provider"];

interface ProviderKey {
  id: string;
  provider: Provider;
  display_name: string;
  encrypted_key: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  workspace_id: string;
}

export function useProviderKeys(workspaceId: string) {
  return useQuery<ProviderKey[]>({
    queryKey: ["provider_keys", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_keys")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProviderKey(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { provider: Provider; displayName: string; apiKey: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("provider_keys").insert({
        workspace_id: workspaceId,
        provider: input.provider,
        display_name: input.displayName,
        encrypted_key: input.apiKey,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["provider_keys", workspaceId] }),
  });
}

export function useUpdateProviderKey(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; displayName?: string; apiKey?: string }) => {
      const updates: Record<string, string> = {};
      if (input.displayName !== undefined) updates.display_name = input.displayName;
      if (input.apiKey !== undefined) updates.encrypted_key = input.apiKey;
      const { error } = await supabase.from("provider_keys").update(updates).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["provider_keys", workspaceId] }),
  });
}

export function useDeleteProviderKey(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("provider_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["provider_keys", workspaceId] }),
  });
}
