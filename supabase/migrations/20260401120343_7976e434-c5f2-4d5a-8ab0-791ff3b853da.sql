
ALTER TABLE public.protocol_phases 
ADD COLUMN linked_program_id UUID REFERENCES public.training_programs(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.protocol_phases.linked_program_id IS 'Links a protocol phase to a structured training program (Blocks → Weeks → Sessions)';
