import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";

const HEARTBEAT_INTERVAL = 60_000; // 60 seconds

export function useActivityTracker() {
  const { user } = useAuth();
  const location = useLocation();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    if (!user?.id) return;

    const isAthletePath = location.pathname.startsWith("/athlete-space") || 
                          location.pathname.startsWith("/athlete-portal");

    const userType = isAthletePath ? "athlete" : "staff";

    const sendHeartbeat = async () => {
      if (!isVisibleRef.current) return;

      const today = new Date().toISOString().split("T")[0];

      try {
        // Try to update existing record first
        const { data: existing } = await supabase
          .from("user_activity_tracking")
          .select("id, duration_seconds")
          .eq("user_id", user.id)
          .eq("activity_date", today)
          .eq("user_type", userType)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("user_activity_tracking")
            .update({
              duration_seconds: existing.duration_seconds + 60,
              last_heartbeat: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("user_activity_tracking")
            .insert({
              user_id: user.id,
              activity_date: today,
              duration_seconds: 60,
              user_type: userType,
              last_heartbeat: new Date().toISOString(),
            });
        }
      } catch (e) {
        // Silent fail - don't disrupt user experience
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Visibility change handler
    const handleVisibility = () => {
      isVisibleRef.current = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user?.id, location.pathname]);
}
