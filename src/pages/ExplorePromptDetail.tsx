import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePromptComments, usePromptLike } from "@/hooks/usePublicPrompts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft, Heart, MessageCircle, Eye, Calendar, User, Send, Sparkles, LogIn, GitFork,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ForkPromptDialog } from "@/components/ForkPromptDialog";
import { useRecordPromptView } from "@/hooks/useRecordPromptView";

export default function ExplorePromptDetail() {
  const { promptId } = useParams<{ promptId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forkOpen, setForkOpen] = useState(false);

  const { data: prompt, isLoading } = useQuery({
    queryKey: ["public-prompt", promptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompts")
        .select("*")
        .eq("id", promptId!)
        .eq("visibility", "public")
        .single();
      if (error) throw error;
      // Increment view count
      supabase.from("prompts").update({ view_count: (data.view_count || 0) + 1 }).eq("id", promptId!).then(() => {});
      return data;
    },
    enabled: !!promptId,
  });

  const { data: latestVersion } = useQuery({
    queryKey: ["public-prompt-version", promptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_versions")
        .select("*")
        .eq("prompt_id", promptId!)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!promptId,
  });

  const { data: comments } = usePromptComments(promptId);
  const { data: myLike } = usePromptLike(promptId, user?.id);
  const [liking, setLiking] = useState(false);

  const toggleLike = async () => {
    if (!user) {
      toast({ title: "Sign in to like prompts", variant: "destructive" });
      return;
    }
    setLiking(true);
    try {
      if (myLike) {
        await supabase.from("prompt_likes").delete().eq("id", myLike.id);
      } else {
        await supabase.from("prompt_likes").insert({ prompt_id: promptId!, user_id: user.id });
      }
      queryClient.invalidateQueries({ queryKey: ["prompt-like"] });
      queryClient.invalidateQueries({ queryKey: ["public-prompt", promptId] });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setLiking(false);
    }
  };

  const submitComment = async () => {
    if (!user || !comment.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("prompt_comments").insert({
        prompt_id: promptId!,
        user_id: user.id,
        content: comment.trim(),
      });
      if (error) throw error;
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["prompt-comments"] });
      queryClient.invalidateQueries({ queryKey: ["public-prompt", promptId] });
      toast({ title: "Comment added" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Prompt not found or not public.</p>
        <Link to="/explore"><Button variant="outline" className="mt-4">Back to Explore</Button></Link>
      </div>
    );
  }

  const messages = Array.isArray(latestVersion?.content_json) ? latestVersion.content_json as { role: string; content: string }[] : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/explore">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{prompt.name}</h1>
            {prompt.description && (
              <p className="text-muted-foreground text-sm mt-1">{prompt.description}</p>
            )}
          </div>
          {user ? (
            <Button size="sm" variant="outline" onClick={() => setForkOpen(true)}>
              <GitFork className="h-4 w-4 mr-2" /> Fork
            </Button>
          ) : (
            <Link to="/login">
              <Button size="sm"><LogIn className="h-4 w-4 mr-2" /> Sign In</Button>
            </Link>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {format(new Date(prompt.created_at), "MMM d, yyyy")}
          </span>
          <button
            onClick={toggleLike}
            disabled={liking}
            className={`flex items-center gap-1 transition-colors ${myLike ? "text-destructive" : "hover:text-destructive"}`}
          >
            <Heart className={`h-3.5 w-3.5 ${myLike ? "fill-current" : ""}`} />
            {prompt.like_count || 0} likes
          </button>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {prompt.comment_count || 0} comments
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {prompt.view_count || 0} views
          </span>
        </div>

        {prompt.tags?.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {prompt.tags.map((t: string) => (
              <Link key={t} to={`/explore?tag=${encodeURIComponent(t)}`}>
                <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80">{t}</Badge>
              </Link>
            ))}
          </div>
        )}

        {/* Prompt Content */}
        {latestVersion ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Prompt (v{latestVersion.version_number})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-1">
                  <Badge variant="outline" className="text-[10px] capitalize">{msg.role}</Badge>
                  <pre className="text-sm whitespace-pre-wrap font-mono text-foreground/90">{msg.content}</pre>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No version available yet.
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Comments */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Comments ({comments?.length || 0})</h2>

          {user && (
            <div className="flex gap-3">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts..."
                className="min-h-[80px]"
              />
              <Button
                onClick={submitComment}
                disabled={submitting || !comment.trim()}
                size="icon"
                className="shrink-0 self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}

          {!user && (
            <p className="text-sm text-muted-foreground">
              <Link to="/login" className="text-primary underline">Sign in</Link> to leave a comment.
            </p>
          )}

          {comments?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Be the first!</p>
          )}

          <div className="space-y-3">
            {comments?.map((c: any) => (
              <div key={c.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    <User className="h-3.5 w-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{format(new Date(c.created_at), "MMM d, yyyy")}</span>
                  </div>
                  <p className="text-sm">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {prompt && (
        <ForkPromptDialog
          open={forkOpen}
          onOpenChange={setForkOpen}
          promptId={prompt.id}
          promptName={prompt.name}
        />
      )}
    </div>
  );
}
