import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Heart, Eye, Sparkles } from "lucide-react";

function useFeaturedPrompts() {
  return useQuery({
    queryKey: ["featured-prompts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompts")
        .select("*, author_profile:profiles(id,display_name,avatar_url)")
        .eq("visibility", "public")
        .eq("featured", true)
        .order("like_count", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });
}

export function FeaturedCarousel() {
  const { data: prompts, isLoading } = useFeaturedPrompts();

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-hidden py-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="min-w-[280px] h-[160px] rounded-xl shrink-0" />
        ))}
      </div>
    );
  }

  if (!prompts?.length) return null;

  return (
    <div className="w-full max-w-4xl mx-auto px-8">
      <div className="flex items-center gap-2 mb-3">
        <Star className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Featured Prompts</span>
      </div>
      <Carousel opts={{ align: "start", loop: true }} className="w-full">
        <CarouselContent className="-ml-3">
          {prompts.map((prompt: any) => (
            <CarouselItem key={prompt.id} className="pl-3 basis-full sm:basis-1/2 lg:basis-1/3">
              <Link to={`/explore/${prompt.id}`}>
                <div className="group relative overflow-hidden rounded-xl border border-border/50 hover:border-primary/40 transition-all duration-300 hover:shadow-md h-[160px]">
                  {/* Background */}
                  {prompt.thumbnail_url ? (
                    <img
                      src={prompt.thumbnail_url}
                      alt={prompt.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/30 to-secondary/20">
                      <Sparkles className="absolute right-4 bottom-4 h-16 w-16 text-primary/10" />
                    </div>
                  )}
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
                  {/* Content */}
                  <div className="relative h-full flex flex-col justify-end p-4">
                    <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground border-0 text-[10px]">
                      <Star className="h-2.5 w-2.5 mr-1" /> Featured
                    </Badge>
                    <h3 className="font-semibold text-sm text-foreground line-clamp-1 mb-1">
                      {prompt.name}
                    </h3>
                    {prompt.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2">
                        {prompt.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" /> {prompt.like_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {prompt.view_count || 0}
                      </span>
                      {prompt.author_profile?.display_name && (
                        <span className="ml-auto text-foreground/70 truncate max-w-[100px]">
                          by {prompt.author_profile.display_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="-left-4 h-7 w-7" />
        <CarouselNext className="-right-4 h-7 w-7" />
      </Carousel>
    </div>
  );
}
