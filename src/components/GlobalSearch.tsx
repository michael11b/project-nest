import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FileText, FolderOpen, User, Search } from "lucide-react";

interface SearchResult {
  id: string;
  type: "prompt" | "collection" | "user";
  title: string;
  subtitle?: string;
  link: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const search = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      const term = `%${q.trim()}%`;

      const [promptsRes, collectionsRes, profilesRes] = await Promise.all([
        supabase
          .from("prompts")
          .select("id, name, description, workspace_id, workspaces:workspaces(slug)")
          .eq("visibility", "public")
          .ilike("name", term)
          .limit(5),
        supabase
          .from("collections")
          .select("id, title, description")
          .eq("visibility", "public")
          .ilike("title", term)
          .limit(5),
        supabase
          .from("profiles")
          .select("user_id, display_name, email")
          .or(`display_name.ilike.${term},email.ilike.${term}`)
          .limit(5),
      ]);

      const items: SearchResult[] = [];

      for (const p of promptsRes.data ?? []) {
        items.push({
          id: p.id,
          type: "prompt",
          title: p.name,
          subtitle: p.description?.slice(0, 60) || undefined,
          link: `/explore/${p.id}`,
        });
      }

      for (const c of collectionsRes.data ?? []) {
        items.push({
          id: c.id,
          type: "collection",
          title: c.title,
          subtitle: c.description?.slice(0, 60) || undefined,
          link: `/collections/${c.id}`,
        });
      }

      for (const u of profilesRes.data ?? []) {
        items.push({
          id: u.user_id,
          type: "user",
          title: u.display_name || u.email || "User",
          subtitle: u.email || undefined,
          link: `/u/${u.user_id}`,
        });
      }

      setResults(items);
      setLoading(false);
    },
    []
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleSelect = (link: string) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    navigate(link);
  };

  const prompts = results.filter((r) => r.type === "prompt");
  const collections = results.filter((r) => r.type === "collection");
  const users = results.filter((r) => r.type === "user");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-8 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="pointer-events-none hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search prompts, collections, users..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>}
          <CommandEmpty>
            {query.trim().length < 2 ? "Type at least 2 characters..." : "No results found."}
          </CommandEmpty>

          {prompts.length > 0 && (
            <CommandGroup heading="Prompts">
              {prompts.map((r) => (
                <CommandItem key={r.id} onSelect={() => handleSelect(r.link)} className="cursor-pointer">
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    {r.subtitle && <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {collections.length > 0 && (
            <CommandGroup heading="Collections">
              {collections.map((r) => (
                <CommandItem key={r.id} onSelect={() => handleSelect(r.link)} className="cursor-pointer">
                  <FolderOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    {r.subtitle && <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {users.length > 0 && (
            <CommandGroup heading="Users">
              {users.map((r) => (
                <CommandItem key={r.id} onSelect={() => handleSelect(r.link)} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    {r.subtitle && <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
