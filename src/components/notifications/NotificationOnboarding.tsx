import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { initOneSignal, oneSignalLogin, buildUserTags, requestOneSignalPermission, getOneSignalPermission } from "@/lib/onesignal";

const STORAGE_KEY = "notification_onboarding_done";
/** Tracks that the user actively clicked "Accepter" and the browser prompt was shown */
const PERMISSION_GRANTED_KEY = "notification_permission_granted";

/**
 * Check if we've already confirmed permission was granted (survives browser quirks).
 * Some browsers (iOS Safari PWA) don't reliably persist window.Notification.permission.
 */
function wasPermissionGranted(userId: string): boolean {
  try {
    return localStorage.getItem(`${PERMISSION_GRANTED_KEY}_${userId}`) === "true";
  } catch {
    return false;
  }
}

function markPermissionGranted(userId: string) {
  try {
    localStorage.setItem(`${PERMISSION_GRANTED_KEY}_${userId}`, "true");
  } catch {}
}

/**
 * Resets the onboarding flag if push permission is genuinely still "default"
 * AND we never recorded a successful grant.
 */
export function resetOnboardingIfNeeded(userId: string) {
  try {
    // If we previously recorded that permission was granted, don't reset
    if (wasPermissionGranted(userId)) return;
    
    if (!("Notification" in window)) return;
    const perm = window.Notification.permission;
    if (perm === "default") {
      localStorage.removeItem(`${STORAGE_KEY}_${userId}`);
    }
  } catch {
    // Silently ignore
  }
}

export function NotificationOnboarding() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [isHandling, setIsHandling] = useState(false);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    if (!user) return;

    // If we've already confirmed permission was granted, never show again
    if (wasPermissionGranted(user.id)) {
      // Silently sync in background
      (async () => {
        try {
          await initOneSignal();
          const tags = await buildUserTags(user.id);
          await oneSignalLogin(user.id, user.email || "", tags);
        } catch {}
      })();
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, "done");
      return;
    }

    const perm = getOneSignalPermission();

    // If browser reports "granted" → record it, sync, and never show again
    if (perm === "granted") {
      markPermissionGranted(user.id);
      (async () => {
        try {
          await initOneSignal();
          const tags = await buildUserTags(user.id);
          await oneSignalLogin(user.id, user.email || "", tags);
          console.log("[NotificationOnboarding] Auto-synced existing user to OneSignal");
        } catch (err) {
          console.error("[NotificationOnboarding] Auto-sync error:", err);
        }
      })();
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, "done");
      return;
    }

    // If "denied" → browser blocked, don't show popup
    if (perm === "denied") return;

    // "default" → check if onboarding was previously completed
    const done = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
    if (done) return;

    // Show the popup
    const t = setTimeout(() => setShow(true), 800);
    return () => clearTimeout(t);
  }, [user]);

  const markDone = () => {
    if (user) {
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, "done");
    }
    setShow(false);
  };

  const handleActivate = async () => {
    if (!user || isHandling) return;
    setIsHandling(true);

    try {
      await initOneSignal();
      const granted = await requestOneSignalPermission();
      if (granted) {
        // Record permission in our own storage (survives browser quirks)
        markPermissionGranted(user.id);
        const tags = await buildUserTags(user.id);
        await oneSignalLogin(user.id, user.email || "", tags);
        console.log("[NotificationOnboarding] Push permission granted & synced");
      }
      markDone();
    } catch (err) {
      console.error("[NotificationOnboarding] Error:", err);
      markDone();
    } finally {
      setIsHandling(false);
    }
  };

  const handleDecline = () => {
    setDeclined(true);
    // Mark done so it doesn't re-appear on every page load
    // The ReminderModal will handle re-asking after 24h
    setTimeout(() => {
      markDone();
    }, 2500);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm mx-auto px-6 text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center ring-8 ring-primary/5">
            <Bell className="w-12 h-12 text-primary" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight">
            Active les notifications
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Reçois les convocations, entraînements et rappels importants directement sur ton appareil — même quand l'app est fermée
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-3 text-left">
          {[
            { emoji: "📣", label: "Notifications push instantanées" },
            { emoji: "📧", label: "Alertes par email" },
            { emoji: "🏋️", label: "Rappels d'entraînements" },
            { emoji: "⚕️", label: "Alertes médicales importantes" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <span className="text-xl">{item.emoji}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Declined message */}
        {declined ? (
          <div className="py-2 text-sm text-muted-foreground">
            ✓ Tu peux activer les notifications plus tard dans ton profil
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={handleActivate}
              disabled={isHandling}
            >
              <Bell className="mr-2 h-5 w-5" />
              {isHandling ? "Activation en cours..." : "Accepter les notifications"}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={handleDecline}
            >
              Pas maintenant
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
