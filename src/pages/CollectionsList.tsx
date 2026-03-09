import { useMemo, useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePublicCollections } from "@/hooks/useCollections";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FolderOpen, LogIn, Plus, Search, Sparkles, X } from "lucide-react";
import { CreateCollectionDialog } from "@/components/CreateCollectionDialog";

type SortOption = "recent" | "oldest" | "alpha" | "alpha-desc";

export default function CollectionsList() {
  const { user } = useAuth();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = usePublicCollections();
  const allCollections = useMemo(() => data?.pages.flat() ?? [], [data]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("recent");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const collections = useMemo(() => {
    let filtered = allCollections;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((c: any) =>
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.owner?.display_name?.toLowerCase().includes(q)
      );
    }
    const sorted = [...filtered];
    switch (sort) {
      case "oldest":
        sorted.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "alpha":
        sorted.sort((a: any, b: any) => (a.title || "").localeCompare(b.title || ""));
        break;
      case "alpha-desc":
        sorted.sort((a: any, b: any) => (b.title || "").localeCompare(a.title || ""));
        break;
      default: // recent — already sorted by updated_at desc from API
        break;
    }
    return sorted;
  }, [allCollections, search, sort]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <>
      <CreateCollectionDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-primary/3 to-background border-b border-border/50">
        <div className="relative max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/explore"><ArrowLeft className="h-4 w-4 mr-1" /> Explore</Link>
              </Button>
              <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> New Collection
                </Button>
              )}
              {user ? (
                <Link to="/"><Button variant="outline" size="sm">Dashboard</Button></Link>
              ) : (
                <Link to="/login"><Button size="sm"><LogIn className="h-4 w-4 mr-2" /> Sign In</Button></Link>
              )}
            </div>
          </div>
          <p className="text-muted-foreground max-w-lg">Curated sets of prompts shared by the community.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search collections…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="alpha">A → Z</SelectItem>
              <SelectItem value="alpha-desc">Z → A</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
          </div>
        ) : !collections.length ? (
          <div className="text-center py-20">
            <FolderOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No public collections yet.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {collections.map((c: any) => {
                const owner = c.owner;
                return (
                  <Link key={c.id} to={`/collections/${c.id}`}>
                    <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 h-full">
                      <div className="aspect-[3/1] bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/30 flex items-center justify-center rounded-t-lg overflow-hidden">
                        {c.cover_image_url ? (
                          <img src={c.cover_image_url} alt={c.title} className="w-full h-full object-cover" />
                        ) : (
                          <Sparkles className="h-8 w-8 text-muted-foreground/30" />
                        )}
                      </div>
                      <CardContent className="p-4 space-y-2">
                        <h3 className="font-semibold text-sm line-clamp-1">{c.title}</h3>
                        {c.description && <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                        {owner && (
                          <div className="flex items-center gap-2 pt-1">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={owner.avatar_url} />
                              <AvatarFallback className="text-[10px]">{(owner.display_name || "?")[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">{owner.display_name || "Anonymous"}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
            <div ref={loadMoreRef} className="flex justify-center py-8">
              {isFetchingNextPage && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Loading…
                </div>
              )}
              {!hasNextPage && collections.length > 0 && (
                <p className="text-xs text-muted-foreground">You've seen all collections</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}
