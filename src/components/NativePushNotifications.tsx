import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

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
    const listenerHandles: Array<{ remove: () => Promise<void> }> = [];

    void import("@capacitor/push-notifications")
      .then(async ({ PushNotifications }) => {
        if (disposed) return;

        const permission = await PushNotifications.checkPermissions();
        const permissionResult =
          permission.receive === "granted"
            ? permission
            : await PushNotifications.requestPermissions();

        if (permissionResult.receive !== "granted" || disposed) return;

        // The server sends this channel ID in FCM messages.
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

        listenerHandles.push(
          await PushNotifications.addListener("registration", async ({ value }) => {
            if (disposed || !value) return;
            const { error } = await supabase.rpc("register_my_push_device", {
              _token: value,
              _platform: "android",
            });
            if (error) {
              console.error("[push] Device token registration failed", error);
              return;
            }
            try {
              window.localStorage.setItem("arownd-push-token", value);
            } catch {
              // Registration remains valid in Supabase even if browser storage is unavailable.
            }
          }),
        );

        listenerHandles.push(
          await PushNotifications.addListener("registrationError", (error) => {
            console.error("[push] Firebase registration failed", error);
          }),
        );

        listenerHandles.push(
          await PushNotifications.addListener("pushNotificationReceived", () => {
            void Promise.all([
              queryClient.invalidateQueries({ queryKey: ["notifications"] }),
              queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] }),
            ]);
          }),
        );

        listenerHandles.push(
          await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
            void queryClient.invalidateQueries({ queryKey: ["notifications"] });
            const route = event.notification.data?.["route"];
            if (typeof route === "string" && route.startsWith("/") && !route.startsWith("//")) {
              window.location.assign(route);
            }
          }),
        );

        if (!disposed) await PushNotifications.register();
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
