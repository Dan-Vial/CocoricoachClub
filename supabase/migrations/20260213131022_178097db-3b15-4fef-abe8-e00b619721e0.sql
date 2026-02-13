
-- Table to store PDF customization preferences per category
CREATE TABLE public.pdf_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL UNIQUE REFERENCES public.categories(id) ON DELETE CASCADE,
  logo_url TEXT,
  club_name_override TEXT,
  header_color TEXT DEFAULT '#224378',
  accent_color TEXT DEFAULT '#3B82F6',
  show_logo BOOLEAN DEFAULT true,
  show_club_name BOOLEAN DEFAULT true,
  show_category_name BOOLEAN DEFAULT true,
  show_date BOOLEAN DEFAULT true,
  footer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pdf_settings ENABLE ROW LEVEL SECURITY;

-- Policies: users who can access the category can read/write
CREATE POLICY "Users can view PDF settings for their categories"
ON public.pdf_settings FOR SELECT
USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can insert PDF settings for their categories"
ON public.pdf_settings FOR INSERT
WITH CHECK (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can update PDF settings for their categories"
ON public.pdf_settings FOR UPDATE
USING (public.can_access_category(auth.uid(), category_id));

-- Trigger for updated_at
CREATE TRIGGER update_pdf_settings_updated_at
BEFORE UPDATE ON public.pdf_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
