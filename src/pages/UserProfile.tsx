import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Heart,
  Eye,
  MessageSquare,
  Users,
  UserPlus,
  UserMinus,
  Globe,
  ArrowLeft,
  GitFork,
  FolderOpen,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { useUserCollections } from "@/hooks/useCollections";
import { FollowListDialog } from "@/components/FollowListDialog";

function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

function useUserPublicPrompts(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-public-prompts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompts")
        .select("*")
        .eq("created_by", userId!)
        .eq("visibility", "public")
        .order("like_count", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

function useFollowerCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["follower-count", userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId!);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
  });
}

function useFollowingCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["following-count", userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId!);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
  });
}

function useIsFollowing(currentUserId: string | undefined, targetUserId: string | undefined) {
  return useQuery({
    queryKey: ["is-following", currentUserId, targetUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", currentUserId!)
        .eq("following_id", targetUserId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentUserId && !!targetUserId && currentUserId !== targetUserId,
  });
}

type ActivityItem = { type: "like" | "comment" | "follow"; created_at: string; detail: string; link?: string };

function useUserActivity(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-activity", userId],
    queryFn: async () => {
      const items: ActivityItem[] = [];

      // Recent likes
      const { data: likes } = await supabase
        .from("prompt_likes")
        .select("created_at, prompt_id, prompts:prompts(name)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(20);
      for (const l of likes ?? []) {
        const name = (l as any).prompts?.name ?? "a prompt";
        items.push({ type: "like", created_at: l.created_at, detail: `Liked "${name}"`, link: `/explore/${l.prompt_id}` });
      }

      // Recent comments
      const { data: comments } = await supabase
        .from("prompt_comments")
        .select("created_at, prompt_id, content, prompts:prompts(name)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(20);
      for (const c of comments ?? []) {
        const name = (c as any).prompts?.name ?? "a prompt";
        items.push({ type: "comment", created_at: c.created_at, detail: `Commented on "${name}"`, link: `/explore/${c.prompt_id}` });
      }

      // Recent follows
      const { data: follows } = await supabase
        .from("user_follows")
        .select("created_at, following_id, profiles:profiles!user_follows_following_id_fkey(display_name)")
        .eq("follower_id", userId!)
        .order("created_at", { ascending: false })
        .limit(20);
      for (const f of follows ?? []) {
        const name = (f as any).profiles?.display_name ?? "someone";
        items.push({ type: "follow", created_at: f.created_at, detail: `Followed ${name}`, link: `/u/${f.following_id}` });
      }

      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return items.slice(0, 30);
    },
    enabled: !!userId,
  });
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [followDialogMode, setFollowDialogMode] = useState<"followers" | "following" | null>(null);

  const { data: profile, isLoading: profileLoading } = useUserProfile(userId);
  const { data: prompts, isLoading: promptsLoading } = useUserPublicPrompts(userId);
  const { data: followerCount } = useFollowerCount(userId);
  const { data: followingCount } = useFollowingCount(userId);
  const { data: isFollowing } = useIsFollowing(user?.id, userId);
  const { data: collections } = useUserCollections(userId);
  const { data: activity, isLoading: activityLoading } = useUserActivity(userId);

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        const { error } = await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", user!.id)
          .eq("following_id", userId!);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_follows")
          .insert({ follower_id: user!.id, following_id: userId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following"] });
      queryClient.invalidateQueries({ queryKey: ["follower-count", userId] });
      toast.success(isFollowing ? "Unfollowed" : "Following!");
    },
    onError: () => toast.error("Action failed"),
  });

  const initials = (profile?.display_name ?? profile?.email ?? "U")
    .split(" ")
    .map((s: string) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Skeleton className="h-32 w-32 rounded-full mx-auto mb-4" />
          <Skeleton className="h-8 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">User not found</h1>
          <p className="text-muted-foreground mb-4">This profile doesn't exist or has no public content.</p>
          <Button variant="outline" asChild>
            <Link to="/explore"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Explore</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/explore"><ArrowLeft className="h-4 w-4 mr-1" /> Explore</Link>
          </Button>
        </div>
      </header>

      {/* Profile header */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
          <Avatar className="h-24 w-24 border-4 border-border">
            {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback className="text-2xl font-bold">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-foreground">
              {profile.display_name || "Anonymous"}
            </h1>
            {profile.bio && (
              <p className="text-muted-foreground mt-1 max-w-lg">{profile.bio}</p>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
              >
                <Globe className="h-3.5 w-3.5" />
                {profile.website.replace(/^https?:\/\//, "")}
              </a>
            )}

            {/* Stats */}
            <div className="flex items-center gap-6 mt-4 justify-center sm:justify-start">
              <div className="text-center">
                <div className="text-lg font-semibold text-foreground">{prompts?.length ?? 0}</div>
                <div className="text-xs text-muted-foreground">Prompts</div>
              </div>
              <button onClick={() => setFollowDialogMode("followers")} className="text-center hover:opacity-70 transition-opacity">
                <div className="text-lg font-semibold text-foreground">{followerCount ?? 0}</div>
                <div className="text-xs text-muted-foreground">Followers</div>
              </button>
              <button onClick={() => setFollowDialogMode("following")} className="text-center hover:opacity-70 transition-opacity">
                <div className="text-lg font-semibold text-foreground">{followingCount ?? 0}</div>
                <div className="text-xs text-muted-foreground">Following</div>
              </button>
            </div>
            {userId && (
              <FollowListDialog
                userId={userId}
                mode={followDialogMode ?? "followers"}
                open={followDialogMode !== null}
                onOpenChange={(open) => { if (!open) setFollowDialogMode(null); }}
              />
            )}
          </div>

          {/* Follow button */}
          {user && user.id !== userId && (
            <Button
              variant={isFollowing ? "outline" : "default"}
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
              className="min-w-[120px]"
            >
              {isFollowing ? (
                <><UserMinus className="h-4 w-4 mr-1" /> Unfollow</>
              ) : (
                <><UserPlus className="h-4 w-4 mr-1" /> Follow</>
              )}
            </Button>
          )}
          {!user && (
            <Button variant="outline" asChild>
              <Link to="/login">Sign in to follow</Link>
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="prompts" className="mt-2">
          <TabsList>
            <TabsTrigger value="prompts">Prompts ({prompts?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="collections">
              Collections ({collections?.filter((c: any) => c.visibility === "public").length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="prompts" className="mt-4">
            {promptsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 rounded-lg" />
                ))}
              </div>
            ) : !prompts?.length ? (
              <p className="text-muted-foreground text-center py-12">No public prompts yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {prompts.map((prompt) => (
                  <Link key={prompt.id} to={`/explore/${prompt.id}`}>
                    <Card className="hover:shadow-md transition-shadow h-full">
                      <CardContent className="p-5">
                        <h3 className="font-semibold text-foreground truncate mb-1">{prompt.name}</h3>
                        {prompt.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {prompt.description}
                          </p>
                        )}
                        {prompt.tags && prompt.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {prompt.tags.slice(0, 3).map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" /> {prompt.like_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {prompt.view_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> {prompt.comment_count}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="collections" className="mt-4">
            {!collections?.filter((c: any) => c.visibility === "public").length ? (
              <p className="text-muted-foreground text-center py-12">No public collections yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {collections
                  .filter((c: any) => c.visibility === "public")
                  .map((c: any) => (
                    <Link key={c.id} to={`/collections/${c.id}`}>
                      <Card className="hover:shadow-md transition-shadow h-full">
                        <CardContent className="p-5">
                          <h3 className="font-semibold text-foreground truncate mb-1">{c.title}</h3>
                          {c.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
