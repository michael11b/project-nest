import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { ForkPromptDialog } from "@/components/ForkPromptDialog";
import { Link, useSearchParams } from "react-router-dom";
import { usePublicPrompts, useCategories, type SortOption } from "@/hooks/usePublicPrompts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Heart, MessageCircle, Eye, TrendingUp, Clock, Star, Flame, Sparkles, LogIn, GitFork, FolderPlus,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { FeaturedCarousel } from "@/components/FeaturedCarousel";
import { TrendingSection } from "@/components/TrendingSection";
import { ExploreCollectionsSection } from "@/components/ExploreCollectionsSection";
import { SaveToCollectionDialog } from "@/components/SaveToCollectionDialog";

function PromptCard({ prompt, onFork, onSave }: { prompt: any; onFork?: (id: string, name: string) => void; onSave?: (id: string) => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [liking, setLiking] = useState(false);

  const toggleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast({ title: "Sign in to like prompts", variant: "destructive" });
      return;
    }
    setLiking(true);
    try {
      const { data: existing } = await supabase
        .from("prompt_likes")
        .select("id")
        .eq("prompt_id", prompt.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase.from("prompt_likes").delete().eq("id", existing.id);
      } else {
        await supabase.from("prompt_likes").insert({ prompt_id: prompt.id, user_id: user.id });
      }
      queryClient.invalidateQueries({ queryKey: ["public-prompts"] });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setLiking(false);
    }
  };

  return (
    <Link to={`/explore/${prompt.id}`}>
      <Card className="group overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
        {/* Thumbnail / Gradient placeholder */}
        <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/30">
          {prompt.thumbnail_url ? (
            <img
              src={prompt.thumbnail_url}
              alt={prompt.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Sparkles className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}
          {prompt.featured && (
            <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground border-0 text-xs">
              <Star className="h-3 w-3 mr-1" /> Featured
            </Badge>
          )}
        </div>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
            {prompt.name}
          </h3>
          {prompt.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{prompt.description}</p>
          )}
          {prompt.tags?.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {prompt.tags.slice(0, 3).map((t: string) => (
                <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
              ))}
            </div>
          )}
          {prompt.author_profile && (
            <Link to={`/u/${prompt.created_by}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 py-1 hover:opacity-80 transition-opacity">
              <Avatar className="h-5 w-5">
                <AvatarImage src={prompt.author_profile.avatar_url} alt={prompt.author_profile.display_name} />
                <AvatarFallback className="text-[10px]">{(prompt.author_profile.display_name || "?").charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground hover:text-foreground">{prompt.author_profile.display_name || "Anonymous"}</span>
            </Link>
          )}
          <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleLike}
                disabled={liking}
                className="flex items-center gap-1 hover:text-destructive transition-colors"
              >
                <Heart className="h-3.5 w-3.5" />
                {prompt.like_count || 0}
              </button>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                {prompt.comment_count || 0}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {user && onSave && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSave(prompt.id); }}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                  title="Save to collection"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </button>
              )}
              {user && onFork && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFork(prompt.id, prompt.name); }}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                  title="Fork to your workspace"
                >
                  <GitFork className="h-3.5 w-3.5" />
                </button>
              )}
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {prompt.view_count || 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

const SORT_OPTIONS: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: "hot", label: "Hot", icon: <Flame className="h-3.5 w-3.5" /> },
  { value: "new", label: "New", icon: <Clock className="h-3.5 w-3.5" /> },
  { value: "top", label: "Top", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { value: "most_liked", label: "Most Liked", icon: <Heart className="h-3.5 w-3.5" /> },
];

export default function Explore() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const tag = searchParams.get("tag") ?? "";
  const sort = (searchParams.get("sort") as SortOption) ?? "hot";
  const [searchInput, setSearchInput] = useState(search);
  const [forkTarget, setForkTarget] = useState<{ id: string; name: string } | null>(null);
  const [savePromptId, setSavePromptId] = useState<string | null>(null);

  const { data: categories, isLoading: catsLoading } = useCategories();
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePublicPrompts({
    search: search || undefined,
    category: category || undefined,
    tag: tag || undefined,
    sort,
  });

  const prompts = useMemo(() => data?.pages.flat() ?? [], [data]);

  // Intersection observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam("q", searchInput.trim());
  };

  const allTags = useMemo(() => {
    if (!prompts) return [];
    const tagSet = new Set<string>();
    prompts.forEach((p: any) => p.tags?.forEach((t: string) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [prompts]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-primary/3 to-background border-b border-border/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),transparent)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 text-center space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold tracking-tight">
              Explore Prompts
            </h1>
            <div className="flex items-center gap-2">
              {user ? (
                <Link to="/">
                  <Button variant="outline" size="sm">Dashboard</Button>
                </Link>
              ) : (
                <Link to="/login">
                  <Button size="sm">
                    <LogIn className="h-4 w-4 mr-2" /> Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Discover and share AI prompts from the community. Search by model, category, or tag.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search prompts, models, or inspiration..."
                className="pl-10 h-11"
              />
            </div>
            <Button type="submit" className="h-11">Search</Button>
          </form>

          {/* Category pills */}
          <div className="flex gap-2 flex-wrap justify-center">
            <Button
              variant={!category ? "default" : "outline"}
              size="sm"
              onClick={() => updateParam("category", "")}
              className="rounded-full text-xs"
            >
              All
            </Button>
            {catsLoading
              ? [...Array(6)].map((_, i) => <Skeleton key={i} className="h-8 w-24 rounded-full" />)
              : categories?.map((c: any) => (
                  <Button
                    key={c.id}
                    variant={category === c.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateParam("category", c.id)}
                    className="rounded-full text-xs"
                  >
                    {c.icon} {c.name}
                  </Button>
                ))}
          </div>

          {/* Featured carousel */}
          <FeaturedCarousel />
        </div>
      </div>

      {/* Trending this week */}
      <TrendingSection />

      {/* Collections */}
      <ExploreCollectionsSection />

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters bar */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex gap-2">
            {SORT_OPTIONS.map((s) => (
              <Button
                key={s.value}
                variant={sort === s.value ? "default" : "ghost"}
                size="sm"
                onClick={() => updateParam("sort", s.value)}
                className="text-xs"
              >
                {s.icon}
                <span className="ml-1.5">{s.label}</span>
              </Button>
            ))}
          </div>

          {tag && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => updateParam("tag", "")}>
              Tag: {tag} ✕
            </Badge>
          )}

          {allTags.length > 0 && !tag && (
            <Select value="" onValueChange={(v) => updateParam("tag", v)}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                {allTags.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : !prompts.length ? (
          <div className="text-center py-20 space-y-3">
            <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">No public prompts found.</p>
            <p className="text-xs text-muted-foreground">
              Be the first to share! Set a prompt's visibility to "public" to show it here.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {prompts.map((p: any) => (
                <PromptCard
                  key={p.id}
                  prompt={p}
                  onFork={(id, name) => setForkTarget({ id, name })}
                />
              ))}
            </div>
            {/* Infinite scroll sentinel */}
            <div ref={loadMoreRef} className="flex justify-center py-8">
              {isFetchingNextPage && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Loading more…
                </div>
              )}
              {!hasNextPage && prompts.length > 0 && (
                <p className="text-xs text-muted-foreground">You've seen all prompts</p>
              )}
            </div>
          </>
        )}
      </div>

      {forkTarget && (
        <ForkPromptDialog
          open={!!forkTarget}
          onOpenChange={(open) => { if (!open) setForkTarget(null); }}
          promptId={forkTarget.id}
          promptName={forkTarget.name}
        />
      )}
    </div>
  );
}
