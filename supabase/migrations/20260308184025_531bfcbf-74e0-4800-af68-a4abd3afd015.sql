
-- Collections table
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Collection items (ordered prompts in a collection)
CREATE TABLE public.collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(collection_id, prompt_id)
);

-- Indexes
CREATE INDEX idx_collections_user_id ON public.collections(user_id);
CREATE INDEX idx_collections_visibility ON public.collections(visibility);
CREATE INDEX idx_collection_items_collection_id ON public.collection_items(collection_id);
CREATE INDEX idx_collection_items_prompt_id ON public.collection_items(prompt_id);

-- Updated_at trigger
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS for collections
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public collections"
  ON public.collections FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Users can view own collections"
  ON public.collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collections"
  ON public.collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON public.collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON public.collections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS for collection_items
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view items in public collections"
  ON public.collection_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_items.collection_id
    AND (c.visibility = 'public' OR c.user_id = auth.uid())
  ));

CREATE POLICY "Owners can insert items"
  ON public.collection_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_items.collection_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Owners can update items"
  ON public.collection_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_items.collection_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Owners can delete items"
  ON public.collection_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_items.collection_id AND c.user_id = auth.uid()
  ));
