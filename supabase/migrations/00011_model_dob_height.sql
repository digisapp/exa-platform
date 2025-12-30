-- Add Date of Birth and Height to model applications and models

-- Add to model_applications table
ALTER TABLE public.model_applications ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.model_applications ADD COLUMN IF NOT EXISTS height TEXT;
ALTER TABLE public.model_applications ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add to models table
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS height TEXT;
