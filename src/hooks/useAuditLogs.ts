import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export interface AuditLogFilters {
  action?: string;
  actorId?: string;
  from?: Date;
  to?: Date;
  page?: number;
}

export type AuditEventWithActor = Tables<"audit_events"> & {
  actorName: string | null;
};

const PAGE_SIZE = 50;

export function useAuditLogs(workspaceId: string | undefined, filters: AuditLogFilters = {}) {
  const page = filters.page ?? 0;

  return useQuery({
    queryKey: ["audit-logs", workspaceId, filters],
    enabled: !!workspaceId,
    queryFn: async () => {
      let query = supabase
        .from("audit_events")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filters.action) query = query.eq("action", filters.action);
      if (filters.actorId) query = query.eq("actor_id", filters.actorId);
      if (filters.from) query = query.gte("created_at", filters.from.toISOString());
      if (filters.to) query = query.lte("created_at", filters.to.toISOString());

      const { data, error } = await query;
      if (error) throw error;

      // Fetch actor profiles
      const actorIds = [...new Set(data.map((e) => e.actor_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", actorIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.display_name || p.email]) ?? []);

      return data.map((ev) => ({
        ...ev,
        actorName: profileMap.get(ev.actor_id) ?? null,
      })) as AuditEventWithActor[];
    },
  });
}
