import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Enums } from "@/integrations/supabase/types";

export type MemberWithProfile = Tables<"workspace_members"> & {
  profile: Pick<Tables<"profiles">, "display_name" | "email" | "avatar_url"> | null;
};

export function useMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["members", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("*, profile:profiles!workspace_members_user_id_fkey(display_name, email, avatar_url)")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return data as unknown as MemberWithProfile[];
    },
  });
}

export function useInviteMember(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: Enums<"workspace_role"> }) => {
      // Look up profile by email
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!profile) throw new Error("No user found with that email address.");

      const { error } = await supabase.from("workspace_members").insert({
        workspace_id: workspaceId,
        user_id: profile.user_id,
        role,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", workspaceId] }),
  });
}

export function useUpdateMemberRole(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: Enums<"workspace_role"> }) => {
      const { error } = await supabase
        .from("workspace_members")
        .update({ role })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", workspaceId] }),
  });
}

export function useRemoveMember(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", workspaceId] }),
  });
}
