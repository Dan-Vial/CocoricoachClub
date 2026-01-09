import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PublicAccessInfo {
  isPublicAccess: boolean;
  token: string | null;
  accessType: "club" | "category" | null;
  clubId: string | null;
  clubName: string | null;
  categoryId: string | null;
  categoryName: string | null;
}

interface PublicAccessContextType extends PublicAccessInfo {
  setPublicAccess: (info: Partial<PublicAccessInfo>) => void;
  clearPublicAccess: () => void;
  validateToken: (token: string) => Promise<boolean>;
}

const defaultState: PublicAccessInfo = {
  isPublicAccess: false,
  token: null,
  accessType: null,
  clubId: null,
  clubName: null,
  categoryId: null,
  categoryName: null,
};

const PublicAccessContext = createContext<PublicAccessContextType | undefined>(undefined);

export function PublicAccessProvider({ children }: { children: ReactNode }) {
  const [accessInfo, setAccessInfo] = useState<PublicAccessInfo>(() => {
    // Check sessionStorage for existing public access
    const stored = sessionStorage.getItem("publicAccess");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return defaultState;
      }
    }
    return defaultState;
  });

  useEffect(() => {
    if (accessInfo.isPublicAccess) {
      sessionStorage.setItem("publicAccess", JSON.stringify(accessInfo));
    } else {
      sessionStorage.removeItem("publicAccess");
    }
  }, [accessInfo]);

  const setPublicAccess = (info: Partial<PublicAccessInfo>) => {
    setAccessInfo((prev) => ({ ...prev, ...info }));
  };

  const clearPublicAccess = () => {
    sessionStorage.removeItem("publicAccess");
    setAccessInfo(defaultState);
  };

  const validateToken = async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc("validate_public_token", {
        _token: token,
      });

      if (error) throw error;

      const result = data as {
        success: boolean;
        error?: string;
        type?: "club" | "category";
        club_id?: string;
        club_name?: string;
        category_id?: string;
        category_name?: string;
        access_type?: string;
      };

      if (result.success) {
        setAccessInfo({
          isPublicAccess: true,
          token,
          accessType: result.type || null,
          clubId: result.club_id || null,
          clubName: result.club_name || null,
          categoryId: result.category_id || null,
          categoryName: result.category_name || null,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error validating public token:", error);
      return false;
    }
  };

  return (
    <PublicAccessContext.Provider
      value={{
        ...accessInfo,
        setPublicAccess,
        clearPublicAccess,
        validateToken,
      }}
    >
      {children}
    </PublicAccessContext.Provider>
  );
}

export function usePublicAccess() {
  const context = useContext(PublicAccessContext);
  if (context === undefined) {
    throw new Error("usePublicAccess must be used within a PublicAccessProvider");
  }
  return context;
}
