-- Create table for menu visibility permissions per role
CREATE TABLE public.role_menu_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_key TEXT NOT NULL,
  menu_label TEXT NOT NULL,
  player_visible BOOLEAN NOT NULL DEFAULT false,
  staff_admin_visible BOOLEAN NOT NULL DEFAULT true,
  staff_coach_visible BOOLEAN NOT NULL DEFAULT true,
  staff_prepa_visible BOOLEAN NOT NULL DEFAULT true,
  staff_doctor_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(menu_key)
);

-- Enable RLS
ALTER TABLE public.role_menu_permissions ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage permissions
CREATE POLICY "Super admins can manage role permissions"
ON public.role_menu_permissions
FOR ALL
USING (public.is_super_admin(auth.uid()));

-- All authenticated users can read permissions
CREATE POLICY "Authenticated users can read permissions"
ON public.role_menu_permissions
FOR SELECT
TO authenticated
USING (true);

-- Insert default menu permissions
INSERT INTO public.role_menu_permissions (menu_key, menu_label, player_visible, staff_admin_visible, staff_coach_visible, staff_prepa_visible, staff_doctor_visible) VALUES
('decision_center', 'Centre de décision', false, true, true, false, false),
('effectif', 'Effectif', false, true, true, true, true),
('academique', 'Suivi Académique', false, true, true, false, false),
('administratif', 'Administratif', false, true, false, false, false),
('planification', 'Planification', true, true, true, true, false),
('competition', 'Compétition', true, true, true, false, false),
('programmation', 'Programmation', false, true, true, true, false),
('performance', 'Performance', true, true, true, true, true),
('sante', 'Santé', true, true, true, true, true),
('parametres', 'Paramètres', false, true, false, false, false);

-- Trigger for updated_at
CREATE TRIGGER update_role_menu_permissions_updated_at
BEFORE UPDATE ON public.role_menu_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();