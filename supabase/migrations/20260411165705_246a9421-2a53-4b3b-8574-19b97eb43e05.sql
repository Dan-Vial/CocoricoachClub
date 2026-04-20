ALTER TABLE public.precision_training 
ADD COLUMN IF NOT EXISTS zone_x numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS zone_y numeric DEFAULT NULL;