import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AthleteAccessInfo {
  isAthleteAccess: boolean;
  token: string | null;
  playerId: string | null;
  playerName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  clubId: string | null;
  clubName: string | null;
}

interface AthleteAccessContextType extends AthleteAccessInfo {
  setAthleteAccess: (info: Partial<AthleteAccessInfo>) => void;
  clearAthleteAccess: () => void;
  validateToken: (token: string) => Promise<boolean>;
}

const defaultState: AthleteAccessInfo = {
  isAthleteAccess: false,
  token: null,
  playerId: null,
  playerName: null,
  categoryId: null,
  categoryName: null,
  clubId: null,
  clubName: null,
};

const AthleteAccessContext = createContext<AthleteAccessContextType | undefined>(undefined);

export function AthleteAccessProvider({ children }: { children: ReactNode }) {
  const [accessInfo, setAccessInfo] = useState<AthleteAccessInfo>(() => {
    const stored = sessionStorage.getItem("athleteAccess");
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
    if (accessInfo.isAthleteAccess) {
      sessionStorage.setItem("athleteAccess", JSON.stringify(accessInfo));
    } else {
      sessionStorage.removeItem("athleteAccess");
    }
  }, [accessInfo]);

  const setAthleteAccess = (info: Partial<AthleteAccessInfo>) => {
    setAccessInfo((prev) => ({ ...prev, ...info }));
  };

  const clearAthleteAccess = () => {
    sessionStorage.removeItem("athleteAccess");
    setAccessInfo(defaultState);
  };

  const validateToken = async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc("validate_athlete_token", {
        _token: token,
      });

      if (error) throw error;

      const result = data as {
        success: boolean;
        error?: string;
        player_id?: string;
        player_name?: string;
        category_id?: string;
        category_name?: string;
        club_id?: string;
        club_name?: string;
      };

      if (result.success) {
        setAccessInfo({
          isAthleteAccess: true,
          token,
          playerId: result.player_id || null,
          playerName: result.player_name || null,
          categoryId: result.category_id || null,
          categoryName: result.category_name || null,
          clubId: result.club_id || null,
          clubName: result.club_name || null,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error validating athlete token:", error);
      return false;
    }
  };

  return (
    <AthleteAccessContext.Provider
      value={{
        ...accessInfo,
        setAthleteAccess,
        clearAthleteAccess,
        validateToken,
      }}
    >
      {children}
    </AthleteAccessContext.Provider>
  );
}

export function useAthleteAccess() {
  const context = useContext(AthleteAccessContext);
  if (context === undefined) {
    throw new Error("useAthleteAccess must be used within a AthleteAccessProvider");
  }
  return context;
}
