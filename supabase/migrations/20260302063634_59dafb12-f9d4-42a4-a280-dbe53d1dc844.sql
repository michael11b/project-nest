
-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
CREATE TYPE public.visibility AS ENUM ('private', 'workspace', 'public');
CREATE TYPE public.prompt_version_status AS ENUM ('draft', 'in_review', 'approved', 'deprecated');
CREATE TYPE public.provider AS ENUM ('openai', 'anthropic', 'google');
CREATE TYPE public.eval_run_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');
CREATE TYPE public.alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.alert_status AS ENUM ('open', 'acknowledged', 'resolved');

-- ============================================
-- UTILITY: updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- WORKSPACES
-- ============================================
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  personal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- WORKSPACE_MEMBERS (role table — never on profiles)
-- ============================================
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.workspace_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RBAC HELPER FUNCTIONS (security definer — avoids RLS recursion)
-- ============================================
CREATE OR REPLACE FUNCTION public.has_workspace_role(_user_id UUID, _workspace_id UUID, _role public.workspace_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_role_at_least(_user_id UUID, _workspace_id UUID, _min_role public.workspace_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
      AND CASE role
        WHEN 'owner' THEN 4
        WHEN 'admin' THEN 3
        WHEN 'editor' THEN 2
        WHEN 'viewer' THEN 1
      END >= CASE _min_role
        WHEN 'owner' THEN 4
        WHEN 'admin' THEN 3
        WHEN 'editor' THEN 2
        WHEN 'viewer' THEN 1
      END
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  );
$$;

-- ============================================
-- RLS: profiles
-- ============================================
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- RLS: workspaces (members can view)
-- ============================================
CREATE POLICY "Members can view workspace" ON public.workspaces FOR SELECT
  USING (public.is_workspace_member(auth.uid(), id));
CREATE POLICY "Admins can update workspace" ON public.workspaces FOR UPDATE
  USING (public.has_workspace_role_at_least(auth.uid(), id, 'admin'));

-- ============================================
-- RLS: workspace_members
-- ============================================
CREATE POLICY "Members can view members" ON public.workspace_members FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins can insert members" ON public.workspace_members FOR INSERT
  WITH CHECK (public.has_workspace_role_at_least(auth.uid(), workspace_id, 'admin'));
CREATE POLICY "Admins can update members" ON public.workspace_members FOR UPDATE
  USING (public.has_workspace_role_at_least(auth.uid(), workspace_id, 'admin'));
CREATE POLICY "Admins can delete members" ON public.workspace_members FOR DELETE
  USING (public.has_workspace_role_at_least(auth.uid(), workspace_id, 'admin'));

-- ============================================
-- ENVIRONMENTS
-- ============================================
CREATE TABLE public.environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, slug)
);
ALTER TABLE public.environments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view envs" ON public.environments FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins can insert envs" ON public.environments FOR INSERT
  WITH CHECK (public.has_workspace_role_at_least(auth.uid(), workspace_id, 'admin'));
CREATE POLICY "Admins can update envs" ON public.environments FOR UPDATE
  USING (public.has_workspace_role_at_least(auth.uid(), workspace_id, 'admin'));
CREATE POLICY "Admins can delete envs" ON public.environments FOR DELETE
  USING (public.has_workspace_role_at_least(auth.uid(), workspace_id, 'admin'));

-- ============================================
-- PROMPTS
-- ============================================
CREATE TABLE public.prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  visibility public.visibility NOT NULL DEFAULT 'workspace',
  tags TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, slug)
);
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_prompts_updated_at BEFORE UPDATE ON public.prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Members can view prompts" ON public.prompts FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Editors can insert prompts" ON public.prompts FOR INSERT
  WITH CHECK (public.has_workspace_role_at_least(auth.uid(), workspace_id, 'editor'));
CREATE POLICY "Editors can update prompts" ON public.prompts FOR UPDATE
  USING (public.has_workspace_role_at_least(auth.uid(), workspace_id, 'editor'));
CREATE POLICY "Admins can delete prompts" ON public.prompts FOR DELETE
  USING (public.has_workspace_role_at_least(auth.uid(), workspace_id, 'admin'));

-- ============================================
-- PROMPT_VERSIONS (immutable)
-- ============================================
CREATE TABLE public.prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  status public.prompt_version_status NOT NULL DEFAULT 'draft',
  content_json JSONB NOT NULL DEFAULT '[]',
  contract_json JSONB NOT NULL DEFAULT '{}',
  settings_json JSONB NOT NULL DEFAULT '{}',
  changelog TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(prompt_id, version_number)
);
ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view versions" ON public.prompt_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.prompts p
    WHERE p.id = prompt_id AND public.is_workspace_member(auth.uid(), p.workspace_id)
  ));
CREATE POLICY "Editors can insert versions" ON public.prompt_versions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.prompts p
    WHERE p.id = prompt_id AND public.has_workspace_role_at_least(auth.uid(), p.workspace_id, 'editor')
  ));
CREATE POLICY "Admins can update version status" ON public.prompt_versions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.prompts p
    WHERE p.id = prompt_id AND public.has_workspace_role_at_least(auth.uid(), p.workspace_id, 'admin')
  ));

-- ============================================
-- TEST_SUITES
-- ============================================
CREATE TABLE public.test_suites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.test_suites ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_test_suites_updated_at BEFORE UPDATE ON public.test_suites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Members can view suites" ON public.test_suites FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.prompts p
    WHERE p.id = prompt_id AND public.is_workspace_member(auth.uid(), p.workspace_id)
  ));
CREATE POLICY "Editors can insert suites" ON public.test_suites FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.prompts p
    WHERE p.id = prompt_id AND public.has_workspace_role_at_least(auth.uid(), p.workspace_id, 'editor')
  ));
CREATE POLICY "Editors can update suites" ON public.test_suites FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.prompts p
    WHERE p.id = prompt_id AND public.has_workspace_role_at_least(auth.uid(), p.workspace_id, 'editor')
  ));
CREATE POLICY "Editors can delete suites" ON public.test_suites FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.prompts p
    WHERE p.id = prompt_id AND public.has_workspace_role_at_least(auth.uid(), p.workspace_id, 'editor')
  ));

-- ============================================
-- TEST_CASES
-- ============================================
CREATE TABLE public.test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id UUID NOT NULL REFERENCES public.test_suites(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled',
  inputs_json JSONB NOT NULL DEFAULT '{}',
  checks_json JSONB NOT NULL DEFAULT '[]',
  critical BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_test_cases_updated_at BEFORE UPDATE ON public.test_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Members can view cases" ON public.test_cases FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.test_suites ts
    JOIN public.prompts p ON p.id = ts.prompt_id
    WHERE ts.id = suite_id AND public.is_workspace_member(auth.uid(), p.workspace_id)
  ));
CREATE POLICY "Editors can insert cases" ON public.test_cases FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.test_suites ts
    JOIN public.prompts p ON p.id = ts.prompt_id
    WHERE ts.id = suite_id AND public.has_workspace_role_at_least(auth.uid(), p.workspace_id, 'editor')
  ));
CREATE POLICY "Editors can update cases" ON public.test_cases FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.test_suites ts
    JOIN public.prompts p ON p.id = ts.prompt_id
    WHERE ts.id = suite_id AND public.has_workspace_role_at_least(auth.uid(), p.workspace_id, 'editor')
  ));
CREATE POLICY "Editors can delete cases" ON public.test_cases FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.test_suites ts
    JOIN public.prompts p ON p.id = ts.prompt_id
    WHERE ts.id = suite_id AND public.has_workspace_role_at_least(auth.uid(), p.workspace_id, 'editor')
  ));

-- ============================================
-- EVAL_RUNS
-- ============================================
CREATE TABLE public.eval_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  prompt_version_id UUID NOT NULL REFERENCES public.prompt_versions(id) ON DELETE CASCADE,
  test_suite_id UUID NOT NULL REFERENCES public.test_suites(id) ON DELETE CASCADE,
  provider public.provider NOT NULL DEFAULT 'openai',
  model TEXT NOT NULL DEFAULT 'gpt-4o',
  settings_json JSONB NOT NULL DEFAULT '{}',
  status public.eval_run_status NOT NULL DEFAULT 'queued',
  score NUMERIC(5,4),
  critical_failed BOOLEAN NOT NULL DEFAULT false,
  cost_json JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.eval_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view runs" ON public.eval_runs FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Editors can insert runs" ON public.eval_runs FOR INSERT
  WITH CHECK (public.has_workspace_role_at_least(auth.uid(), workspace_id, 'editor'));

-- ============================================
-- EVAL_RESULTS
-- ============================================
CREATE TABLE public.eval_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eval_run_id UUID NOT NULL REFERENCES public.eval_runs(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
  output_text TEXT,
  check_results_json JSONB NOT NULL DEFAULT '[]',
  passed BOOLEAN NOT NULL DEFAULT false,
  latency_ms INT,
  token_usage_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.eval_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view results" ON public.eval_results FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.eval_runs r
    WHERE r.id = eval_run_id AND public.is_workspace_member(auth.uid(), r.workspace_id)
  ));

-- ============================================
-- RELEASES
-- ============================================
CREATE TABLE public.releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id UUID NOT NULL REFERENCES public.environments(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  prompt_version_id UUID NOT NULL REFERENCES public.prompt_versions(id) ON DELETE CASCADE,
  released_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view releases" ON public.releases FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.environments e
    WHERE e.id = environment_id AND public.is_workspace_member(auth.uid(), e.workspace_id)
  ));
CREATE POLICY "Admins can insert releases" ON public.releases FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.environments e
    WHERE e.id = environment_id AND public.has_workspace_role_at_least(auth.uid(), e.workspace_id, 'admin')
  ));

-- ============================================
-- DRIFT_POLICIES
-- ============================================
CREATE TABLE public.drift_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  environment_id UUID NOT NULL REFERENCES public.environments(id) ON DELETE CASCADE,
  test_suite_id UUID NOT NULL REFERENCES public.test_suites(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  schedule_cron TEXT NOT NULL DEFAULT '0 */6 * * *',
  threshold NUMERIC(5,4) NOT NULL DEFAULT 0.9,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.drift_policies ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_drift_policies_updated_at BEFORE UPDATE ON public.drift_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Members can view drift policies" ON public.drift_policies FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins can insert drift policies" ON public.drift_policies FOR INSERT
  WITH CHECK (public.has_workspace_role_at_least(auth.uid(), workspace_id, 'admin'));
CREATE POLICY "Admins can update drift policies" ON public.drift_policies FOR UPDATE
  USING (public.has_workspace_role_at_least(auth.uid(), workspace_id, 'admin'));
CREATE POLICY "Admins can delete drift policies" ON public.drift_policies FOR DELETE
  USING (public.has_workspace_role_at_least(auth.uid(), workspace_id, 'admin'));

-- ============================================
-- DRIFT_ALERTS
-- ============================================
CREATE TABLE public.drift_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drift_policy_id UUID NOT NULL REFERENCES public.drift_policies(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  eval_run_id UUID REFERENCES public.eval_runs(id),
  severity public.alert_severity NOT NULL DEFAULT 'medium',
  status public.alert_status NOT NULL DEFAULT 'open',
  baseline_score NUMERIC(5,4),
  current_score NUMERIC(5,4),
  message TEXT,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.drift_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view drift alerts" ON public.drift_alerts FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins can update drift alerts" ON public.drift_alerts FOR UPDATE
  USING (public.has_workspace_role_at_least(auth.uid(), workspace_id, 'admin'));

-- ============================================
-- API_KEYS
-- ============================================
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view api keys" ON public.api_keys FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins can insert api keys" ON public.api_keys FOR INSERT
  WITH CHECK (public.has_workspace_role_at_least(auth.uid(), workspace_id, 'admin'));
CREATE POLICY "Admins can update api keys" ON public.api_keys FOR UPDATE
  USING (public.has_workspace_role_at_least(auth.uid(), workspace_id, 'admin'));
CREATE POLICY "Admins can delete api keys" ON public.api_keys FOR DELETE
  USING (public.has_workspace_role_at_least(auth.uid(), workspace_id, 'admin'));

-- ============================================
-- PROVIDER_KEYS (BYOK — encrypted)
-- ============================================
CREATE TABLE public.provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider public.provider NOT NULL,
  display_name TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, provider)
);
ALTER TABLE public.provider_keys ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_provider_keys_updated_at BEFORE UPDATE ON public.provider_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Admins can view provider keys" ON public.provider_keys FOR SELECT
  USING (public.has_workspace_role_at_least(auth.uid(), workspace_id, 'admin'));
CREATE POLICY "Admins can insert provider keys" ON public.provider_keys FOR INSERT
  WITH CHECK (public.has_workspace_role_at_least(auth.uid(), workspace_id, 'admin'));
CREATE POLICY "Admins can update provider keys" ON public.provider_keys FOR UPDATE
  USING (public.has_workspace_role_at_least(auth.uid(), workspace_id, 'admin'));
CREATE POLICY "Admins can delete provider keys" ON public.provider_keys FOR DELETE
  USING (public.has_workspace_role_at_least(auth.uid(), workspace_id, 'admin'));

-- ============================================
-- AUDIT_EVENTS
-- ============================================
CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view audit events" ON public.audit_events FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "System can insert audit events" ON public.audit_events FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- ============================================
-- IDEMPOTENCY_KEYS
-- ============================================
CREATE TABLE public.idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  response_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can select idempotency keys" ON public.idempotency_keys FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert idempotency keys" ON public.idempotency_keys FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- ============================================
-- AUTO-CREATE PROFILE + WORKSPACE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  ws_id UUID;
  ws_slug TEXT;
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));

  ws_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g'));
  ws_slug := ws_slug || '-' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO public.workspaces (name, slug, personal)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Workspace',
    ws_slug,
    true
  )
  RETURNING id INTO ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (ws_id, NEW.id, 'owner');

  INSERT INTO public.environments (workspace_id, name, slug, sort_order) VALUES
    (ws_id, 'Development', 'dev', 0),
    (ws_id, 'Staging', 'staging', 1),
    (ws_id, 'Production', 'prod', 2);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX idx_prompts_workspace ON public.prompts(workspace_id);
CREATE INDEX idx_prompts_slug ON public.prompts(workspace_id, slug);
CREATE INDEX idx_prompt_versions_prompt ON public.prompt_versions(prompt_id);
CREATE INDEX idx_test_suites_prompt ON public.test_suites(prompt_id);
CREATE INDEX idx_test_cases_suite ON public.test_cases(suite_id);
CREATE INDEX idx_eval_runs_workspace ON public.eval_runs(workspace_id);
CREATE INDEX idx_eval_runs_version ON public.eval_runs(prompt_version_id);
CREATE INDEX idx_eval_results_run ON public.eval_results(eval_run_id);
CREATE INDEX idx_releases_env ON public.releases(environment_id);
CREATE INDEX idx_releases_prompt ON public.releases(prompt_id);
CREATE INDEX idx_drift_alerts_workspace ON public.drift_alerts(workspace_id);
CREATE INDEX idx_audit_events_workspace ON public.audit_events(workspace_id);
CREATE INDEX idx_audit_events_created ON public.audit_events(created_at);
