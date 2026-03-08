import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingUp, Heart, Eye, Flame } from "lucide-react";

function useTrendingPrompts() {
  return useQuery({
    queryKey: ["trending-prompts"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get prompt IDs that received likes in the last 7 days, ordered by count
      const { data: recentLikes, error: likesErr } = await supabase
        .from("prompt_likes")
        .select("prompt_id")
        .gte("created_at", sevenDaysAgo.toISOString());
      if (likesErr) throw likesErr;

      if (!recentLikes?.length) return [];

      // Count likes per prompt
      const counts = new Map<string, number>();
      recentLikes.forEach((l) => {
        counts.set(l.prompt_id, (counts.get(l.prompt_id) || 0) + 1);
      });

      // Get top 6 prompt IDs by recent like count
      const topIds = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([id]) => id);

      if (!topIds.length) return [];

      const { data: prompts, error } = await supabase
        .from("prompts")
        .select("*, author_profile:profiles(id,display_name,avatar_url)")
        .eq("visibility", "public")
        .in("id", topIds);
      if (error) throw error;

      // Sort by recent like count
      return (prompts ?? []).sort(
        (a: any, b: any) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0)
      );
    },
  });
}

export function TrendingSection() {
  const { data: prompts, isLoading } = useTrendingPrompts();

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!prompts?.length) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 border-b border-border/50">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="h-4 w-4 text-destructive" />
        <span className="text-sm font-semibold text-foreground">Trending This Week</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {prompts.map((prompt: any, idx: number) => (
          <Link key={prompt.id} to={`/explore/${prompt.id}`}>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-accent/30 transition-all group">
              {/* Rank */}
              <span className="text-lg font-bold text-muted-foreground/50 w-6 text-center shrink-0">
                {idx + 1}
              </span>
              {/* Icon / thumbnail */}
              <div className="h-10 w-10 rounded-md bg-gradient-to-br from-primary/15 to-accent/20 flex items-center justify-center shrink-0 overflow-hidden">
                {prompt.thumbnail_url ? (
                  <img src={prompt.thumbnail_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-primary/50" />
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {prompt.name}
                </h4>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                  {prompt.author_profile && (
                    <span className="flex items-center gap-1 truncate">
                      <Avatar className="h-3.5 w-3.5">
                        <AvatarImage src={prompt.author_profile.avatar_url} />
                        <AvatarFallback className="text-[8px]">
                          {(prompt.author_profile.display_name || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {prompt.author_profile.display_name || "Anonymous"}
                    </span>
                  )}
                  <span className="flex items-center gap-0.5">
                    <Heart className="h-3 w-3" /> {prompt.like_count || 0}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Eye className="h-3 w-3" /> {prompt.view_count || 0}
                  </span>
                </div>
              </div>
              {prompt.tags?.[0] && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0 hidden sm:inline-flex">
                  {prompt.tags[0]}
                </Badge>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
