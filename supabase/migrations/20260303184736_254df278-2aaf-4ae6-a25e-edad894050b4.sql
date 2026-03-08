
-- Helper function to insert audit events (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _workspace_id uuid,
  _action text,
  _actor_id uuid,
  _target_type text DEFAULT NULL,
  _target_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_events (workspace_id, action, actor_id, target_type, target_id, metadata_json)
  VALUES (_workspace_id, _action, _actor_id, _target_type, _target_id, _metadata);
END;
$$;

-- Prompts trigger
CREATE OR REPLACE FUNCTION public.audit_prompts_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _action text;
  _row record;
  _actor uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN _row := OLD; ELSE _row := NEW; END IF;
  _actor := COALESCE(auth.uid(), _row.created_by);
  CASE TG_OP
    WHEN 'INSERT' THEN _action := 'prompt.created';
    WHEN 'UPDATE' THEN _action := 'prompt.updated';
    WHEN 'DELETE' THEN _action := 'prompt.deleted';
  END CASE;
  PERFORM log_audit_event(_row.workspace_id, _action, _actor, 'prompt', _row.id,
    jsonb_build_object('name', _row.name, 'slug', _row.slug));
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_prompts AFTER INSERT OR UPDATE OR DELETE ON public.prompts
FOR EACH ROW EXECUTE FUNCTION public.audit_prompts_trigger();

-- Prompt versions trigger
CREATE OR REPLACE FUNCTION public.audit_prompt_versions_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _action text;
  _ws_id uuid;
  _actor uuid;
BEGIN
  SELECT workspace_id INTO _ws_id FROM public.prompts WHERE id = NEW.prompt_id;
  _actor := COALESCE(auth.uid(), NEW.created_by);
  CASE TG_OP
    WHEN 'INSERT' THEN _action := 'version.created';
    WHEN 'UPDATE' THEN _action := 'version.updated';
  END CASE;
  PERFORM log_audit_event(_ws_id, _action, _actor, 'prompt_version', NEW.id,
    jsonb_build_object('version_number', NEW.version_number, 'status', NEW.status));
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_prompt_versions AFTER INSERT OR UPDATE ON public.prompt_versions
FOR EACH ROW EXECUTE FUNCTION public.audit_prompt_versions_trigger();

-- Releases trigger
CREATE OR REPLACE FUNCTION public.audit_releases_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ws_id uuid;
  _actor uuid;
BEGIN
  SELECT workspace_id INTO _ws_id FROM public.environments WHERE id = NEW.environment_id;
  _actor := COALESCE(auth.uid(), NEW.released_by);
  PERFORM log_audit_event(_ws_id, 'release.created', _actor, 'release', NEW.id,
    jsonb_build_object('environment_id', NEW.environment_id, 'version_id', NEW.prompt_version_id));
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_releases AFTER INSERT ON public.releases
FOR EACH ROW EXECUTE FUNCTION public.audit_releases_trigger();

-- Workspace members trigger
CREATE OR REPLACE FUNCTION public.audit_workspace_members_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _action text;
  _row record;
  _actor uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN _row := OLD; ELSE _row := NEW; END IF;
  _actor := COALESCE(auth.uid(), _row.user_id);
  CASE TG_OP
    WHEN 'INSERT' THEN _action := 'member.added';
    WHEN 'DELETE' THEN _action := 'member.removed';
  END CASE;
  PERFORM log_audit_event(_row.workspace_id, _action, _actor, 'member', _row.id,
    jsonb_build_object('role', _row.role, 'user_id', _row.user_id));
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_workspace_members AFTER INSERT OR DELETE ON public.workspace_members
FOR EACH ROW EXECUTE FUNCTION public.audit_workspace_members_trigger();

-- Test suites trigger
CREATE OR REPLACE FUNCTION public.audit_test_suites_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _action text;
  _row record;
  _ws_id uuid;
  _actor uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN _row := OLD; ELSE _row := NEW; END IF;
  SELECT workspace_id INTO _ws_id FROM public.prompts WHERE id = _row.prompt_id;
  _actor := COALESCE(auth.uid(), _row.created_by);
  CASE TG_OP
    WHEN 'INSERT' THEN _action := 'suite.created';
    WHEN 'UPDATE' THEN _action := 'suite.updated';
    WHEN 'DELETE' THEN _action := 'suite.deleted';
  END CASE;
  PERFORM log_audit_event(_ws_id, _action, _actor, 'test_suite', _row.id,
    jsonb_build_object('name', _row.name));
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_test_suites AFTER INSERT OR UPDATE OR DELETE ON public.test_suites
FOR EACH ROW EXECUTE FUNCTION public.audit_test_suites_trigger();

-- Drift policies trigger
CREATE OR REPLACE FUNCTION public.audit_drift_policies_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _action text;
  _row record;
  _actor uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN _row := OLD; ELSE _row := NEW; END IF;
  _actor := auth.uid();
  IF _actor IS NULL THEN _actor := '00000000-0000-0000-0000-000000000000'::uuid; END IF;
  CASE TG_OP
    WHEN 'INSERT' THEN _action := 'drift_policy.created';
    WHEN 'UPDATE' THEN _action := 'drift_policy.updated';
    WHEN 'DELETE' THEN _action := 'drift_policy.deleted';
  END CASE;
  PERFORM log_audit_event(_row.workspace_id, _action, _actor, 'drift_policy', _row.id,
    jsonb_build_object('enabled', _row.enabled, 'threshold', _row.threshold));
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_drift_policies AFTER INSERT OR UPDATE OR DELETE ON public.drift_policies
FOR EACH ROW EXECUTE FUNCTION public.audit_drift_policies_trigger();

-- Provider keys trigger
CREATE OR REPLACE FUNCTION public.audit_provider_keys_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _action text;
  _row record;
  _actor uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN _row := OLD; ELSE _row := NEW; END IF;
  _actor := COALESCE(auth.uid(), _row.created_by);
  CASE TG_OP
    WHEN 'INSERT' THEN _action := 'provider_key.created';
    WHEN 'UPDATE' THEN _action := 'provider_key.updated';
    WHEN 'DELETE' THEN _action := 'provider_key.deleted';
  END CASE;
  PERFORM log_audit_event(_row.workspace_id, _action, _actor, 'provider_key', _row.id,
    jsonb_build_object('display_name', _row.display_name, 'provider', _row.provider));
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_provider_keys AFTER INSERT OR UPDATE OR DELETE ON public.provider_keys
FOR EACH ROW EXECUTE FUNCTION public.audit_provider_keys_trigger();
