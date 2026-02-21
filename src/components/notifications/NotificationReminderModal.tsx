import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { initOneSignal, oneSignalLogin, buildUserTags, requestOneSignalPermission } from "@/lib/onesignal";

const ONBOARDING_KEY = "notification_onboarding_done";
const PERMISSION_GRANTED_KEY = "notification_permission_granted";
const LAST_SHOWN_KEY = "notification_reminder_last_shown";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function NotificationReminderModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isHandling, setIsHandling] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!("Notification" in window)) return;

    const perm = window.Notification.permission;
    const permGrantedFlag = localStorage.getItem(`${PERMISSION_GRANTED_KEY}_${user.id}`) === "true";

    // If already granted (browser OR our flag) → silently re-sync tags
    if (perm === "granted" || permGrantedFlag) {
      // Record it in our flag too
      if (perm === "granted") {
        try { localStorage.setItem(`${PERMISSION_GRANTED_KEY}_${user.id}`, "true"); } catch {}
      }
      (async () => {
        try {
          await initOneSignal();
          const tags = await buildUserTags(user.id);
          await oneSignalLogin(user.id, user.email || "", tags);
          console.log("[NotificationReminderModal] Re-synced existing user to OneSignal");
        } catch (err) {
          console.error("[NotificationReminderModal] Re-sync error:", err);
        }
      })();
      return;
    }

    // If denied by the browser — nothing we can do programmatically
    if (perm === "denied") return;

    // Permission still "default" — check if we should show the reminder
    const lastShown = localStorage.getItem(`${LAST_SHOWN_KEY}_${user.id}`);
    if (lastShown) {
      const lastShownTime = parseInt(lastShown, 10);
      if (Date.now() - lastShownTime < ONE_DAY_MS) return;
    }

    // If onboarding fullscreen popup hasn't been shown yet, let it handle it
    const onboardingDone = localStorage.getItem(`${ONBOARDING_KEY}_${user.id}`);
    if (!onboardingDone && !lastShown) return;

    // Show after a short delay
    const t = setTimeout(() => setOpen(true), 2000);
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
      await initOneSignal();
      const granted = await requestOneSignalPermission();
      if (granted) {
        localStorage.setItem(`${PERMISSION_GRANTED_KEY}_${user.id}`, "true");
        const tags = await buildUserTags(user.id);
        await oneSignalLogin(user.id, user.email || "", tags);
        localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, "done");
        console.log("[NotificationReminderModal] Push granted & synced");
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
        <div className="flex justify-center mb-5">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-10 h-10 text-primary" />
          </div>
        </div>

        <h2 className="text-xl font-bold mb-2">Active les notifications</h2>
        <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
          Ne rate aucune info importante (entraînements, matchs, rappels)
        </p>

        <div className="space-y-2 text-left mb-6">
          {[
            { emoji: "📣", label: "Notifications push en temps réel" },
            { emoji: "📧", label: "Alertes par email" },
            { emoji: "🏋️", label: "Rappels de séances" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={handleActivate}
            disabled={isHandling}
          >
            <Bell className="mr-2 h-4 w-4" />
            {isHandling ? "Activation..." : "Accepter les notifications"}
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
