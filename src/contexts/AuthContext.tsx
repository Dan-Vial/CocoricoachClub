import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { initOneSignal, oneSignalLogin, oneSignalLogout, buildUserTags } from "@/lib/onesignal";
import { resetOnboardingIfNeeded } from "@/components/notifications/NotificationOnboarding";

const OFFLINE_SESSION_KEY = "rugby-offline-session";
const OFFLINE_USER_KEY = "rugby-offline-user";

// Save session to localStorage for offline access
function saveOfflineSession(session: Session | null, user: User | null) {
  try {
    if (session && user) {
      localStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        token_type: session.token_type,
      }));
      localStorage.setItem(OFFLINE_USER_KEY, JSON.stringify({
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
      }));
    } else {
      localStorage.removeItem(OFFLINE_SESSION_KEY);
      localStorage.removeItem(OFFLINE_USER_KEY);
    }
  } catch (error) {
    console.error("Error saving offline session:", error);
  }
}

// Load session from localStorage when offline
function loadOfflineSession(): { user: User | null; isOfflineSession: boolean } {
  try {
    const userStr = localStorage.getItem(OFFLINE_USER_KEY);
    if (userStr) {
      const user = JSON.parse(userStr) as User;
      return { user, isOfflineSession: true };
    }
  } catch (error) {
    console.error("Error loading offline session:", error);
  }
  return { user: null, isOfflineSession: false };
}

// Handle OneSignal user sync (non-blocking, fully silent)
// Works for ALL roles: joueur, admin, coach, staff, etc.
async function syncOneSignalUser(user: User) {
  try {
    await initOneSignal();
    const tags = await buildUserTags(user.id);
    // Always call login — it's idempotent and works for every role.
    // For new users it creates the OneSignal profile; for existing users it refreshes tags.
    await oneSignalLogin(user.id, user.email || "", tags);
  } catch {
    // Silently ignore — OneSignal failures must never affect the app
  }
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isOfflineSession: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOfflineSession, setIsOfflineSession] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let initialSessionRestored = false;

    // Initialize OneSignal SDK early — fully silent, never crash the app
    try {
      initOneSignal().catch(() => {});
    } catch {
      // OneSignal may throw synchronously on unsupported origins/browsers
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsOfflineSession(false);

        // Only set loading=false from listener AFTER initial session is restored
        // to avoid premature "no user" state that causes redirect loops
        if (initialSessionRestored) {
          setLoading(false);
        }
        
        // Save session for offline use
        saveOfflineSession(session, session?.user ?? null);

        // Sync OneSignal on login (non-blocking, deferred)
        if (session?.user) {
          resetOnboardingIfNeeded(session.user.id);
          setTimeout(() => syncOneSignalUser(session.user), 1000);
        }
      }
    );

    // Restore session from storage
    supabase.auth.getSession().then(({ data: { session } }) => {
      initialSessionRestored = true;
      if (session) {
        setSession(session);
        setUser(session.user);
        setIsOfflineSession(false);
        saveOfflineSession(session, session.user);
        resetOnboardingIfNeeded(session.user.id);
        setTimeout(() => syncOneSignalUser(session.user), 1000);
      } else if (!navigator.onLine) {
        const { user: offlineUser } = loadOfflineSession();
        if (offlineUser) {
          setUser(offlineUser);
          setIsOfflineSession(true);
        }
      }
      setLoading(false);
    }).catch((error) => {
      console.error("Error getting session:", error);
      initialSessionRestored = true;
      if (!navigator.onLine) {
        const { user: offlineUser } = loadOfflineSession();
        if (offlineUser) {
          setUser(offlineUser);
          setIsOfflineSession(true);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Logout from OneSignal first (non-blocking)
      oneSignalLogout().catch(() => {});
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
    saveOfflineSession(null, null);
    setUser(null);
    setSession(null);
    setIsOfflineSession(false);
    navigate("/auth");
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isOfflineSession, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
