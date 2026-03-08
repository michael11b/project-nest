import { createContext, useContext } from "react";
import { useParams } from "react-router-dom";
import { useWorkspaces, type WorkspaceWithRole } from "./useWorkspaces";

interface WorkspaceContextValue {
  workspace: WorkspaceWithRole;
  role: WorkspaceWithRole["role"];
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspaceFromParams() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { data: workspaces, isLoading, error } = useWorkspaces();

  const workspace = workspaces?.find((w) => w.slug === workspaceSlug) ?? null;

  return {
    workspace,
    role: workspace?.role ?? null,
    isLoading,
    error,
    notFound: !isLoading && !workspace,
  };
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceLayout");
  return ctx;
}
