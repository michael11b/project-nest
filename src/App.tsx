import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import WorkspaceLayout from "./layouts/WorkspaceLayout";
import Dashboard from "./pages/Dashboard";
import PromptList from "./pages/PromptList";
import CreatePrompt from "./pages/CreatePrompt";
import PromptDetailLayout from "./layouts/PromptDetailLayout";
import PromptOverview from "./pages/PromptOverview";
import VersionsList from "./pages/VersionsList";
import VersionEditor from "./pages/VersionEditor";
import PlaceholderTab from "./pages/PlaceholderTab";
import ReleasesTab from "./pages/ReleasesTab";
import TestsTab from "./pages/TestsTab";
import EvalsTab from "./pages/EvalsTab";
import EvalRunDetail from "./pages/EvalRunDetail";
import DriftTab from "./pages/DriftTab";
import AuditLogsSettings from "./pages/AuditLogsSettings";
import Explore from "./pages/Explore";
import CollectionsList from "./pages/CollectionsList";
import CollectionDetail from "./pages/CollectionDetail";
import ExplorePromptDetail from "./pages/ExplorePromptDetail";
import UserProfile from "./pages/UserProfile";
import ProviderKeysSettings from "./pages/ProviderKeysSettings";
import WorkspaceSettings from "./pages/WorkspaceSettings";
import MembersSettings from "./pages/MembersSettings";
import EnvironmentsSettings from "./pages/EnvironmentsSettings";
import ApiKeysSettings from "./pages/ApiKeysSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/explore/:promptId" element={<ExplorePromptDetail />} />
            <Route path="/collections" element={<CollectionsList />} />
            <Route path="/collections/:collectionId" element={<CollectionDetail />} />
            <Route path="/u/:userId" element={<UserProfile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/w/:workspaceSlug"
              element={
                <ProtectedRoute>
                  <WorkspaceLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="prompts" element={<PromptList />} />
              <Route path="prompts/new" element={<CreatePrompt />} />
              <Route path="prompts/:promptId" element={<PromptDetailLayout />}>
                <Route index element={<PromptOverview />} />
                <Route path="versions" element={<VersionsList />} />
                <Route path="versions/:versionId" element={<VersionEditor />} />
                <Route path="tests" element={<TestsTab />} />
                <Route path="evals" element={<EvalsTab />} />
                <Route path="evals/:evalRunId" element={<EvalRunDetail />} />
                <Route path="releases" element={<ReleasesTab />} />
                <Route path="drift" element={<DriftTab />} />
              </Route>
              <Route path="settings" element={<WorkspaceSettings />} />
              <Route path="settings/members" element={<MembersSettings />} />
              <Route path="settings/environments" element={<EnvironmentsSettings />} />
              <Route path="settings/api-keys" element={<ApiKeysSettings />} />
              <Route path="settings/provider-keys" element={<ProviderKeysSettings />} />
              <Route path="settings/audit-logs" element={<AuditLogsSettings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
