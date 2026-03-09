import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PAGE_SIZE = 20;

export function usePublicCollections() {
  return useInfiniteQuery({
    queryKey: ["public-collections"],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("collections")
        .select("*, owner:profiles!collections_user_id_fkey(user_id,display_name,avatar_url)")
        .eq("visibility", "public")
        .order("updated_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return data ?? [];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length >= PAGE_SIZE ? allPages.length : undefined,
  });
}

export function useUserCollections(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-collections", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("user_id", userId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}

export function useMyCollections() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-collections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });
}

export function useCollectionDetail(collectionId: string | undefined) {
  return useQuery({
    queryKey: ["collection-detail", collectionId],
    queryFn: async () => {
      const { data: collection, error: cErr } = await supabase
        .from("collections")
        .select("*, owner:profiles!collections_user_id_fkey(user_id,display_name,avatar_url)")
        .eq("id", collectionId!)
        .single();
      if (cErr) throw cErr;

      const { data: items, error: iErr } = await supabase
        .from("collection_items")
        .select("*, prompt:prompts(id,name,description,tags,thumbnail_url,like_count,view_count,comment_count,created_by,visibility)")
        .eq("collection_id", collectionId!)
        .order("sort_order");
      if (iErr) throw iErr;

      return { ...collection, items: items ?? [] };
    },
    enabled: !!collectionId,
  });
}

export function useCreateCollection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description?: string; visibility?: string }) => {
      const { data, error } = await supabase
        .from("collections")
        .insert({
          user_id: user!.id,
          title: input.title,
          description: input.description ?? null,
          visibility: input.visibility ?? "private",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-collections"] });
      qc.invalidateQueries({ queryKey: ["user-collections"] });
      qc.invalidateQueries({ queryKey: ["public-collections"] });
    },
  });
}

export function useUpdateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; description?: string; visibility?: string; cover_image_url?: string; view_count?: number }) => {
      const { error } = await supabase.from("collections").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-collections"] });
      qc.invalidateQueries({ queryKey: ["collection-detail"] });
      qc.invalidateQueries({ queryKey: ["public-collections"] });
    },
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-collections"] });
      qc.invalidateQueries({ queryKey: ["public-collections"] });
    },
  });
}

export function useAddToCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ collectionId, promptId }: { collectionId: string; promptId: string }) => {
      // Get max sort_order
      const { data: existing } = await supabase
        .from("collection_items")
        .select("sort_order")
        .eq("collection_id", collectionId)
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;
      const { error } = await supabase
        .from("collection_items")
        .insert({ collection_id: collectionId, prompt_id: promptId, sort_order: nextOrder });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collection-detail"] });
      qc.invalidateQueries({ queryKey: ["my-collections"] });
    },
  });
}

export function useRemoveFromCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ collectionId, promptId }: { collectionId: string; promptId: string }) => {
      const { error } = await supabase
        .from("collection_items")
        .delete()
        .eq("collection_id", collectionId)
        .eq("prompt_id", promptId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collection-detail"] });
    },
  });
}

export function useReorderCollectionItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ collectionId, orderedItemIds }: { collectionId: string; orderedItemIds: string[] }) => {
      // Update sort_order for each item
      const updates = orderedItemIds.map((id, index) =>
        supabase.from("collection_items").update({ sort_order: index }).eq("id", id)
      );
      const results = await Promise.all(updates);
      const err = results.find((r) => r.error);
      if (err?.error) throw err.error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["collection-detail", vars.collectionId] });
    },
  });
}
