import { useMemo } from "react";
import { Link } from "react-router-dom";
import { usePublicCollections } from "@/hooks/useCollections";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, FolderOpen } from "lucide-react";

export function ExploreCollectionsSection() {
  const { data, isLoading } = usePublicCollections();
  const collections = useMemo(() => (data?.pages.flat() ?? []).slice(0, 4), [data]);

  if (isLoading) {
    return (
      <section className="max-w-6xl mx-auto px-4 py-8">
        <Skeleton className="h-7 w-40 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-lg" />)}
        </div>
      </section>
    );
  }

  if (!collections.length) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" /> Collections
        </h2>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/collections" className="text-xs">
            View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {collections.map((c: any) => {
          const owner = c.owner;
          return (
            <Link key={c.id} to={`/collections/${c.id}`}>
              <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 h-full">
                <div className="aspect-[3/1] bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/30 flex items-center justify-center rounded-t-lg overflow-hidden">
                  {c.cover_image_url ? (
                    <img src={c.cover_image_url} alt={c.title} className="w-full h-full object-cover" />
                  ) : (
                    <Sparkles className="h-6 w-6 text-muted-foreground/30" />
                  )}
                </div>
                <CardContent className="p-3 space-y-1.5">
                  <h3 className="font-semibold text-xs line-clamp-1">{c.title}</h3>
                  {owner && (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={owner.avatar_url} />
                        <AvatarFallback className="text-[8px]">{(owner.display_name || "?")[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-muted-foreground">{owner.display_name || "Anonymous"}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
