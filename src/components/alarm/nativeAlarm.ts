import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const BASE_ID = 911000; // plage d'IDs réservée au réveil Chabbat

export function isNativeAlarmAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Planifie une vraie alarme système (iOS/Android) via LocalNotifications.
 * Fonctionne même si l'app est fermée ou l'écran verrouillé.
 * Programme N notifications espacées de 5 secondes pour simuler "N sonneries".
 */
export async function scheduleNativeAlarm(target: Date, rings: number): Promise<boolean> {
  if (!isNativeAlarmAvailable()) return false;

  try {
    // Demande la permission si nécessaire
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== "granted") return false;
    }

    // Annule d'éventuelles précédentes
    await cancelNativeAlarm();

    const notifications = Array.from({ length: rings }).map((_, i) => ({
      id: BASE_ID + i,
      title: "⏰ Réveil de Chabbat",
      body: i === 0 ? "Chabbat Chalom 🌅" : `Sonnerie ${i + 1}/${rings}`,
      schedule: { at: new Date(target.getTime() + i * 5000), allowWhileIdle: true },
      sound: undefined, // son système par défaut (respecte iOS)
      smallIcon: "ic_stat_icon_config_sample",
      autoCancel: true,
    }));

    await LocalNotifications.schedule({ notifications });
    return true;
  } catch (err) {
    console.error("[nativeAlarm] schedule failed:", err);
    return false;
  }
}

export async function cancelNativeAlarm(): Promise<void> {
  if (!isNativeAlarmAvailable()) return;
  try {
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter((n) => n.id >= BASE_ID && n.id < BASE_ID + 100);
    if (ours.length > 0) {
      await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
    }
  } catch (err) {
    console.error("[nativeAlarm] cancel failed:", err);
  }
}