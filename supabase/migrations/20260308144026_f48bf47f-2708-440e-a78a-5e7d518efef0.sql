
-- Tighten the workspace INSERT policy to require authentication explicitly
DROP POLICY "Authenticated users can create workspaces" ON public.workspaces;
CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
