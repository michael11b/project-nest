
-- 1. Add community columns to prompts
ALTER TABLE public.prompts
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- 2. Add bio/website to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT;

-- 3. Full-text search generated column
ALTER TABLE public.prompts
  ADD COLUMN IF NOT EXISTS fts_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
  ) STORED;

-- 4. Prompt categories
CREATE TABLE public.prompt_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.prompt_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories" ON public.prompt_categories FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage categories" ON public.prompt_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Prompt-category mappings
CREATE TABLE public.prompt_category_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.prompt_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (prompt_id, category_id)
);
ALTER TABLE public.prompt_category_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view mappings" ON public.prompt_category_mappings FOR SELECT USING (true);
CREATE POLICY "Editors can manage mappings" ON public.prompt_category_mappings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.prompts p WHERE p.id = prompt_category_mappings.prompt_id AND has_workspace_role_at_least(auth.uid(), p.workspace_id, 'editor'::workspace_role)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.prompts p WHERE p.id = prompt_category_mappings.prompt_id AND has_workspace_role_at_least(auth.uid(), p.workspace_id, 'editor'::workspace_role)));

-- 6. Prompt likes
CREATE TABLE public.prompt_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (prompt_id, user_id)
);
ALTER TABLE public.prompt_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view likes" ON public.prompt_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like" ON public.prompt_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike own" ON public.prompt_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 7. Prompt comments
CREATE TABLE public.prompt_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.prompt_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.prompt_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view comments on public prompts" ON public.prompt_comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.prompts p WHERE p.id = prompt_comments.prompt_id AND (p.visibility = 'public' OR is_workspace_member(auth.uid(), p.workspace_id))));
CREATE POLICY "Authenticated can comment" ON public.prompt_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.prompt_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.prompt_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 8. User follows
CREATE TABLE public.user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id)
);
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view follows" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "Authenticated can follow" ON public.user_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id AND follower_id != following_id);
CREATE POLICY "Users can unfollow" ON public.user_follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- 9. Indexes
CREATE INDEX IF NOT EXISTS idx_prompts_fts ON public.prompts USING gin (fts_vector);
CREATE INDEX IF NOT EXISTS idx_prompts_visibility ON public.prompts(visibility);
CREATE INDEX IF NOT EXISTS idx_prompts_featured ON public.prompts(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_prompt_likes_prompt ON public.prompt_likes(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_comments_prompt ON public.prompt_comments(prompt_id);

-- 10. Public prompts viewable by anyone
CREATE POLICY "Anyone can view public prompts" ON public.prompts FOR SELECT USING (visibility = 'public');

-- 11. Like count trigger
CREATE OR REPLACE FUNCTION public.update_prompt_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.prompts SET like_count = like_count + 1 WHERE id = NEW.prompt_id; RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.prompts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.prompt_id; RETURN OLD;
  END IF; RETURN NULL;
END; $$;
CREATE TRIGGER trg_update_like_count AFTER INSERT OR DELETE ON public.prompt_likes FOR EACH ROW EXECUTE FUNCTION public.update_prompt_like_count();

-- 12. Comment count trigger
CREATE OR REPLACE FUNCTION public.update_prompt_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.prompts SET comment_count = comment_count + 1 WHERE id = NEW.prompt_id; RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.prompts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.prompt_id; RETURN OLD;
  END IF; RETURN NULL;
END; $$;
CREATE TRIGGER trg_update_comment_count AFTER INSERT OR DELETE ON public.prompt_comments FOR EACH ROW EXECUTE FUNCTION public.update_prompt_comment_count();

-- 13. Seed categories
INSERT INTO public.prompt_categories (name, slug, description, icon, sort_order) VALUES
  ('Classification', 'classification', 'Text and data classification prompts', '🏷️', 0),
  ('Summarization', 'summarization', 'Content summarization and distillation', '📝', 1),
  ('Code Generation', 'code-generation', 'Code writing and programming assistance', '💻', 2),
  ('Creative Writing', 'creative-writing', 'Stories, poetry, and creative content', '✍️', 3),
  ('Data Extraction', 'data-extraction', 'Structured data extraction from text', '🔍', 4),
  ('Conversation', 'conversation', 'Chatbot and conversational prompts', '💬', 5),
  ('Translation', 'translation', 'Language translation prompts', '🌍', 6),
  ('Analysis', 'analysis', 'Data and text analysis', '📊', 7);

-- 14. Updated_at trigger for comments
CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON public.prompt_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
