import { createContext, useContext, ReactNode } from "react";
import { usePublicAccess } from "@/contexts/PublicAccessContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ViewerModeContextType {
  isViewer: boolean;
  isLoading: boolean;
}

const ViewerModeContext = createContext<ViewerModeContextType>({
  isViewer: false,
  isLoading: true,
});

interface ViewerModeProviderProps {
  children: ReactNode;
  clubId?: string;
  categoryId?: string;
}

export function ViewerModeProvider({ children, clubId, categoryId }: ViewerModeProviderProps) {
  const { isPublicAccess } = usePublicAccess();
  const { user } = useAuth();

  // Check if user has viewer role for the club
  const { data: clubMemberRole, isLoading: clubLoading } = useQuery({
    queryKey: ["user-club-role-viewer", clubId, user?.id],
    queryFn: async () => {
      if (!user || !clubId) return null;
      
      const { data, error } = await supabase
        .from("club_members")
        .select("role")
        .eq("club_id", clubId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) return null;
      return data?.role || null;
    },
    enabled: !!user && !!clubId && !isPublicAccess,
    staleTime: 0, // Always refetch to get latest role
  });

  // Check if user has viewer role for the category
  const { data: categoryMemberRole, isLoading: categoryLoading } = useQuery({
    queryKey: ["user-category-role-viewer", categoryId, user?.id],
    queryFn: async () => {
      if (!user || !categoryId) return null;
      
      const { data, error } = await supabase
        .from("category_members")
        .select("role")
        .eq("category_id", categoryId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) return null;
      return data?.role || null;
    },
    enabled: !!user && !!categoryId && !isPublicAccess,
    staleTime: 0, // Always refetch to get latest role
  });

  const isLoading = clubLoading || categoryLoading;

  // User is in viewer mode if:
  // 1. They're accessing via public token (always read-only)
  // 2. They have "viewer" role on the club
  // 3. They have "viewer" role on the category
  const isViewer = 
    isPublicAccess || 
    clubMemberRole === "viewer" || 
    categoryMemberRole === "viewer";

  return (
    <ViewerModeContext.Provider value={{ isViewer, isLoading }}>
      {children}
    </ViewerModeContext.Provider>
  );
}

export function useViewerModeContext() {
  return useContext(ViewerModeContext);
}
