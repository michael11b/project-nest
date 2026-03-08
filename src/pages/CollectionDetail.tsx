import { useParams, Link } from "react-router-dom";
import { useCollectionDetail, useRemoveFromCollection } from "@/hooks/useCollections";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Heart, Eye, Sparkles, Trash2, Globe, Lock } from "lucide-react";

export default function CollectionDetail() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const { user } = useAuth();
  const { data: collection, isLoading } = useCollectionDetail(collectionId);
  const removeItem = useRemoveFromCollection();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-5 w-96 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Collection not found</h1>
          <Button variant="outline" asChild>
            <Link to="/collections"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === collection.user_id;
  const owner = collection.owner as any;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/collections"><ArrowLeft className="h-4 w-4 mr-1" /> Collections</Link>
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold text-foreground">{collection.title}</h1>
            <Badge variant="secondary" className="text-xs">
              {collection.visibility === "public" ? (
                <><Globe className="h-3 w-3 mr-1" /> Public</>
              ) : (
                <><Lock className="h-3 w-3 mr-1" /> Private</>
              )}
            </Badge>
          </div>
          {collection.description && (
            <p className="text-muted-foreground mb-4">{collection.description}</p>
          )}
          {owner && (
            <Link to={`/u/${owner.user_id}`} className="inline-flex items-center gap-2 hover:opacity-80">
              <Avatar className="h-6 w-6">
                <AvatarImage src={owner.avatar_url} />
                <AvatarFallback className="text-xs">{(owner.display_name || "?")[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">{owner.display_name || "Anonymous"}</span>
            </Link>
          )}
        </div>

        {/* Items */}
        {!collection.items?.length ? (
          <div className="text-center py-20">
            <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">This collection is empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {collection.items.map((item: any) => {
              const p = item.prompt;
              if (!p) return null;
              return (
                <Card key={item.id} className="group overflow-hidden hover:shadow-md transition-shadow relative">
                  <Link to={`/explore/${p.id}`}>
                    <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/30 flex items-center justify-center">
                      {p.thumbnail_url ? (
                        <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <Sparkles className="h-10 w-10 text-muted-foreground/30" />
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">{p.name}</h3>
                      {p.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {p.like_count || 0}</span>
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {p.view_count || 0}</span>
                      </div>
                    </CardContent>
                  </Link>
                  {isOwner && (
                    <button
                      onClick={() => removeItem.mutate({ collectionId: collection.id, promptId: p.id })}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove from collection"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
