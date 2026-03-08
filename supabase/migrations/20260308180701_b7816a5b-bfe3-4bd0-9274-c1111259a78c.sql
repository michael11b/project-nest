-- Add foreign key constraint from prompts.created_by to profiles.user_id
ALTER TABLE public.prompts
ADD CONSTRAINT prompts_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Update RLS policy to allow reading profiles for public prompt authors
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);