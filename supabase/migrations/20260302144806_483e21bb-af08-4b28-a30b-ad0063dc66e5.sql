
-- Allow owners to delete workspaces
CREATE POLICY "Owners can delete workspace"
ON public.workspaces
FOR DELETE
TO authenticated
USING (has_workspace_role(auth.uid(), id, 'owner'));

-- Allow workspace co-members to see each other's profiles (needed for members list)
CREATE POLICY "Co-members can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workspace_members wm1
    JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid()
      AND wm2.user_id = profiles.user_id
  )
);
