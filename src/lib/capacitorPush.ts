import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

export const isNativePlatform = () => Capacitor.isNativePlatform();
export const isIOS = () => Capacitor.getPlatform() === "ios";
export const isAndroid = () => Capacitor.getPlatform() === "android";
export const getPlatform = () => Capacitor.getPlatform();

export async function requestNativePushPermission(): Promise<boolean> {
  try {
    console.log("[CapacitorPush] Requesting permissions...");
    const result = await PushNotifications.requestPermissions();
    console.log("[CapacitorPush] Permission result:", JSON.stringify(result));
    return result.receive === "granted";
  } catch (err) {
    console.error("[CapacitorPush] requestPermissions error:", err);
    return false;
  }
}

export async function registerNativePush(): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Push registration timed out after 15s"));
    }, 15000);

    PushNotifications.addListener("registration", (token) => {
      clearTimeout(timeout);
      console.log("[CapacitorPush] Registration success, token:", token.value?.substring(0, 20) + "...");
      resolve(token.value);
    });

    PushNotifications.addListener("registrationError", (error) => {
      clearTimeout(timeout);
      console.error("[CapacitorPush] Registration error:", JSON.stringify(error));
      reject(new Error(error.error));
    });

    console.log("[CapacitorPush] Calling PushNotifications.register()...");
    PushNotifications.register();
  });
}

export function onNativePushReceived(
  callback: (notification: { title?: string; body?: string; data?: Record<string, unknown> }) => void
) {
  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.log("[CapacitorPush] Push received:", JSON.stringify(notification));
    callback({
      title: notification.title ?? undefined,
      body: notification.body ?? undefined,
      data: notification.data,
    });
  });
}

export function onNativePushActionPerformed(
  callback: (data: Record<string, unknown>) => void
) {
  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    console.log("[CapacitorPush] Push action performed:", JSON.stringify(action));
    callback(action.notification.data);
  });
}

export async function clearPushBadge(): Promise<void> {
  try {
    await PushNotifications.removeAllDeliveredNotifications();
    console.log("[CapacitorPush] Badge cleared & delivered notifications removed");
  } catch (err) {
    console.error("[CapacitorPush] clearPushBadge error:", err);
  }
}
