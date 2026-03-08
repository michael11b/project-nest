import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SortOption = "hot" | "new" | "top" | "most_liked";

const PAGE_SIZE = 24;

interface UsePublicPromptsOptions {
  search?: string;
  category?: string;
  tag?: string;
  sort?: SortOption;
}

export function usePublicPrompts({
  search,
  category,
  tag,
  sort = "hot",
}: UsePublicPromptsOptions = {}) {
  return useInfiniteQuery({
    queryKey: ["public-prompts", search, category, tag, sort],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("prompts")
        .select("*, author_profile:profiles(id,display_name,avatar_url)")
        .eq("visibility", "public")
        .range(from, to);

      if (search?.trim()) {
        query = query.textSearch("fts_vector", search.trim(), {
          type: "websearch",
        });
      }

      if (tag) {
        query = query.contains("tags", [tag]);
      }

      switch (sort) {
        case "new":
          query = query.order("created_at", { ascending: false });
          break;
        case "top":
          query = query.order("view_count", { ascending: false });
          break;
        case "most_liked":
          query = query.order("like_count", { ascending: false });
          break;
        case "hot":
        default:
          query = query.order("like_count", { ascending: false }).order("created_at", { ascending: false });
          break;
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = data ?? [];

      // Client-side category filter
      if (category && results.length) {
        const { data: mappings } = await supabase
          .from("prompt_category_mappings")
          .select("prompt_id")
          .eq("category_id", category);

        const categoryPromptIds = new Set(mappings?.map((m: any) => m.prompt_id) ?? []);
        results = results.filter((p: any) => categoryPromptIds.has(p.id));
      }

      return results;
    },
    getNextPageParam: (lastPage, allPages) => {
      // If we got a full page, there might be more
      if (lastPage.length >= PAGE_SIZE) {
        return allPages.length;
      }
      return undefined;
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["prompt-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function usePromptLike(promptId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["prompt-like", promptId, userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("prompt_likes")
        .select("id")
        .eq("prompt_id", promptId!)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!promptId && !!userId,
  });
}

export function usePromptComments(promptId: string | undefined) {
  return useQuery({
    queryKey: ["prompt-comments", promptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_comments")
        .select("*")
        .eq("prompt_id", promptId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!promptId,
  });
}
