import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getSafeNotificationRoute } from "@/lib/native-notification-route";

/**
 * Native Android push registration.
 * Web and SSR are intentionally no-ops; tokens are always associated with the
 * currently authenticated Supabase user, never with an anonymous session.
 */
export function NativePushNotifications() {
  const { user, ready } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  useEffect(() => {
    if (!ready || !userId || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
      return;
    }

    let disposed = false;
    let registrationRequested = false;
    let registrationInFlight = false;
    const listenerHandles: Array<{ remove: () => Promise<void> }> = [];

    void import("@capacitor/push-notifications")
      .then(async ({ PushNotifications }) => {
        if (disposed) return;

        const refreshNotifications = () => {
          void Promise.all([
            queryClient.invalidateQueries({ queryKey: ["notifications"] }),
            queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] }),
          ]);
        };

        listenerHandles.push(
          await PushNotifications.addListener("registration", async ({ value }) => {
            if (disposed || !value) return;
            const { error } = await supabase.rpc("register_my_push_device", {
              _token: value,
              _platform: "android",
            });
            if (error) {
              console.error("[push] Device token registration failed", error);
            }
          }),
        );

        listenerHandles.push(
          await PushNotifications.addListener("registrationError", (error) => {
            registrationRequested = false;
            console.error("[push] Firebase registration failed", error);
          }),
        );

        listenerHandles.push(
          await PushNotifications.addListener("pushNotificationReceived", refreshNotifications),
        );

        listenerHandles.push(
          await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
            refreshNotifications();
            const route = getSafeNotificationRoute(
              event.notification.data?.["route"],
              window.location.origin,
            );
            if (route) window.location.assign(route);
          }),
        );

        const ensureRegistration = async (allowPrompt: boolean) => {
          if (disposed || registrationRequested || registrationInFlight) return;
          registrationInFlight = true;
          try {
            const permission = await PushNotifications.checkPermissions();
            let receivePermission = permission.receive;

            if (
              receivePermission !== "granted" &&
              allowPrompt &&
              (receivePermission === "prompt" || receivePermission === "prompt-with-rationale")
            ) {
              const requested = await PushNotifications.requestPermissions();
              receivePermission = requested.receive;
            }

            // A user who denied notifications can enable them in Android
            // Settings. The app-resume listener below rechecks this state
            // without showing an unsolicited prompt.
            if (receivePermission !== "granted" || disposed) return;

            await PushNotifications.createChannel({
              id: "arownd_updates_v2",
              name: "تحديثات Arownd",
              description: "إشعارات الطلبات والرسائل وتحديثات الحساب من Arownd",
              importance: 4,
              vibration: true,
              sound: "arownd_notification",
            }).catch((error: unknown) => {
              console.warn("[push] Could not create Android notification channel", error);
            });

            if (!disposed) {
              await PushNotifications.register();
              registrationRequested = true;
            }
          } catch (error) {
            registrationRequested = false;
            console.error("[push] Native push setup failed", error);
          } finally {
            registrationInFlight = false;
          }
        };

        const { App } = await import("@capacitor/app");
        if (disposed) return;
        listenerHandles.push(
          await App.addListener("appStateChange", ({ isActive }) => {
            if (isActive) void ensureRegistration(false);
          }),
        );

        await ensureRegistration(true);
      })
      .catch((error: unknown) => {
        console.error("[push] Native push setup failed", error);
      });

    return () => {
      disposed = true;
      for (const handle of listenerHandles) void handle.remove();
    };
  }, [ready, userId, queryClient]);

  return null;
}
