import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const REMINDER_ID = 'daily-boutique-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('boutique-reminder', {
      name: 'Daily Reminder',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#226880',
    });
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<boolean> {
  const granted = await requestNotificationPermissions();
  if (!granted) return false;

  await setupNotificationChannel();

  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  } catch {}

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: 'Boutique Reminder',
      body: "Check today's pending orders and deliveries",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'boutique-reminder',
    },
  });

  return true;
}

export async function initReminder(reminderTime: string | undefined) {
  if (!reminderTime) return;
  await setupNotificationChannel();
  const [h, m] = reminderTime.split(':').map(Number);
  await scheduleDailyReminder(h, m);
}
