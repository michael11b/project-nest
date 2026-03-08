
-- Fix: restrict category management to admins by dropping the permissive policy
DROP POLICY "Authenticated can manage categories" ON public.prompt_categories;

-- Separate policies for insert/update/delete with proper checks
CREATE POLICY "Admins can insert categories" ON public.prompt_categories FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin')));

CREATE POLICY "Admins can update categories" ON public.prompt_categories FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin')));

CREATE POLICY "Admins can delete categories" ON public.prompt_categories FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin')));
