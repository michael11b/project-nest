import { Outlet, NavLink, useParams } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePromptQuery, PromptContext } from "@/hooks/usePrompt";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Overview", to: "", end: true },
  { label: "Versions", to: "versions" },
  { label: "Tests", to: "tests" },
  { label: "Evals", to: "evals" },
  { label: "Releases", to: "releases" },
  { label: "Drift", to: "drift" },
];

export default function PromptDetailLayout() {
  const { promptId } = useParams<{ promptId: string }>();
  const { workspace } = useWorkspace();
  const navigate = useNavigate();
  const { data: prompt, isLoading, error } = usePromptQuery(promptId, workspace.id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Prompt not found.</p>
        <Button variant="link" onClick={() => navigate(`/w/${workspace.slug}/prompts`)}>
          Back to Prompts
        </Button>
      </div>
    );
  }

  return (
    <PromptContext.Provider value={{ prompt }}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/w/${workspace.slug}/prompts`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{prompt.name}</h1>
              <Badge variant="outline" className="font-mono text-xs">{prompt.slug}</Badge>
              <Badge variant="secondary" className="text-xs capitalize">{prompt.visibility}</Badge>
            </div>
            {(prompt.tags ?? []).length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {prompt.tags!.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tab nav */}
        <nav className="flex gap-1 border-b">
          {tabs.map((tab) => (
            <NavLink
              key={tab.label}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </div>
    </PromptContext.Provider>
  );
}
