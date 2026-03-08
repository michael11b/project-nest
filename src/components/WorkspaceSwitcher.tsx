import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronsUpDown, Plus } from "lucide-react";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useWorkspace } from "@/hooks/useWorkspace";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export function WorkspaceSwitcher() {
  const { workspace } = useWorkspace();
  const { data: workspaces } = useWorkspaces();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton size="lg" className="w-full">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
              {workspace.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="font-semibold truncate">{workspace.name}</span>
              <span className="text-xs text-muted-foreground">{workspace.role}</span>
            </div>
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          {workspaces?.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => navigate(`/w/${ws.slug}`)}
              className={ws.id === workspace.id ? "bg-accent" : ""}
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground text-[10px] font-bold mr-2">
                {ws.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{ws.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
