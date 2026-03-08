
-- Allow anyone to view profiles of users who have public prompts
CREATE POLICY "Anyone can view public profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.prompts
    WHERE prompts.created_by = profiles.user_id
      AND prompts.visibility = 'public'
  )
);
