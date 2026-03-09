
-- Track prompt views per user
CREATE TABLE public.prompt_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prompt_id uuid NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, prompt_id)
);

ALTER TABLE public.prompt_views ENABLE ROW LEVEL SECURITY;

-- Users can view their own view history
CREATE POLICY "Users can view own views" ON public.prompt_views
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can upsert their own views
CREATE POLICY "Users can insert own views" ON public.prompt_views
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own views" ON public.prompt_views
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
