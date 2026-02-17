import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface MenuPermissions {
  [menuKey: string]: boolean;
}

/**
 * Maps app_role values to the corresponding column in role_menu_permissions.
 * Club owners are treated as admin.
 */
const ROLE_TO_COLUMN: Record<string, string> = {
  admin: "staff_admin_visible",
  coach: "staff_coach_visible",
  prepa_physique: "staff_prepa_visible",
  doctor: "staff_doctor_visible",
  administratif: "staff_administratif_visible",
  // Legacy roles map to closest match
  physio: "staff_doctor_visible",
  mental_coach: "staff_coach_visible",
  viewer: "player_visible",
};

/**
 * Hook that returns which menus are visible for the current user
 * based on the role_menu_permissions matrix and the user's role.
 * 
 * Club owners and super admins see everything.
 */
export function useMenuPermissions(clubId?: string, categoryId?: string) {
  const { user } = useAuth();

  // Determine the user's effective role
  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ["user-effective-role", clubId, categoryId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Check if super admin
      const { data: superAdmin } = await supabase
        .from("super_admin_users")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (superAdmin) return "super_admin";

      // Check if club owner
      if (clubId) {
        const { data: club } = await supabase
          .from("clubs")
          .select("user_id")
          .eq("id", clubId)
          .single();
        if (club?.user_id === user.id) return "owner";
      }

      // Check club member role
      if (clubId) {
        const { data: clubMember } = await supabase
          .from("club_members")
          .select("role")
          .eq("club_id", clubId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (clubMember?.role) return clubMember.role;
      }

      // Check category member role
      if (categoryId) {
        const { data: categoryMember } = await supabase
          .from("category_members")
          .select("role")
          .eq("category_id", categoryId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (categoryMember?.role) return categoryMember.role;
      }

      return null;
    },
    enabled: !!user && !!(clubId || categoryId),
  });

  // Fetch the permissions matrix
  const { data: permissionsMatrix, isLoading: matrixLoading } = useQuery({
    queryKey: ["role-menu-permissions-matrix"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_menu_permissions")
        .select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache 5 min
  });

  const isLoading = roleLoading || matrixLoading;

  // Build the visibility map
  const menuPermissions: MenuPermissions = {};
  const isFullAccess = userRole === "super_admin" || userRole === "owner" || userRole === "admin";

  if (permissionsMatrix) {
    const column = userRole ? ROLE_TO_COLUMN[userRole] : null;

    for (const row of permissionsMatrix) {
      if (isFullAccess) {
        menuPermissions[row.menu_key] = true;
      } else if (column && column in row) {
        menuPermissions[row.menu_key] = (row as any)[column] === true;
      } else {
        menuPermissions[row.menu_key] = false;
      }
    }
  }

  const canSeeMenu = (menuKey: string): boolean => {
    if (isLoading) return true; // Show all while loading to avoid flash
    if (isFullAccess) return true;
    return menuPermissions[menuKey] ?? false;
  };

  return {
    canSeeMenu,
    userRole,
    isFullAccess,
    isLoading,
    menuPermissions,
  };
}
