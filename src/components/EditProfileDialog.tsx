import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface NotificationPrefs {
  new_follower: boolean;
  prompt_liked: boolean;
  prompt_commented: boolean;
  collection_updated: boolean;
}

const defaultPrefs: NotificationPrefs = {
  new_follower: true,
  prompt_liked: true,
  prompt_commented: true,
  collection_updated: false,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    user_id: string;
    display_name: string | null;
    bio: string | null;
    website: string | null;
    avatar_url: string | null;
    notification_prefs?: any;
  };
}

export function EditProfileDialog({ open, onOpenChange, profile }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [website, setWebsite] = useState(profile.website ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 2MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const updates: Record<string, string | null> = {
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      website: website.trim() || null,
    };

    if (avatarUrl !== (profile.avatar_url ?? "")) {
      updates.avatar_url = avatarUrl || null;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Profile updated!" });
    qc.invalidateQueries({ queryKey: ["user-profile", user.id] });
    onOpenChange(false);
  };

  const initials = (displayName || "U").slice(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your public profile information.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <Avatar className="h-20 w-20 border-2 border-border">
                {avatarUrl && <AvatarImage src={avatarUrl} />}
                <AvatarFallback className="text-xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <p className="text-xs text-muted-foreground">Click to change avatar (max 2MB)</p>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Display Name</Label>
            <Input
              id="edit-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 100))}
              placeholder="Your name"
              maxLength={100}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="edit-bio">Bio</Label>
            <Textarea
              id="edit-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 500))}
              placeholder="Tell the world about yourself..."
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">{bio.length}/500</p>
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="edit-website">Website</Label>
            <Input
              id="edit-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value.slice(0, 200))}
              placeholder="https://example.com"
              maxLength={200}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
