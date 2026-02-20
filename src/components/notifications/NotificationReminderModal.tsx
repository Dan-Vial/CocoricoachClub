import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { initOneSignal, oneSignalLogin, buildUserTags, requestOneSignalPermission } from "@/lib/onesignal";

const ONBOARDING_KEY = "notification_onboarding_done";
const LAST_SHOWN_KEY = "notification_reminder_last_shown";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function NotificationReminderModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isHandling, setIsHandling] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Only show if the user has already completed onboarding (not first time)
    const onboardingDone = localStorage.getItem(`${ONBOARDING_KEY}_${user.id}`);
    if (!onboardingDone) return;

    // Don't show if already granted or denied
    const perm = Notification.permission;
    if (perm === "granted" || perm === "denied") return;

    // Check if we already showed it today
    const lastShown = localStorage.getItem(`${LAST_SHOWN_KEY}_${user.id}`);
    if (lastShown) {
      const lastShownTime = parseInt(lastShown, 10);
      if (Date.now() - lastShownTime < ONE_DAY_MS) return;
    }

    // Show after a short delay
    const t = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(t);
  }, [user]);

  const markShownToday = () => {
    if (user) {
      localStorage.setItem(`${LAST_SHOWN_KEY}_${user.id}`, Date.now().toString());
    }
  };

  const handleActivate = async () => {
    if (!user || isHandling) return;
    setIsHandling(true);

    try {
      // Init OneSignal and request permission in parallel with nothing blocking
      // initOneSignal is a no-op if already done, so it's fast
      initOneSignal(); // fire and forget — just sets a flag

      const granted = await requestOneSignalPermission();
      if (granted) {
        // Build tags and login in parallel
        const tags = await buildUserTags(user.id);
        oneSignalLogin(user.id, user.email || "", tags); // fire and forget
        localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, "done");
      } else {
        markShownToday();
      }
    } catch (err) {
      console.error("[NotificationReminderModal] Error:", err);
      markShownToday();
    } finally {
      setIsHandling(false);
      setOpen(false);
    }
  };

  const handleLater = () => {
    markShownToday();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleLater(); }}>
      <DialogContent className="sm:max-w-sm text-center p-8 gap-0" onInteractOutside={(e) => e.preventDefault()}>
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-10 h-10 text-primary" />
          </div>
        </div>

        <h2 className="text-xl font-bold mb-2">Active les notifications</h2>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Ne rate aucune info importante (entraînements, matchs, rappels)
        </p>

        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={handleActivate}
            disabled={isHandling}
          >
            <Bell className="mr-2 h-4 w-4" />
            {isHandling ? "Activation..." : "Activer maintenant"}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={handleLater}
          >
            Plus tard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
