import {
  LayoutDashboard,
  FileText,
  Settings,
  Users,
  Key,
  Server,
  Layers,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useWorkspace } from "@/hooks/useWorkspace";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { workspace } = useWorkspace();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const base = `/w/${workspace.slug}`;

  const mainItems = [
    { title: "Dashboard", url: base, icon: LayoutDashboard, end: true },
    { title: "Prompts", url: `${base}/prompts`, icon: FileText },
  ];

  const settingsItems = [
    { title: "General", url: `${base}/settings`, icon: Settings, end: true },
    { title: "Members", url: `${base}/settings/members`, icon: Users },
    { title: "API Keys", url: `${base}/settings/api-keys`, icon: Key },
    { title: "Provider Keys", url: `${base}/settings/provider-keys`, icon: ShieldCheck },
    { title: "Environments", url: `${base}/settings/environments`, icon: Layers },
    { title: "Audit Logs", url: `${base}/settings/audit-logs`, icon: ScrollText },
  ];

  const isActive = (url: string, end?: boolean) =>
    end ? location.pathname === url : location.pathname.startsWith(url);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <WorkspaceSwitcher />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, item.end)} tooltip={item.title}>
                    <NavLink to={item.url} end={item.end}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, item.end)} tooltip={item.title}>
                    <NavLink to={item.url} end={item.end}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
