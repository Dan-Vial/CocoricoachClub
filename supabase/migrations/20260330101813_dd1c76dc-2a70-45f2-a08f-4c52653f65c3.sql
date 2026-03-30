
ALTER TABLE public.protocol_phases 
ADD COLUMN care_instructions text[] DEFAULT '{}',
ADD COLUMN taping_instructions text[] DEFAULT '{}';
