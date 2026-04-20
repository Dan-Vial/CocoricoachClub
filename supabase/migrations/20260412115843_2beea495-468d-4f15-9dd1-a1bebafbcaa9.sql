ALTER TABLE public.precision_training 
  ADD COLUMN kick_origin_x numeric DEFAULT NULL,
  ADD COLUMN kick_origin_y numeric DEFAULT NULL;