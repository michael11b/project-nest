
-- Allow authenticated users to insert workspaces (for Create Workspace flow)
CREATE POLICY "Authenticated users can create workspaces"
ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (true);
