import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

export const isNativePlatform = () => Capacitor.isNativePlatform();
export const isIOS = () => Capacitor.getPlatform() === "ios";
export const isAndroid = () => Capacitor.getPlatform() === "android";

export async function requestNativePushPermission(): Promise<boolean> {
  const result = await PushNotifications.requestPermissions();
  return result.receive === "granted";
}

export async function registerNativePush(): Promise<string> {
  return new Promise((resolve, reject) => {
    PushNotifications.addListener("registration", (token) => {
      resolve(token.value);
    });

    PushNotifications.addListener("registrationError", (error) => {
      reject(new Error(error.error));
    });

    PushNotifications.register();
  });
}

export function onNativePushReceived(
  callback: (notification: { title?: string; body?: string; data?: Record<string, unknown> }) => void
) {
  PushNotifications.addListener("pushNotificationReceived", (notification) => {
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
    callback(action.notification.data);
  });
}
