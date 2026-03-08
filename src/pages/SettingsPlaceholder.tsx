import { Settings } from "lucide-react";

export default function SettingsPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Settings className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h2 className="text-lg font-semibold">Settings</h2>
      <p className="text-sm text-muted-foreground">This feature is coming soon.</p>
    </div>
  );
}
