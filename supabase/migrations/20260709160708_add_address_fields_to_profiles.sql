ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text;