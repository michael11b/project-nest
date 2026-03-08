import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateCollection } from "@/hooks/useCollections";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface CollectionCoverUploadProps {
  collectionId: string;
  userId: string;
  currentUrl: string | null;
}

export default function CollectionCoverUpload({ collectionId, userId, currentUrl }: CollectionCoverUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const updateCollection = useUpdateCollection();

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${collectionId}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("collection-covers")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from("collection-covers")
        .getPublicUrl(path);

      // Bust cache with timestamp
      const url = `${publicUrl}?t=${Date.now()}`;
      await updateCollection.mutateAsync({ id: collectionId, cover_image_url: url });
      toast.success("Cover image updated");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeCover = async () => {
    setUploading(true);
    try {
      await updateCollection.mutateAsync({ id: collectionId, cover_image_url: "" });
      toast.success("Cover image removed");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to remove cover");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Camera className="h-4 w-4 mr-1" />}
        {currentUrl ? "Change Cover" : "Add Cover"}
      </Button>
      {currentUrl && (
        <Button variant="ghost" size="sm" disabled={uploading} onClick={removeCover}>
          <X className="h-4 w-4 mr-1" /> Remove
        </Button>
      )}
    </div>
  );
}
