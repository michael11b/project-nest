import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { Loader2 } from "lucide-react";

export default function Index() {
  const { user, loading } = useAuth();
  const { data: workspaces, isLoading: wsLoading } = useWorkspaces();

  if (loading || wsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (workspaces?.length) {
    return <Navigate to={`/w/${workspaces[0].slug}`} replace />;
  }

  return <Navigate to="/login" replace />;
}
