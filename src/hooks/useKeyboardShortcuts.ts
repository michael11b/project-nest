import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";

/**
 * Registers global keyboard shortcuts for workspace navigation.
 * Must be used inside WorkspaceContext.
 */
export function useKeyboardShortcuts(onShowHelp: () => void) {
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const base = `/w/${workspace.slug}`;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea or a dialog is open
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable ||
        target.closest("[role='dialog']")
      ) {
        return;
      }

      // Don't intercept if any modifier key is held (except shift for ?)
      const hasModifier = e.metaKey || e.ctrlKey || e.altKey;

      // Shift+/ = ?  (show help)
      if (e.key === "?" && !hasModifier) {
        e.preventDefault();
        onShowHelp();
        return;
      }

      if (hasModifier) return;

      switch (e.key) {
        case "g":
          // Wait for second key
          waitForSecondKey(e, navigate, base);
          return;
        case "c":
          e.preventDefault();
          navigate(`${base}/prompts/new`);
          return;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [navigate, base, onShowHelp]);
}

let secondKeyTimeout: ReturnType<typeof setTimeout> | null = null;
let waitingForG = false;

function waitForSecondKey(
  _firstEvent: KeyboardEvent,
  navigate: ReturnType<typeof useNavigate>,
  base: string
) {
  if (waitingForG) return;
  waitingForG = true;

  const handler = (e: KeyboardEvent) => {
    cleanup();
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

    switch (e.key) {
      case "d":
        e.preventDefault();
        navigate(base);
        break;
      case "p":
        e.preventDefault();
        navigate(`${base}/prompts`);
        break;
      case "s":
        e.preventDefault();
        navigate(`${base}/settings`);
        break;
      case "m":
        e.preventDefault();
        navigate(`${base}/settings/members`);
        break;
      case "e":
        e.preventDefault();
        navigate("/explore");
        break;
    }
  };

  const cleanup = () => {
    document.removeEventListener("keydown", handler);
    if (secondKeyTimeout) clearTimeout(secondKeyTimeout);
    waitingForG = false;
  };

  document.addEventListener("keydown", handler, { once: true });
  secondKeyTimeout = setTimeout(cleanup, 1000);
}
