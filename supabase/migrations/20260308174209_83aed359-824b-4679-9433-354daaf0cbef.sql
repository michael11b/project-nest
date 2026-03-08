-- Allow anyone to read versions of public prompts (needed for Explore detail + fork)
CREATE POLICY "Anyone can view versions of public prompts"
ON public.prompt_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.prompts p
    WHERE p.id = prompt_versions.prompt_id
      AND p.visibility = 'public'::visibility
  )
);