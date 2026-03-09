import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { section: "Navigation", items: [
    { keys: ["g", "d"], label: "Go to Dashboard" },
    { keys: ["g", "p"], label: "Go to Prompts" },
    { keys: ["g", "s"], label: "Go to Settings" },
    { keys: ["g", "m"], label: "Go to Members" },
    { keys: ["g", "e"], label: "Go to Explore" },
  ]},
  { section: "Actions", items: [
    { keys: ["c"], label: "Create new prompt" },
    { keys: ["⌘", "K"], label: "Open search" },
  ]},
  { section: "General", items: [
    { keys: ["?"], label: "Show keyboard shortcuts" },
  ]},
];

export function KeyboardShortcutsDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>Navigate faster with these shortcuts.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {shortcuts.map((section) => (
            <div key={section.section}>
              <h3 className="text-sm font-semibold text-foreground mb-2">{section.section}</h3>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-xs text-muted-foreground mx-0.5">then</span>}
                          <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
