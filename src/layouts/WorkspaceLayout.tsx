import { Outlet, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useWorkspaceFromParams, WorkspaceContext } from "@/hooks/useWorkspace";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function WorkspaceLayout() {
  const { workspace, role, isLoading, notFound } = useWorkspaceFromParams();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !workspace || !role) {
    return <Navigate to="/" replace />;
  }

  return (
    <WorkspaceContext.Provider value={{ workspace, role }}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset>
            <TopBar />
            <div className="flex-1 p-6">
              <Outlet />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </WorkspaceContext.Provider>
  );
}
