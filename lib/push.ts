import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';

/**
 * Push notification setup for Noah.
 *
 * Convention (mirroring Theodore mobile): every payload that should
 * deeplink the user somewhere includes `data.path` — when the user
 * taps the notification we just `router.push(data.path)`.
 *
 * Example payload:
 *   { title: "Hans's daily words", body: "5 new ready",
 *     data: { path: "/child/abc123/flashcards" } }
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D4A847',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  try {
    const tokenResp = await Notifications.getExpoPushTokenAsync();
    return tokenResp.data;
  } catch {
    return null;
  }
}

let tapHandlerSubscription: Notifications.Subscription | null = null;

export function attachNotificationTapHandler() {
  if (tapHandlerSubscription) return;
  tapHandlerSubscription = Notifications.addNotificationResponseReceivedListener((resp) => {
    const path = (resp.notification.request.content.data as any)?.path;
    if (typeof path === 'string' && path.startsWith('/')) {
      router.push(path as any);
    }
  });
}

export function detachNotificationTapHandler() {
  tapHandlerSubscription?.remove();
  tapHandlerSubscription = null;
}
