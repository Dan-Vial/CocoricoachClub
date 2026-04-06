
CREATE TABLE public.custom_athletic_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Profil personnalisé',
  description TEXT,
  tests JSONB NOT NULL DEFAULT '[]'::jsonb,
  profile_types JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id)
);

ALTER TABLE public.custom_athletic_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view custom profiles for their categories"
ON public.custom_athletic_profiles FOR SELECT TO authenticated
USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Staff can manage custom profiles"
ON public.custom_athletic_profiles FOR ALL TO authenticated
USING (public.can_access_category(auth.uid(), category_id))
WITH CHECK (public.can_access_category(auth.uid(), category_id));

CREATE TRIGGER update_custom_athletic_profiles_updated_at
  BEFORE UPDATE ON public.custom_athletic_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
