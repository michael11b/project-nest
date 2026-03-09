import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type Mode = "followers" | "following";

function useFollowList(userId: string | undefined, mode: Mode, enabled: boolean) {
  return useQuery({
    queryKey: ["follow-list", userId, mode],
    queryFn: async () => {
      if (mode === "followers") {
        const { data, error } = await supabase
          .from("user_follows")
          .select("follower_id")
          .eq("following_id", userId!);
        if (error) throw error;
        const ids = data.map((r) => r.follower_id);
        if (!ids.length) return [];
        const { data: profiles, error: pErr } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", ids);
        if (pErr) throw pErr;
        return profiles ?? [];
      } else {
        const { data, error } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", userId!);
        if (error) throw error;
        const ids = data.map((r) => r.following_id);
        if (!ids.length) return [];
        const { data: profiles, error: pErr } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", ids);
        if (pErr) throw pErr;
        return profiles ?? [];
      }
    },
    enabled: enabled && !!userId,
  });
}

interface Props {
  userId: string;
  mode: Mode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FollowListDialog({ userId, mode, open, onOpenChange }: Props) {
  const { data: users, isLoading } = useFollowList(userId, mode, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "followers" ? "Followers" : "Following"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="space-y-3 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : !users?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {mode === "followers" ? "No followers yet." : "Not following anyone yet."}
            </p>
          ) : (
            <div className="space-y-1 p-2">
              {users.map((u: any) => (
                <Link
                  key={u.user_id}
                  to={`/u/${u.user_id}`}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-accent transition-colors"
                >
                  <Avatar className="h-9 w-9">
                    {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                    <AvatarFallback className="text-xs">
                      {(u.display_name || "?")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">
                    {u.display_name || "Anonymous"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
