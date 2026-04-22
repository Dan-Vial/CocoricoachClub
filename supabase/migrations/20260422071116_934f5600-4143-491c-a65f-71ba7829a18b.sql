-- Reset all planning quick-assign categories so they re-seed with new defaults
-- (sport name + Préparation Physique + Préparation Mentale + Compétitions)
-- This also removes orphan cycles since periodization_cycles cascade on category delete
DELETE FROM public.periodization_categories;