import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Rec } from './store';

type ReminderRepeat = 'none' | 'daily' | 'weekly' | 'monthly';
function notificationId(taskId: string, reminderId: string) {
  const source = taskId + ':' + reminderId;
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) { hash ^= source.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0) % 2147483646 + 1;
}
export async function requestTaskReminderPermission(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const current = await LocalNotifications.checkPermissions();
      const permission = current.display === 'granted' ? current : await LocalNotifications.requestPermissions();
      return permission.display === 'granted';
    }
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') return (await Notification.requestPermission()) === 'granted';
    if (typeof window !== 'undefined' && (window as any).mealphaDesktop?.notify) return true;
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  } catch (error) { console.warn('Task reminder permission could not be checked:', error); return false; }
}
export async function syncNativeTaskReminders(tasks: Rec[], language: 'fa' | 'en') {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const pending = await LocalNotifications.getPending();
    const owned = pending.notifications.filter((item) => item.data?.source === 'mealpha-task');
    if (owned.length) await LocalNotifications.cancel({ notifications: owned.map((item) => ({ id: item.id })) });
    const now = Date.now();
    const notifications = tasks.filter((task) => task.status !== 'Done').flatMap((task) =>
      (Array.isArray(task.reminders) ? task.reminders : [])
        .filter((reminder: Rec) => reminder.enabled && reminder.at && new Date(reminder.at).getTime() > now)
        .map((reminder: Rec) => {
          const repeat = reminder.repeat as ReminderRepeat;
          const every = repeat === 'daily' ? 'day' : repeat === 'weekly' ? 'week' : repeat === 'monthly' ? 'month' : undefined;
          return {
            id: notificationId(task.id, reminder.id),
            title: language === 'fa' ? 'یادآور تسک' : 'Task reminder',
            body: String(task.title || (language === 'fa' ? 'تسک بدون عنوان' : 'Untitled task')).slice(0, 180),
            schedule: { at: new Date(reminder.at), ...(every ? { every } : {}) },
            allowWhileIdle: true, isExactNotification: true, autoCancel: true,
            data: { source: 'mealpha-task', taskId: task.id, reminderId: reminder.id },
          };
        }));
    if (notifications.length) await LocalNotifications.schedule({ notifications });
  } catch (error) { console.warn('Native task reminders could not be synchronized:', error); }
}
